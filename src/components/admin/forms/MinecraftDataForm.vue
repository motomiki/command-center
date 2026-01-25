<script setup lang="ts">
import { ref } from 'vue';
import FileUploader from '../FileUploader.vue';
import { addMinecraftProject } from '@/utils/mockDataHelpers';
import type { MinecraftProject } from '@/types/student';

interface Props {
  studentId: string;
}

const props = defineProps<Props>();

const formData = ref({
  title: '',
  description: '',
  createdAt: new Date().toISOString().split('T')[0],
  modelUrl: '',
  screenshotUrl: '',
  makeCodeUrl: '',
});

const modelFile = ref<File | null>(null);
const screenshotFile = ref<File | null>(null);
const modelPreviewUrl = ref<string | null>(null);
const screenshotPreviewUrl = ref<string | null>(null);

const isSubmitting = ref(false);
const submitSuccess = ref(false);
const submitError = ref<string | null>(null);

const validateForm = (): string | null => {
  if (!formData.value.title.trim()) {
    return '作品名を入力してください';
  }
  if (!formData.value.createdAt) {
    return '作成日を入力してください';
  }
  return null;
};

const handleModelFileSelected = (file: File) => {
  modelFile.value = file;
  modelPreviewUrl.value = URL.createObjectURL(file);
  // 簡易版では、実際のアップロードは行わず、Blob URLを保存
  formData.value.modelUrl = modelPreviewUrl.value;
};

const handleModelFileRemoved = () => {
  if (modelPreviewUrl.value) {
    URL.revokeObjectURL(modelPreviewUrl.value);
  }
  modelFile.value = null;
  modelPreviewUrl.value = null;
  formData.value.modelUrl = '';
};

const handleScreenshotFileSelected = (file: File) => {
  screenshotFile.value = file;
  screenshotPreviewUrl.value = URL.createObjectURL(file);
  formData.value.screenshotUrl = screenshotPreviewUrl.value;
};

const handleScreenshotFileRemoved = () => {
  if (screenshotPreviewUrl.value) {
    URL.revokeObjectURL(screenshotPreviewUrl.value);
  }
  screenshotFile.value = null;
  screenshotPreviewUrl.value = null;
  formData.value.screenshotUrl = '';
};

