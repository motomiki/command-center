<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useRepository } from '@/composables/useRepository';
import { resizeAvatarDataUrl } from '@/utils/avatarResize';
import TypingDataForm from './forms/TypingDataForm.vue';
import MinecraftDataForm from './forms/MinecraftDataForm.vue';
import CardGenerationForm from './forms/CardGenerationForm.vue';
import AiAvatarGenerator from './AiAvatarGenerator.vue';
import { useToast } from '@/composables/useToast';
import type { Student } from '@/types/student';

const router = useRouter();
const route = useRoute();

const { addToast } = useToast();
const { students: studentsRepo } = useRepository();

const studentId = computed(() => route.params.studentId as string);

// ---------------------------------------------------------------------------
// データ取得（非同期）
// ---------------------------------------------------------------------------
const student = ref<Student | null>(null);

const fetchStudent = async () => {
  student.value = await studentsRepo.getById(studentId.value);
};

onMounted(fetchStudent);
watch(studentId, fetchStudent);

const isEditingIcon = ref(false);
const newAvatarUrl = ref('');
const isSaving = ref(false);

type TabType = 'typing' | 'minecraft' | 'card';
const activeTab = ref<TabType>('typing');

const handleBack = () => {
  router.push('/admin');
};

const handleUpdateIcon = async () => {
  if (!newAvatarUrl.value || !student.value) return;
  isSaving.value = true;
  try {
    const urlToSave = await resizeAvatarDataUrl(newAvatarUrl.value);
    student.value.avatarUrl = urlToSave;
    await studentsRepo.save(student.value);
    addToast('アイコンを更新しました', undefined, 'success');
    isEditingIcon.value = false;
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新に失敗しました';
    addToast('更新に失敗しました', message, 'error');
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <div class="student-detail-container">
    <!-- ローディング -->
    <div v-if="!student" class="loading-container">
      <p>読み込み中...</p>
    </div>

    <template v-else>
    <!-- ヘッダー -->
    <div class="detail-header">
      <button @click="handleBack" class="back-button" aria-label="生徒一覧に戻る">
        ← 戻る
      </button>
      <div class="student-header-info">
        <div class="avatar-section">
          <div class="student-avatar-large">
            <img
              v-if="student.avatarUrl"
              :src="student.avatarUrl"
              :alt="`${student.name}のアバター`"
              class="avatar-image"
              loading="lazy"
            />
            <div v-else class="avatar-placeholder">
              {{ student.name.charAt(0) }}
            </div>
          </div>
          <button @click="isEditingIcon = !isEditingIcon" class="edit-avatar-btn">
            {{ isEditingIcon ? 'キャンセル' : '📷 アイコン変更' }}
          </button>
        </div>
        <div class="student-header-text">
          <h2 class="student-name-large">{{ student.name }}</h2>
          <p class="student-id">ID: {{ student.id }}</p>
        </div>
      </div>

      <!-- アイコン編集エリア -->
      <Transition name="expand">
        <div v-if="isEditingIcon" class="icon-edit-panel">
          <AiAvatarGenerator
            v-model:avatarUrl="newAvatarUrl"
            :initial-avatar-url="student.avatarUrl"
            :student-name="student.name"
          />
          <div class="edit-actions">
            <button @click="handleUpdateIcon" :disabled="!newAvatarUrl || isSaving" class="save-icon-btn">
              {{ isSaving ? '保存中...' : 'このアイコンを保存する' }}
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <!-- タブナビゲーション -->
    <div class="tabs-container">
      <button
        @click="activeTab = 'typing'"
        :class="['tab-button', { active: activeTab === 'typing' }]"
        aria-label="タイピングデータ入力タブ"
      >
        ⌨️ タイピングデータ
      </button>
      <button
        @click="activeTab = 'minecraft'"
        :class="['tab-button', { active: activeTab === 'minecraft' }]"
        aria-label="Minecraft 作品の登録タブ"
      >
        🎮 Minecraft 作品
      </button>
      <button
        @click="activeTab = 'card'"
        :class="['tab-button', { active: activeTab === 'card' }]"
        aria-label="カード生成タブ"
      >
        🎴 カード生成
      </button>
    </div>

    <!-- タブコンテンツ -->
    <div class="tab-content">
      <Transition name="tab-fade" mode="out-in">
        <div v-if="activeTab === 'typing'" key="typing" class="tab-panel">
          <TypingDataForm :student-id="studentId" />
        </div>
        <div v-else-if="activeTab === 'minecraft'" key="minecraft" class="tab-panel">
          <MinecraftDataForm :student-id="studentId" />
        </div>
        <div v-else-if="activeTab === 'card'" key="card" class="tab-panel">
          <CardGenerationForm :student-id="studentId" />
        </div>
      </Transition>
    </div>
    </template>
  </div>
</template>

<style scoped>
.student-detail-container {
  width: 100%;
}

.detail-header {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.back-button {
  padding: 0.75rem 1.25rem;
  min-height: 44px;
  min-width: 80px;
  background: #e2e8f0;
  color: #475569;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 1.5rem;
}

@media (hover: hover) and (pointer: fine) {
  .back-button:hover {
    background: #cbd5e1;
    transform: translateX(-2px);
  }
}

.student-header-info {
  display: flex;
  align-items: flex-start;
  gap: 2rem;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.student-avatar-large {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.edit-avatar-btn {
  padding: 0.5rem 1rem;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-avatar-btn:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.icon-edit-panel {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
  animation: slideDown 0.3s ease-out;
}

.edit-actions {
  display: flex;
  justify-content: center;
  margin-top: 1.5rem;
}

.save-icon-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.save-icon-btn:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
}

.save-icon-btn:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.expand-enter-active, .expand-leave-active {
  transition: all 0.3s ease;
}
.expand-enter-from, .expand-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 2.5rem;
  font-weight: bold;
}

.student-header-text {
  flex: 1;
}

.student-name-large {
  font-size: 1.5rem;
  font-weight: bold;
  color: #1e3a8a;
  margin: 0 0 0.5rem 0;
}

@media (min-width: 640px) {
  .student-name-large {
    font-size: 1.75rem;
  }
}

@media (min-width: 1024px) {
  .student-name-large {
    font-size: 2rem;
  }
}

.student-id {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
}

.tabs-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 2rem;
  background: rgba(255, 255, 255, 0.95);
  padding: 0.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

@media (min-width: 640px) {
  .tabs-container {
    flex-direction: row;
  }
}

.tab-button {
  flex: 1;
  padding: 0.875rem 1.5rem;
  min-height: 44px;
  background: transparent;
  border: 2px solid transparent;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s ease;
}

@media (hover: hover) and (pointer: fine) {
  .tab-button:hover {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
  }
}

.tab-button.active {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border-color: #3b82f6;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.tab-content {
  min-height: 400px;
}

.tab-panel {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tab-fade-enter-active,
.tab-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.tab-fade-enter-from,
.tab-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* レスポンシブ対応 */
@media (max-width: 767.98px) {
  .detail-header {
    padding: 1.5rem;
  }

  .student-header-info {
    flex-direction: column;
    text-align: center;
  }

  .student-name-large {
    font-size: 1.5rem;
  }

  .tabs-container {
    flex-direction: column;
  }

  .tab-button {
    width: 100%;
  }
}
</style>

