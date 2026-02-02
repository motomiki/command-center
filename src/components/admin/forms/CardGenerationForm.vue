<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import DropZone from '@/components/common/DropZone.vue';
import SsrCard from '@/components/SsrCard.vue';
import { createCard } from '@/utils/mockDataHelpers';
import { saveAsset, getAssetUrl } from '@/utils/assetStore';
import { useToast } from '@/composables/useToast';
import { generateCardImage } from '@/services/CardGeneratorService';
import type { AIModelType } from '@/services/aiService';
import type { Rarity, CardData } from '@/types/card';

interface Props {
  studentId: string;
}

const props = defineProps<Props>();
const { addToast } = useToast();

const DRAFT_KEY = 'card_form_draft';
const STORAGE_KEY_API_KEY = 'campusclub_gemini_api_key';

const formData = ref({
  date: new Date().toISOString().split('T')[0],
  title: '',
  description: '',
  rarity: 'C' as Rarity,
  imageAssetId: '', // IDB Key
});

const imageFile = ref<File | null>(null);
const imagePreviewUrl = ref<string | null>(null);

const isSubmitting = ref(false);
const isGeneratingImage = ref(false);

type StepType = 'form' | 'confirm';
const step = ref<StepType>('form');

// AI生成用
const apiKey = ref('');
const modelType = ref<AIModelType>('flash');
const aiPrompt = ref('');

const rarities: Rarity[] = ['C', 'U', 'R', 'RR', 'SR', 'UR'];
const modelOptions: { value: AIModelType; label: string }[] = [
  { value: 'flash', label: 'Gemini 2.5 Flash Image (Dev)' },
  { value: 'pro', label: 'Gemini 3 Pro Image (Prod)' },
];

// Draft Saving
watch(formData, (newVal) => {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(newVal));
}, { deep: true });

onMounted(async () => {
  const savedKey = localStorage.getItem(STORAGE_KEY_API_KEY);
  if (savedKey) apiKey.value = savedKey;

  const savedDraft = localStorage.getItem(DRAFT_KEY);
  if (savedDraft) {
    try {
      const parsed = JSON.parse(savedDraft);
      formData.value = {
        ...formData.value,
        ...parsed,
      };
      
      if (formData.value.imageAssetId) {
        imagePreviewUrl.value = await getAssetUrl(formData.value.imageAssetId) || null;
      }
      addToast('下書きを復元しました', '前回の入力内容を復元しました。', 'info', 3000);
    } catch (e) {
      console.error('Draft restore failed', e);
    }
  }
});

const handleGenerateImage = async () => {
  if (!apiKey.value.trim()) {
    addToast('APIキーを入力してください', 'Gemini API Key を入力してから画像を生成できます。', 'warning');
    return;
  }
  if (!formData.value.title.trim() && !aiPrompt.value.trim()) {
    addToast('カード名またはプロンプトを入力してください', 'AIで画像を生成するにはどちらかが必要です。', 'warning');
    return;
  }
  isGeneratingImage.value = true;
  try {
    localStorage.setItem(STORAGE_KEY_API_KEY, apiKey.value);
    const blob = await generateCardImage({
      apiKey: apiKey.value,
      prompt: aiPrompt.value.trim() || formData.value.title.trim(),
      modelType: modelType.value,
      title: formData.value.title.trim() || 'カード',
      description: formData.value.description,
      rarity: formData.value.rarity,
    });
    const assetId = await saveAsset(blob);
    formData.value.imageAssetId = assetId;
    imagePreviewUrl.value = URL.createObjectURL(blob);
    imageFile.value = null;
    addToast('画像を生成しました', 'AIでカード画像を生成しました。', 'success');
  } catch (err) {
    const message = err instanceof Error ? err.message : '画像の生成に失敗しました。';
    const isQuotaError = err != null && typeof err === 'object' && 'retryAfterSeconds' in err;
    addToast(
      'AI生成に失敗しました',
      message,
      'error',
      isQuotaError ? 10000 : undefined
    );
  } finally {
    isGeneratingImage.value = false;
  }
};

const validateForm = (): string | null => {
  if (!formData.value.date) {
    return '日付を入力してください';
  }
  if (!formData.value.title.trim()) {
    return 'カード名を入力してください';
  }
  if (!formData.value.imageAssetId && !imageFile.value) {
     // Check both because assetId might be loaded from draft without file object
     if (!formData.value.imageAssetId) return '画像をアップロードしてください';
  }
  return null;
};

const handleImageFilesDropped = async (files: File[]) => {
  if (files.length === 0) return;
  const file = files[0];
  imageFile.value = file;
  imagePreviewUrl.value = URL.createObjectURL(file);
  
  try {
    const assetId = await saveAsset(file);
    formData.value.imageAssetId = assetId;
    addToast('画像読み込み完了', file.name, 'success', 2000);
  } catch (e) {
    addToast('保存エラー', '画像の一時保存に失敗しました', 'error');
  }
};

