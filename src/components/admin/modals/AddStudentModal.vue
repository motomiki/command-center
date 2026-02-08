<script setup lang="ts">
import { ref } from 'vue';
import { useRepository } from '@/composables/useRepository';
import AiAvatarGenerator from '../AiAvatarGenerator.vue';
import { useToast } from '@/composables/useToast';
import type { Student } from '@/types/student';

defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved'): void;
}>();

const { addToast } = useToast();
const { students } = useRepository();

const name = ref('');
const avatarUrl = ref('');
const isSaving = ref(false);

const handleSave = async () => {
  if (!name.value) {
    addToast('名前を入力してください', undefined, 'error');
    return;
  }

  isSaving.value = true;
  try {
    const newStudent: Student = {
      id: `student-${Date.now()}`,
      name: name.value,
      avatarUrl: avatarUrl.value || undefined,
      typingHistory: [],
      projects: [],
    };
    await students.save(newStudent);
    addToast('生徒を追加しました', undefined, 'success');
    emit('saved');
    handleClose();
  } catch (error) {
    const message = error instanceof Error ? error.message : '保存に失敗しました';
    addToast('追加できませんでした', message, 'error');
  } finally {
    isSaving.value = false;
  }
};

const handleClose = () => {
  name.value = '';
  avatarUrl.value = '';
  emit('close');
};
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">✨ 新規生徒の追加</h3>
        <button class="close-btn" @click="handleClose">×</button>
      </div>

      <div class="modal-body">
        <!-- 基本情報 -->
        <div class="form-section">
          <label class="form-label">名前</label>
          <input
            v-model="name"
            type="text"
            placeholder="例：たなか たろう"
            class="form-input"
          />
        </div>

        <!-- アバター生成セクション -->
        <div class="form-section ai-section">
          <label class="form-label">アバター（AIで生成）</label>
          <AiAvatarGenerator
            v-model:avatarUrl="avatarUrl"
            :student-name="name"
          />
        </div>
      </div>

      <div class="modal-footer">
        <button @click="handleClose" class="cancel-btn">キャンセル</button>
        <button
          @click="handleSave"
          :disabled="isSaving || !name"
          class="save-btn"
        >
          {{ isSaving ? '保存中...' : '生徒を保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  animation: modal-in 0.3s ease-out;
}

@keyframes modal-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: bold;
  color: #1e293b;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #64748b;
  cursor: pointer;
  padding: 0.5rem;
  line-height: 1;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
}

.form-section {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #475569;
  margin-bottom: 0.5rem;
}

.form-input, .form-select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s;
}

.form-input:focus, .form-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.ai-section {
  background: #f8fafc;
  padding: 1rem;
  border-radius: 12px;
  border: 1px dashed #cbd5e1;
}

.ai-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.input-label {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 500;
}

.gender-selection {
  display: flex;
  gap: 1.5rem;
  padding: 0.5rem 0;
}

.gender-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #475569;
  cursor: pointer;
}

.gender-label input {
  cursor: pointer;
}

.generate-btn {
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
  color: white;
  border: none;
  padding: 0.75rem;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.generate-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.avatar-preview-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.preview-box {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-placeholder {
  color: #94a3b8;
  font-size: 0.75rem;
}

.preview-hint {
  font-size: 0.75rem;
  color: #64748b;
}

.modal-footer {
  padding: 1.5rem;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.cancel-btn {
  padding: 0.75rem 1.5rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #64748b;
  cursor: pointer;
}

.save-btn {
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: bold;
  cursor: pointer;
}

.save-btn:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.loader {
  width: 16px;
  height: 16px;
  border: 2px solid #FFF;
  border-bottom-color: transparent;
  border-radius: 50%;
  display: inline-block;
  animation: rotation 1s linear infinite;
}

@keyframes rotation {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