const handleSubmit = async () => {
  submitError.value = null;
  submitSuccess.value = false;

  const validationError = validateForm();
  if (validationError) {
    submitError.value = validationError;
    return;
  }

  isSubmitting.value = true;

  try {
    const newProject: MinecraftProject = {
      id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: formData.value.title.trim(),
      description: formData.value.description.trim(),
      createdAt: formData.value.createdAt,
      modelUrl: formData.value.modelUrl || undefined,
      screenshotUrl: formData.value.screenshotUrl || undefined,
      makeCodeUrl: formData.value.makeCodeUrl.trim() || undefined,
    };

    addMinecraftProject(props.studentId, newProject);

    submitSuccess.value = true;
    formData.value = {
      title: '',
      description: '',
      createdAt: new Date().toISOString().split('T')[0],
      modelUrl: '',
      screenshotUrl: '',
      makeCodeUrl: '',
    };
    handleModelFileRemoved();
    handleScreenshotFileRemoved();

    setTimeout(() => {
      submitSuccess.value = false;
    }, 3000);
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : 'データの保存に失敗しました';
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="minecraft-form-container">
    <div class="form-card">
      <h3 class="form-title">🎮 Minecraft成果物登録</h3>
      <p class="form-description">生徒のMinecraft作品を登録してください</p>

      <form @submit.prevent="handleSubmit" class="form">
        <div class="form-group">
          <label for="minecraft-title" class="form-label">作品名</label>
          <input
            id="minecraft-title"
            v-model="formData.title"
            type="text"
            class="form-input"
            placeholder="例: むらさきのせかい"
            required
            aria-required="true"
            aria-describedby="minecraft-title-help"
          />
          <p id="minecraft-title-help" class="form-help">作品の名前を入力してください（小学生向けの平易な日本語）</p>
        </div>

        <div class="form-group">
          <label for="minecraft-description" class="form-label">説明</label>
          <textarea
            id="minecraft-description"
            v-model="formData.description"
            class="form-textarea"
            rows="4"
            placeholder="例: とってもすごい作品ができました！たくさんのブロックをつかってつくりました。"
            aria-describedby="minecraft-description-help"
          ></textarea>
          <p id="minecraft-description-help" class="form-help">作品の説明を入力してください（任意）</p>
        </div>

        <div class="form-group">
          <label for="minecraft-date" class="form-label">作成日</label>
          <input
            id="minecraft-date"
            v-model="formData.createdAt"
            type="date"
            class="form-input"
            required
            aria-required="true"
            aria-describedby="minecraft-date-help"
          />
          <p id="minecraft-date-help" class="form-help">作品を作成した日付を選択してください</p>
        </div>

        <div class="form-group">
          <label class="form-label">3Dモデル (.glbファイル)</label>
          <FileUploader
            accept=".glb,model/gltf-binary"
            :max-size-m-b="50"
            label=""
            @file-selected="handleModelFileSelected"
            @file-removed="handleModelFileRemoved"
          />
          <p class="form-help">Minecraftの3Dモデルファイルをアップロードしてください（任意）</p>
        </div>

        <div class="form-group">
          <label class="form-label">スクリーンショット</label>
          <FileUploader
            accept="image/*"
            :max-size-m-b="10"
            label=""
            @file-selected="handleScreenshotFileSelected"
            @file-removed="handleScreenshotFileRemoved"
          />
          <p class="form-help">作品のスクリーンショットをアップロードしてください（任意）</p>
        </div>

        <div class="form-group">
          <label for="minecraft-makecode" class="form-label">MakeCode URL</label>
          <input
            id="minecraft-makecode"
            v-model="formData.makeCodeUrl"
            type="url"
            class="form-input"
            placeholder="https://minecraft.makecode.com/?lang=ja#"
            aria-describedby="minecraft-makecode-help"
          />
          <p id="minecraft-makecode-help" class="form-help">MakeCodeの共有URLを入力してください（任意）</p>
        </div>

        <div v-if="submitError" class="error-message" role="alert">
          ⚠️ {{ submitError }}
        </div>

        <div v-if="submitSuccess" class="success-message" role="alert">
          ✅ データが正常に保存されました！
        </div>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="submit-button"
          :class="{ submitting: isSubmitting }"
        >
          <span v-if="!isSubmitting">保存</span>
          <span v-else>保存中...</span>
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.minecraft-form-container {
  width: 100%;
}

.form-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.form-title {
  font-size: 1.5rem;
  font-weight: bold;
  color: #1e3a8a;
  margin: 0 0 0.5rem 0;
}

.form-description {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0 0 1.5rem 0;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e3a8a;
}

.form-input {
  padding: 0.875rem;
  min-height: 44px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: white;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  padding: 0.875rem;
  min-height: 88px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
  transition: all 0.3s ease;
  background: white;
}

.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-help {
  font-size: 0.75rem;
  color: #94a3b8;
  margin: 0;
}

.error-message {
  padding: 1rem;
  background: #fee2e2;
  border: 2px solid #fca5a5;
  border-radius: 8px;
  color: #991b1b;
  font-size: 0.875rem;
}

.success-message {
  padding: 1rem;
  background: #d1fae5;
  border: 2px solid #6ee7b7;
  border-radius: 8px;
  color: #065f46;
  font-size: 0.875rem;
}

.submit-button {
  padding: 1rem 2rem;
  min-height: 44px;
  min-width: 120px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

@media (hover: hover) and (pointer: fine) {
  .submit-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(59, 130, 246, 0.4);
  }
}

.submit-button:active:not(:disabled) {
  transform: translateY(0);
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* レスポンシブ対応 */
@media (max-width: 767.98px) {
  .form-card {
    padding: 1.5rem;
  }
}
</style>

