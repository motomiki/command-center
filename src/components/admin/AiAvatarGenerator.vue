<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { generateStudentIcon, type AIModelType, type AvatarStyleType } from '@/services/aiService';
import { useToast } from '@/composables/useToast';

const props = defineProps<{
  initialAvatarUrl?: string;
  studentName?: string;
}>();

const emit = defineEmits<{
  (e: 'update:avatarUrl', url: string): void;
}>();

const { addToast } = useToast();

const avatarUrl = ref(props.initialAvatarUrl || '');
const isGenerating = ref(false);

// AI Settings
const apiKey = ref('');
const modelType = ref<AIModelType>('flash');
const gender = ref<'boy' | 'girl'>('boy');
const avatarStyle = ref<AvatarStyleType>('anime');
const prompt = ref('');

const STORAGE_KEY_API_KEY = 'campusclub_gemini_api_key';

// スタイル選択肢の定義
const styleOptions: { value: AvatarStyleType; label: string; image: string; description: string }[] = [
  {
    value: 'anime',
    label: 'アニメ風',
    image: '/images/anime-style.png',
    description: '日本のアニメ風イラスト',
  },
  {
    value: 'pixel',
    label: 'ドット絵',
    image: '/images/pixelart-style.png',
    description: 'レトロゲーム風ピクセルアート',
  },
];

onMounted(() => {
  const savedKey = localStorage.getItem(STORAGE_KEY_API_KEY);
  if (savedKey) {
    apiKey.value = savedKey;
  }
});

const handleGenerateIcon = async () => {
  if (!apiKey.value) {
    addToast('APIキーを入力してください', 'error');
    return;
  }
  
  if (!prompt.value) {
    addToast('生成するアイコンのイメージを入力してください', 'error');
    return;
  }

  isGenerating.value = true;
  try {
    localStorage.setItem(STORAGE_KEY_API_KEY, apiKey.value);
    const url = await generateStudentIcon(prompt.value, apiKey.value, modelType.value, gender.value, avatarStyle.value);
    avatarUrl.value = url;
    emit('update:avatarUrl', url);
    addToast('アイコンを生成しました', 'success');
  } catch (error) {
    addToast(error instanceof Error ? error.message : 'AI生成に失敗しました', 'error');
  } finally {
    isGenerating.value = false;
  }
};
</script>

<template>
  <div class="ai-generator-container">
    <div class="ai-controls">
      <div class="input-group">
        <span class="input-label">Gemini API Key</span>
        <input
          v-model="apiKey"
          type="password"
          placeholder="Google AI Studioで取得したキー"
          class="form-input"
        />
      </div>

      <div class="input-group">
        <span class="input-label">AIモデル</span>
        <select v-model="modelType" class="form-select">
          <option value="flash">Gemini 2.5 Flash Image (Dev)</option>
          <option value="pro">Gemini 3 Pro Image (Prod)</option>
        </select>
      </div>

      <div class="input-row">
        <div class="input-group flex-1">
          <span class="input-label">性別</span>
          <div class="gender-selection">
            <label class="gender-label">
              <input type="radio" v-model="gender" value="boy" /> 👦 男の子
            </label>
            <label class="gender-label">
              <input type="radio" v-model="gender" value="girl" /> 👧 女の子
            </label>
          </div>
        </div>
      </div>

      <!-- スタイル選択 -->
      <div class="input-group">
        <span class="input-label">
          PFP画像スタイル
          <span class="label-hint">(Profile Picture)</span>
        </span>
        <div class="style-selection">
          <button
            v-for="option in styleOptions"
            :key="option.value"
            type="button"
            class="style-card"
            :class="{ 'style-card--selected': avatarStyle === option.value }"
            @click="avatarStyle = option.value"
          >
            <div class="style-card__image-wrapper">
              <img
                :src="option.image"
                :alt="option.label"
                class="style-card__image"
              />
              <div class="style-card__check" v-if="avatarStyle === option.value">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clip-rule="evenodd" />
                </svg>
              </div>
            </div>
            <div class="style-card__info">
              <span class="style-card__label">{{ option.label }}</span>
              <span class="style-card__desc">{{ option.description }}</span>
            </div>
          </button>
        </div>
      </div>

      <div class="input-group">
        <span class="input-label">アイコンのイメージ</span>
        <div class="prompt-input-wrapper">
          <input
            v-model="prompt"
            type="text"
            placeholder="例：宇宙飛行士、勇者、エンジニア"
            class="form-input"
            @keyup.enter="handleGenerateIcon"
          />
          <button
            @click="handleGenerateIcon"
            :disabled="isGenerating"
            class="inline-generate-btn"
          >
            <span v-if="isGenerating" class="loader"></span>
            {{ isGenerating ? '...' : '🎨 生成' }}
          </button>
        </div>
      </div>
    </div>

    <!-- プレビュー -->
    <div class="avatar-preview-area">
      <div class="preview-box">
        <img
          v-if="avatarUrl"
          :src="avatarUrl"
          alt="Preview"
          class="preview-image"
        />
        <div v-else class="preview-placeholder">
          <span>No Image</span>
        </div>
      </div>
      <p v-if="avatarUrl" class="preview-hint">このアイコンが適用されます</p>
    </div>
  </div>
</template>

<style scoped>
.ai-generator-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.ai-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.input-row {
  display: flex;
  gap: 1rem;
}

.flex-1 {
  flex: 1;
}

.input-label {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 500;
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

/* ラベルヒント */
.label-hint {
  font-size: 0.65rem;
  color: #94a3b8;
  font-weight: normal;
  margin-left: 0.25rem;
}

/* スタイル選択 */
.style-selection {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  padding: 0.5rem 0;
}

.style-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.style-card:hover {
  border-color: #cbd5e1;
  background: #f1f5f9;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.style-card--selected {
  border-color: #6366f1;
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.2);
}

.style-card--selected:hover {
  border-color: #6366f1;
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
}

.style-card__image-wrapper {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.25s ease;
}

.style-card--selected .style-card__image-wrapper {
  border-color: #6366f1;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.style-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.style-card__check {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 24px;
  height: 24px;
  background: #6366f1;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 2px 4px rgba(99, 102, 241, 0.4);
  animation: checkPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.style-card__check svg {
  width: 16px;
  height: 16px;
}

@keyframes checkPop {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.style-card__info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
}

.style-card__label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #334155;
}

.style-card--selected .style-card__label {
  color: #4338ca;
}

.style-card__desc {
  font-size: 0.65rem;
  color: #94a3b8;
  text-align: center;
  line-height: 1.3;
}

.prompt-input-wrapper {
  display: flex;
  gap: 0.5rem;
}

.inline-generate-btn {
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
  color: white;
  border: none;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  white-space: nowrap;
}

.inline-generate-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.avatar-preview-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.preview-box {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4px solid #f8fafc;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
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

.loader {
  width: 14px;
  height: 14px;
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