const handleError = (msg: string) => {
  addToast('エラー', msg, 'error');
};

const previewCardData = computed((): CardData => {
  return {
    id: 'preview',
    studentId: props.studentId,
    date: formData.value.date,
    title: formData.value.title || 'カード名',
    description: formData.value.description,
    rarity: formData.value.rarity,
    imageUrl: imagePreviewUrl.value || '',
    isOpened: true,
    type: 'typing',
  };
});

const handleReview = () => {
  const validationError = validateForm();
  if (validationError) {
    addToast('入力エラー', validationError, 'warning');
    return;
  }
  step.value = 'confirm';
};

const handleBackToEdit = () => {
  step.value = 'form';
};

const handleFinalSubmit = async () => {
  const validationError = validateForm();
  if (validationError) {
    addToast('入力エラー', validationError, 'warning');
    return;
  }

  isSubmitting.value = true;

  try {
    await createCard({
      studentId: props.studentId,
      date: formData.value.date,
      title: formData.value.title.trim(),
      description: formData.value.description.trim(),
      imageUrl: `idb://${formData.value.imageAssetId}`,
      rarity: formData.value.rarity,
      isOpened: false,
      type: 'typing',
      typingStats: undefined,
      minecraftData: undefined,
    });

    addToast('カード生成完了', 'ガチャに追加されました！', 'success');

    step.value = 'form';
    formData.value = {
      date: new Date().toISOString().split('T')[0],
      title: '',
      description: '',
      rarity: 'C',
      imageAssetId: '',
    };
    imageFile.value = null;
    imagePreviewUrl.value = null;

    localStorage.removeItem(DRAFT_KEY);
  } catch (error) {
    addToast('生成失敗', error instanceof Error ? error.message : 'カードの生成に失敗しました', 'error');
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="card-form-container">
    <div class="form-card">
      <div class="form-header">
        <div>
          <h3 class="form-title">🎴 カード生成</h3>
          <p class="form-description">生徒の成果をカードとして生成します。</p>
        </div>
      </div>

      <!-- Form View -->
      <div v-if="step === 'form'" class="content-split">
        <form @submit.prevent="handleReview" class="form-left">
           <div class="form-group">
            <label for="card-date" class="form-label">日付 <span class="required">*</span></label>
            <input
              id="card-date"
              v-model="formData.date"
              type="date"
              class="form-input"
              required
            />
          </div>

          <div class="form-group">
            <label for="card-title" class="form-label">カード名 <span class="required">*</span></label>
            <input
              id="card-title"
              v-model="formData.title"
              type="text"
              class="form-input"
              placeholder="例: 天空の城"
              required
            />
          </div>

          <!-- AI生成用: API Key / モデル / プロンプト -->
          <div class="ai-section">
            <h4 class="ai-section-title">🤖 AIで画像を生成</h4>
            <div class="form-group">
              <label for="gemini-api-key" class="form-label">Gemini API Key</label>
              <input
                id="gemini-api-key"
                v-model="apiKey"
                type="password"
                class="form-input"
                placeholder="Google AI Studioで取得したキー"
                autocomplete="off"
              />
            </div>
            <div class="form-group">
              <label for="ai-model" class="form-label">AIモデル</label>
              <select id="ai-model" v-model="modelType" class="form-select">
                <option
                  v-for="opt in modelOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label for="ai-prompt" class="form-label">プロンプト（任意・カード名で代用可）</label>
              <input
                id="ai-prompt"
                v-model="aiPrompt"
                type="text"
                class="form-input"
                placeholder="例: 炎に包まれた剣が光るファンタジー"
              />
            </div>
            <button
              type="button"
              :disabled="isGeneratingImage"
              class="ai-generate-btn"
              @click="handleGenerateImage"
            >
              <span v-if="isGeneratingImage" class="loader"></span>
              {{ isGeneratingImage ? '生成中...' : '🎨 AIで画像を生成' }}
            </button>
          </div>
          
           <div class="form-group">
              <label class="form-label">カード画像 <span class="required">*</span></label>
              <DropZone
                accept="image/*"
                :max-size-m-b="10"
                @files-dropped="handleImageFilesDropped"
                @error="handleError"
                class="compact-dropzone"
              >
                 <div v-if="formData.imageAssetId">
                   <p class="text-green-600 font-bold">✓ 画像セット済み</p>
                   <p class="text-xs text-gray-500">ドラッグして変更</p>
                 </div>
                 <div v-else>
                   <p class="text-sm">画像をドラッグ</p>
                 </div>
              </DropZone>
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
              >
                {{ rarity }}
              </button>
            </div>
          </div>
          
          <div class="form-group">
            <label for="card-description" class="form-label">コメント</label>
            <textarea
              id="card-description"
              v-model="formData.description"
              class="form-textarea"
              rows="3"
              placeholder="先生からのコメント..."
            ></textarea>
          </div>

          <button
            type="submit"
            class="submit-button"
          >
            確認画面へ進む
          </button>
        </form>

        <!-- Right: Real-time Preview -->
        <div class="preview-right">
          <h4 class="preview-header">プレビュー</h4>
          <div class="preview-wrapper">
            <SsrCard :card="previewCardData" />
          </div>
          <p class="preview-note">※ 実際のガチャ演出とは一部異なる場合があります</p>
        </div>
      </div>

      <!-- Confirmation View -->
      <div v-else class="confirm-view">
        <h4 class="confirm-title">カードの出来を確認してください</h4>
        <div class="confirm-card-wrapper">
          <SsrCard :card="previewCardData" />
        </div>
        <dl class="confirm-summary">
          <dt>カード名</dt>
          <dd>{{ formData.title || '—' }}</dd>
          <dt>レアリティ</dt>
          <dd>{{ formData.rarity }}</dd>
          <dt>コメント</dt>
          <dd>{{ formData.description || '—' }}</dd>
        </dl>
        <div class="confirm-actions">
          <button
            type="button"
            class="confirm-edit-btn"
            @click="handleBackToEdit"
          >
            修正する
          </button>
          <button
            type="button"
            :disabled="isSubmitting"
            class="confirm-present-btn"
            :class="{ submitting: isSubmitting }"
            @click="handleFinalSubmit"
          >
            <span v-if="!isSubmitting">🎁 生徒にプレゼントする</span>
            <span v-else>送信中...</span>
          </button>
        </div>
      </div>
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
  border: 1px solid #e2e8f0;
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
  margin: 0;
}

.form-header {
  margin-bottom: 2rem;
}

.content-split {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

@media (min-width: 1024px) {
  .content-split {
    grid-template-columns: 1fr 340px; /* Preview has fixed width */
    gap: 3rem;
  }
}

.form-left {
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

.required {
  color: #ef4444;
}

.form-input, .form-textarea {
  padding: 0.875rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  width: 100%;
  transition: all 0.3s ease;
}

.form-input:focus, .form-textarea:focus, .form-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-select {
  padding: 0.875rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  width: 100%;
  background: white;
  cursor: pointer;
}

/* AI生成セクション */
.ai-section {
  padding: 1.25rem;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-radius: 12px;
  border: 1px solid #bae6fd;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ai-section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #0369a1;
  margin: 0 0 0.25rem 0;
}

.ai-generate-btn {
  padding: 0.875rem 1rem;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: opacity 0.2s;
}

.ai-generate-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.ai-generate-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.loader {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: rotation 0.8s linear infinite;
}

@keyframes rotation {
  to { transform: rotate(360deg); }
}

.rarity-selector {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.rarity-button {
  flex: 1;
  min-width: 40px;
  padding: 0.75rem 0;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-weight: bold;
  color: #64748b;
  transition: all 0.2s ease;
}

.rarity-button.active {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(37, 99, 235, 0.1);
}

.submit-button {
  padding: 1rem;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.125rem;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);
  transition: all 0.3s ease;
  margin-top: 1rem;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 12px rgba(59, 130, 246, 0.4);
}

.submit-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.compact-dropzone {
  min-height: 120px;
}

.preview-right {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  min-width: 0;
}

.preview-header {
  font-size: 1rem;
  font-weight: 600;
  color: #1e3a8a;
  margin-bottom: 1rem;
}

/* カードプレビューに幅を渡し、aspect-ratio が正しく効くようにする */
.preview-wrapper {
  display: block;
  width: 100%;
  max-width: 320px;
  min-width: 0;
  margin-bottom: 1rem;
}

.preview-note {
  font-size: 0.75rem;
  color: #94a3b8;
  text-align: center;
}

/* Confirmation View */
.confirm-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem 0;
  text-align: center;
}

.confirm-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e3a8a;
  margin: 0 0 1.5rem 0;
}

.confirm-card-wrapper {
  width: 100%;
  max-width: 320px;
  margin-bottom: 1.5rem;
}

.confirm-summary {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem 1.5rem;
  width: 100%;
  max-width: 360px;
  margin-bottom: 2rem;
  padding: 1rem 1.25rem;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  text-align: left;
}

.confirm-summary dt {
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
}

.confirm-summary dd {
  font-size: 0.9375rem;
  color: #1e293b;
  margin: 0;
  word-break: break-word;
}

.confirm-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
}

.confirm-edit-btn {
  padding: 0.875rem 1.5rem;
  background: #e2e8f0;
  color: #475569;
  border: 2px solid #cbd5e1;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.confirm-edit-btn:hover {
  background: #cbd5e1;
  color: #1e293b;
}

.confirm-present-btn {
  padding: 0.875rem 1.5rem;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(5, 150, 105, 0.3);
  transition: all 0.2s ease;
}

.confirm-present-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 10px rgba(5, 150, 105, 0.4);
}

.confirm-present-btn:disabled,
.confirm-present-btn.submitting {
  opacity: 0.8;
  cursor: not-allowed;
}
</style>

