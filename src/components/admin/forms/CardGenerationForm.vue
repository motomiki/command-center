<script setup lang="ts">
import { ref } from 'vue';
import FileUploader from '../FileUploader.vue';
import { createCard } from '@/utils/mockDataHelpers';
import { getRarityDisplayName } from '@/utils/rarity';
import type { Rarity } from '@/types/card';

interface Props {
  studentId: string;
}

const props = defineProps<Props>();

const formData = ref({
  date: new Date().toISOString().split('T')[0],
  title: '',
  description: '',
  rarity: 'C' as Rarity,
  imageUrl: '',
});

const imageFile = ref<File | null>(null);
const imagePreviewUrl = ref<string | null>(null);

const isSubmitting = ref(false);
const submitSuccess = ref(false);
const submitError = ref<string | null>(null);

const rarities: Rarity[] = ['C', 'U', 'R', 'RR', 'SR', 'UR'];

const validateForm = (): string | null => {
  if (!formData.value.date) {
    return '日付を入力してください';
  }
  if (!formData.value.title.trim()) {
    return 'カード名を入力してください';
  }
  if (!formData.value.imageUrl) {
    return '画像をアップロードしてください';
  }
  return null;
};

const handleImageFileSelected = (file: File) => {
  imageFile.value = file;
  imagePreviewUrl.value = URL.createObjectURL(file);
  formData.value.imageUrl = imagePreviewUrl.value;
};

const handleImageFileRemoved = () => {
  if (imagePreviewUrl.value) {
    URL.revokeObjectURL(imagePreviewUrl.value);
  }
  imageFile.value = null;
  imagePreviewUrl.value = null;
  formData.value.imageUrl = '';
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
    createCard({
      studentId: props.studentId,
      date: formData.value.date,
      title: formData.value.title.trim(),
      description: formData.value.description.trim(),
      imageUrl: formData.value.imageUrl,
      rarity: formData.value.rarity,
      isOpened: false,
      typingStats: undefined,
      minecraftData: undefined,
    });

    submitSuccess.value = true;
    formData.value = {
      date: new Date().toISOString().split('T')[0],
      title: '',
      description: '',
      rarity: 'C',
      imageUrl: '',
    };
    handleImageFileRemoved();

    setTimeout(() => {
      submitSuccess.value = false;
    }, 3000);
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : 'カードの生成に失敗しました';
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="card-form-container">
    <div class="form-card">
      <h3 class="form-title">🎴 カード生成</h3>
      <p class="form-description">生徒の成果をカードとして生成します。生成されたカードはガチャで開封できます。</p>

      <form @submit.prevent="handleSubmit" class="form">
        <div class="form-group">
          <label for="card-date" class="form-label">日付</label>
          <input
            id="card-date"
            v-model="formData.date"
            type="date"
            class="form-input"
            required
            aria-required="true"
            aria-describedby="card-date-help"
          />
          <p id="card-date-help" class="form-help">カードに関連する活動の日付を選択してください</p>
        </div>

        <div class="form-group">
          <label for="card-title" class="form-label">カード名</label>
          <input
            id="card-title"
            v-model="formData.title"
            type="text"
            class="form-input"
            placeholder="例: 天空の城"
            required
            aria-required="true"
            aria-describedby="card-title-help"
          />
          <p id="card-title-help" class="form-help">カードの名前を入力してください（小学生向けの平易な日本語）</p>
        </div>

        <div class="form-group">
          <label for="card-description" class="form-label">コメント</label>
          <textarea
            id="card-description"
            v-model="formData.description"
            class="form-textarea"
            rows="4"
            placeholder="例: とってもすごい作品ができました！たくさんのブロックをつかってつくりました。"
            aria-describedby="card-description-help"
          ></textarea>
          <p id="card-description-help" class="form-help">先生からのコメントを入力してください（任意）</p>
        </div>

        <div class="form-group">
          <label for="card-rarity" class="form-label">レアリティ</label>
          <div class="rarity-selector">
            <button
              v-for="rarity in rarities"
              :key="rarity"
              type="button"
              @click="formData.rarity = rarity"
              :class="['rarity-button', { active: formData.rarity === rarity }]"
              :aria-label="`${getRarityDisplayName(rarity)}を選択`"
            >
              {{ rarity }}
              <span class="rarity-label">{{ getRarityDisplayName(rarity) }}</span>
            </button>
          </div>
          <p class="form-help">カードのレアリティを選択してください</p>
        </div>

        <div class="form-group">
          <label class="form-label">カード画像</label>
          <FileUploader
            accept="image/*"
            :max-size-m-b="10"
            label=""
            @file-selected="handleImageFileSelected"
            @file-removed="handleImageFileRemoved"
          />
          <p class="form-help">カードに使用する画像をアップロードしてください（必須）</p>
        </div>

        <div v-if="imagePreviewUrl" class="card-preview">
          <h4 class="preview-title">プレビュー</h4>
          <div class="preview-card">
            <img :src="imagePreviewUrl" alt="カードプレビュー" class="preview-image" loading="lazy" />
            <div class="preview-info">
              <p class="preview-name">{{ formData.title || 'カード名' }}</p>
              <p class="preview-rarity">{{ getRarityDisplayName(formData.rarity) }}</p>
            </div>
          </div>
        </div>

        <div v-if="submitError" class="error-message" role="alert">
          ⚠️ {{ submitError }}
        </div>

        <div v-if="submitSuccess" class="success-message" role="alert">
          ✅ カードが正常に生成されました！生徒がガチャで開封できるようになりました。
        </div>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="submit-button"
          :class="{ submitting: isSubmitting }"
        >
          <span v-if="!isSubmitting">カードを生成</span>
          <span v-else>生成中...</span>
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.card-form-container {
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
  padding: 0.75rem;
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

.rarity-selector {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

@media (min-width: 640px) {
  .rarity-selector {
    grid-template-columns: repeat(3, 1fr);
  }
}

.rarity-button {
  padding: 1rem;
  min-height: 44px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  font-size: 1.25rem;
  font-weight: bold;
  color: #64748b;
}

@media (hover: hover) and (pointer: fine) {
  .rarity-button:hover {
    border-color: #3b82f6;
    background: #eff6ff;
    transform: translateY(-2px);
  }
}

.rarity-button.active {
  border-color: #3b82f6;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
}

.rarity-label {
  font-size: 0.75rem;
  font-weight: normal;
  opacity: 0.9;
}

.card-preview {
  padding: 1.5rem;
  background: #f8fafc;
  border-radius: 12px;
  border: 2px solid #e2e8f0;
}

.preview-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1e3a8a;
  margin: 0 0 1rem 0;
}

.preview-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.preview-image {
  width: 150px;
  height: 225px;
  object-fit: cover;
  border-radius: 12px;
  border: 2px solid #e2e8f0;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

@media (min-width: 640px) {
  .preview-image {
    width: 175px;
    height: 262px;
  }
}

@media (min-width: 1024px) {
  .preview-image {
    width: 200px;
    height: 300px;
  }
}

.preview-info {
  text-align: center;
}

.preview-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e3a8a;
  margin: 0 0 0.25rem 0;
}

.preview-rarity {
  font-size: 0.875rem;
  color: #64748b;
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

  .rarity-selector {
    grid-template-columns: repeat(2, 1fr);
  }

  .preview-image {
    width: 150px;
    height: 225px;
  }
}
</style>

