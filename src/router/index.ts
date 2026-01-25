import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

// 子ども用ダッシュボード
const StudentDashboard = () => import('@/components/StudentDashboard.vue');

// 管理画面コンポーネント（後で作成）
const AdminLayout = () => import('@/components/admin/AdminLayout.vue');
const StudentList = () => import('@/components/admin/StudentList.vue');
const StudentDetail = () => import('@/components/admin/StudentDetail.vue');

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/student/student-1',
  },
  {
    path: '/student/:studentId?',
    name: 'student',
    component: StudentDashboard,
    props: (route) => ({
      studentId: route.params.studentId || 'student-1',
    }),
  },
  {
    path: '/admin',
    component: AdminLayout,
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
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;

