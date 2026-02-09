import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

// ---------------------------------------------------------------------------
// Lazy-loaded コンポーネント
// ---------------------------------------------------------------------------

const LoginPage = () => import('@/components/auth/LoginPage.vue');
const StudentDashboard = () => import('@/components/StudentDashboard.vue');
const AdminLayout = () => import('@/components/admin/AdminLayout.vue');
const StudentList = () => import('@/components/admin/StudentList.vue');
const StudentDetail = () => import('@/components/admin/StudentDetail.vue');
const SupabaseTestPage = () => import('@/components/admin/SupabaseTestPage.vue');

// ---------------------------------------------------------------------------
// ルート定義
// ---------------------------------------------------------------------------

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/login',
  },
  {
    path: '/login',
    name: 'login',
    component: LoginPage,
    meta: { requiresAuth: false },
  },
  {
    path: '/student/:studentId?',
    name: 'student',
    component: StudentDashboard,
    props: (route) => ({
      studentId: route.params.studentId || '',
    }),
    meta: { requiresAuth: true, requiredRole: 'student' },
  },
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true, requiredRole: 'teacher' },
    children: [
      {
        path: '',
        name: 'admin',
        component: StudentList,
      },
      {
        path: 'students/:studentId',
        name: 'admin-student-detail',
        component: StudentDetail,
        props: true,
      },
      {
        path: 'supabase-test',
        name: 'admin-supabase-test',
        component: SupabaseTestPage,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// ルーター生成
// ---------------------------------------------------------------------------

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// ---------------------------------------------------------------------------
// ナビゲーションガード
// ---------------------------------------------------------------------------

router.beforeEach(async (to) => {
  const authStore = useAuthStore();

  // 初期化がまだの場合は待機（セッション復元を待つ）
  if (!authStore.initialized) {
    await authStore.initialize();
  }

  const requiresAuth = to.matched.some((r) => r.meta.requiresAuth !== false);
  const requiredRole = to.matched.find((r) => r.meta.requiredRole)?.meta
    .requiredRole as string | undefined;

  // ---- 1. ログインページへのアクセス ----
  if (to.name === 'login') {
    // 既に認証済みならロールに応じてリダイレクト
    if (authStore.isAuthenticated) {
      if (authStore.isTeacher) return '/admin';
      if (authStore.isStudent)
        return `/student/${authStore.profile?.login_id ?? authStore.profile?.id ?? ''}`;
    }
    return; // 未認証ならログインページを表示
  }

  // ---- 2. 認証必須ルートに未認証でアクセス ----
  if (requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login' };
  }

  // ---- 3. ロールチェック ----
  if (requiredRole && authStore.userRole !== requiredRole) {
    // ロールが異なる場合、正しいページへリダイレクト
    if (authStore.isTeacher) return '/admin';
    if (authStore.isStudent)
      return `/student/${authStore.profile?.login_id ?? authStore.profile?.id ?? ''}`;
    return { name: 'login' };
  }

  // ---- 4. 生徒ルート: 自分のページ以外なら自分の login_id URL へリダイレクト ----
  if (to.name === 'student' && to.params.studentId && authStore.isStudent) {
    const myId =
      authStore.profile?.login_id ?? authStore.profile?.id ?? '';
    if (myId && to.params.studentId !== myId) {
      return `/student/${myId}`;
    }
  }
});

export default router;

