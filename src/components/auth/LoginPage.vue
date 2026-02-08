<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

type TabKey = 'teacher' | 'student';

const activeTab = ref<TabKey>('teacher');
const router = useRouter();
const authStore = useAuthStore();

// 先生フォーム
const teacherEmail = ref('');
const teacherPassword = ref('');
const teacherPasswordVisible = ref(false);

// 生徒フォーム
const studentId = ref('');
const studentPassword = ref('');
const studentPasswordVisible = ref(false);

// バリデーション
const isTeacherFormValid = computed(
  () => teacherEmail.value.trim().length > 0 && teacherPassword.value.length > 0,
);
const isStudentFormValid = computed(
  () => studentId.value.trim().length > 0 && studentPassword.value.length > 0,
);

// タブ切り替え時にエラーをクリア
watch(activeTab, () => {
  authStore.clearError();
});

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

async function handleTeacherLogin(): Promise<void> {
  if (!isTeacherFormValid.value || authStore.loading) return;

  const success = await authStore.signInTeacher(
    teacherEmail.value.trim(),
    teacherPassword.value,
  );

  if (success) {
    await router.replace('/admin');
  }
}

async function handleStudentLogin(): Promise<void> {
  if (!isStudentFormValid.value || authStore.loading) return;

  const success = await authStore.signInStudent(
    studentId.value.trim(),
    studentPassword.value,
  );

  if (success) {
    // ログインした生徒の profile.id から studentId パラメータを導出
    const profileId = authStore.profile?.id;
    await router.replace(`/student/${profileId ?? ''}`);
  }
}
</script>

<template>
  <div class="login-page">
    <!-- 背景デコレーション -->
    <div class="login-bg-decoration">
      <div class="bg-circle bg-circle-1"></div>
      <div class="bg-circle bg-circle-2"></div>
      <div class="bg-circle bg-circle-3"></div>
    </div>

    <div class="login-container">
      <!-- ロゴ & タイトル -->
      <header class="login-header">
        <div class="login-logo">
          <span class="material-symbols-outlined filled logo-icon">school</span>
        </div>
        <h1 class="login-title">ほうかごキャンパスクラブ</h1>
        <p class="login-subtitle">ログインしてはじめよう!</p>
      </header>

      <!-- タブ切り替え -->
      <div class="tab-switcher">
        <button
          :class="['tab-btn', { active: activeTab === 'teacher' }]"
          @click="activeTab = 'teacher'"
        >
          <span class="material-symbols-outlined tab-icon">person</span>
          せんせい
        </button>
        <button
          :class="['tab-btn', { active: activeTab === 'student' }]"
          @click="activeTab = 'student'"
        >
          <span class="material-symbols-outlined tab-icon">face</span>
          せいと
        </button>
      </div>

      <!-- エラーメッセージ -->
      <Transition name="fade">
        <div v-if="authStore.error" class="error-banner">
          <span class="material-symbols-outlined error-icon">error</span>
          <span class="error-text">{{ authStore.error.message }}</span>
        </div>
      </Transition>

      <!-- 先生ログインフォーム -->
      <form
        v-if="activeTab === 'teacher'"
        class="login-form"
        @submit.prevent="handleTeacherLogin"
      >
        <div class="form-group">
          <label for="teacher-email" class="form-label">
            <span class="material-symbols-outlined label-icon">mail</span>
            メールアドレス
          </label>
          <input
            id="teacher-email"
            v-model="teacherEmail"
            type="email"
            class="form-input"
            placeholder="teacher@example.com"
            autocomplete="email"
            :disabled="authStore.loading"
          />
        </div>

        <div class="form-group">
          <label for="teacher-password" class="form-label">
            <span class="material-symbols-outlined label-icon">lock</span>
            パスワード
          </label>
          <div class="password-wrapper">
            <input
              id="teacher-password"
              v-model="teacherPassword"
              :type="teacherPasswordVisible ? 'text' : 'password'"
              class="form-input"
              placeholder="パスワードをにゅうりょく"
              autocomplete="current-password"
              :disabled="authStore.loading"
            />
            <button
              type="button"
              class="password-toggle"
              @click="teacherPasswordVisible = !teacherPasswordVisible"
              :aria-label="teacherPasswordVisible ? 'パスワードをかくす' : 'パスワードをみる'"
            >
              <span class="material-symbols-outlined">
                {{ teacherPasswordVisible ? 'visibility_off' : 'visibility' }}
              </span>
            </button>
          </div>
        </div>

        <button
          type="submit"
          class="submit-btn teacher-btn"
          :disabled="!isTeacherFormValid || authStore.loading"
        >
          <span v-if="authStore.loading" class="spinner"></span>
          <span v-else class="material-symbols-outlined btn-icon">login</span>
          {{ authStore.loading ? 'ログインちゅう...' : 'ログイン' }}
        </button>
      </form>

      <!-- 生徒ログインフォーム -->
      <form
        v-if="activeTab === 'student'"
        class="login-form"
        @submit.prevent="handleStudentLogin"
      >
        <div class="form-group">
          <label for="student-id" class="form-label">
            <span class="material-symbols-outlined label-icon">badge</span>
            せいとID
          </label>
          <input
            id="student-id"
            v-model="studentId"
            type="text"
            class="form-input"
            placeholder="student-1"
            autocomplete="username"
            :disabled="authStore.loading"
          />
          <p class="form-hint">せんせいからもらった ID をいれてね</p>
        </div>

        <div class="form-group">
          <label for="student-password" class="form-label">
            <span class="material-symbols-outlined label-icon">lock</span>
            パスワード
          </label>
          <div class="password-wrapper">
            <input
              id="student-password"
              v-model="studentPassword"
              :type="studentPasswordVisible ? 'text' : 'password'"
              class="form-input"
              placeholder="パスワードをにゅうりょく"
              autocomplete="current-password"
              :disabled="authStore.loading"
            />
            <button
              type="button"
              class="password-toggle"
              @click="studentPasswordVisible = !studentPasswordVisible"
              :aria-label="studentPasswordVisible ? 'パスワードをかくす' : 'パスワードをみる'"
            >
              <span class="material-symbols-outlined">
                {{ studentPasswordVisible ? 'visibility_off' : 'visibility' }}
              </span>
            </button>
          </div>
        </div>

        <button
          type="submit"
          class="submit-btn student-btn"
          :disabled="!isStudentFormValid || authStore.loading"
        >
          <span v-if="authStore.loading" class="spinner"></span>
          <span v-else class="material-symbols-outlined btn-icon">rocket_launch</span>
          {{ authStore.loading ? 'ログインちゅう...' : 'はじめる!' }}
        </button>
      </form>

      <!-- フッター -->
      <footer class="login-footer">
        <p>ほうかごキャンパスクラブ &copy; 2026</p>
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* =========================================================================
   Login Page – Full-screen, playful yet professional
   ========================================================================= */

.login-page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1rem;
  position: relative;
  overflow: hidden;
}

/* ---- Background decoration ---- */
.login-bg-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.bg-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.12;
  background: white;
}

.bg-circle-1 {
  width: 400px;
  height: 400px;
  top: -100px;
  right: -100px;
  animation: float 8s ease-in-out infinite;
}

.bg-circle-2 {
  width: 250px;
  height: 250px;
  bottom: -60px;
  left: -60px;
  animation: float 10s ease-in-out infinite reverse;
}

.bg-circle-3 {
  width: 150px;
  height: 150px;
  top: 40%;
  left: 10%;
  animation: float 12s ease-in-out infinite 2s;
}

@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-20px) scale(1.05); }
}

/* ---- Container ---- */
.login-container {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.3) inset;
  padding: 2.5rem 2rem 2rem;
  animation: slideUp 0.5s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ---- Header ---- */
.login-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.login-logo {
  width: 72px;
  height: 72px;
  margin: 0 auto 0.75rem;
  border-radius: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.35);
}

.logo-icon {
  font-size: 36px;
  color: white;
}

.login-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: #1e293b;
  margin: 0;
  letter-spacing: -0.02em;
}

.login-subtitle {
  font-size: 0.9rem;
  color: #64748b;
  margin: 0.25rem 0 0;
}

/* ---- Tab Switcher ---- */
.tab-switcher {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  background: #f1f5f9;
  border-radius: 14px;
  padding: 4px;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.6rem 0;
  border: none;
  border-radius: 11px;
  background: transparent;
  color: #64748b;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
}

.tab-btn:hover:not(.active) {
  color: #334155;
  background: rgba(255, 255, 255, 0.5);
}

.tab-btn.active {
  background: white;
  color: #667eea;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.tab-icon {
  font-size: 20px;
}

/* ---- Error Banner ---- */
.error-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
}

.error-icon {
  color: #ef4444;
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 1px;
}

.error-text {
  color: #991b1b;
  font-size: 0.85rem;
  line-height: 1.5;
}

/* ---- Form ---- */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #334155;
}

.label-icon {
  font-size: 18px;
  color: #667eea;
}

.form-input {
  width: 100%;
  padding: 0.7rem 0.9rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 0.95rem;
  color: #1e293b;
  background: #f8fafc;
  transition: all 0.2s ease;
  outline: none;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
}

.form-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-input::placeholder {
  color: #94a3b8;
}

.form-hint {
  font-size: 0.78rem;
  color: #94a3b8;
  margin: 0;
  padding-left: 0.25rem;
}

/* ---- Password field ---- */
.password-wrapper {
  position: relative;
}

.password-wrapper .form-input {
  padding-right: 2.8rem;
}

.password-toggle {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 8px;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
}

.password-toggle:hover {
  color: #667eea;
}

.password-toggle .material-symbols-outlined {
  font-size: 20px;
}

/* ---- Submit Button ---- */
.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.8rem;
  border: none;
  border-radius: 14px;
  font-size: 1rem;
  font-weight: 700;
  color: white;
  cursor: pointer;
  transition: all 0.25s ease;
  margin-top: 0.5rem;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.teacher-btn {
  background: linear-gradient(135deg, #667eea 0%, #5a6fd6 100%);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.35);
}

.teacher-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.45);
}

.teacher-btn:active:not(:disabled) {
  transform: translateY(0);
}

.student-btn {
  background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.35);
}

.student-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.45);
}

.student-btn:active:not(:disabled) {
  transform: translateY(0);
}

.btn-icon {
  font-size: 22px;
}

/* ---- Spinner ---- */
.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ---- Transitions ---- */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ---- Footer ---- */
.login-footer {
  text-align: center;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.login-footer p {
  font-size: 0.75rem;
  color: #94a3b8;
  margin: 0;
}

/* ---- Responsive ---- */
@media (max-width: 480px) {
  .login-container {
    padding: 2rem 1.25rem 1.5rem;
    border-radius: 20px;
  }

  .login-title {
    font-size: 1.2rem;
  }

  .login-logo {
    width: 60px;
    height: 60px;
  }

  .logo-icon {
    font-size: 30px;
  }
}
</style>
