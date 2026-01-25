<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import DropZone from '@/components/common/DropZone.vue';
import { addMinecraftProject, createCard } from '@/utils/mockDataHelpers';
import { saveAsset, getAssetUrl } from '@/utils/assetStore';
import { useToast } from '@/composables/useToast';
import { placeholders } from '@/utils/placeholder';
import type { MinecraftProject } from '@/types/student';

interface Props {
  studentId: string;
}

const props = defineProps<Props>();
const { addToast } = useToast();

const DRAFT_KEY = 'minecraft_form_draft';

const formData = ref({
  title: '',
  description: '',
  createdAt: new Date().toISOString().split('T')[0],
  modelAssetId: '', // IDB key
  screenshotAssetId: '', // IDB key (for now, mainly used for preview/storage)
  // For compatibility/fallback, we might still use URL string if external
  makeCodeUrl: '',
});

const modelFile = ref<File | null>(null);
const screenshotFile = ref<File | null>(null);
const modelPreviewUrl = ref<string | null>(null);
const screenshotPreviewUrl = ref<string | null>(null);

const isSubmitting = ref(false);

// Draft Saving
watch(formData, (newVal) => {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(newVal));
}, { deep: true });

onMounted(async () => {
  const savedDraft = localStorage.getItem(DRAFT_KEY);
  if (savedDraft) {
    try {
      const parsed = JSON.parse(savedDraft);
      // Restore basic fields
      formData.value = {
        ...formData.value,
        ...parsed,
      };
      
      // Restore previews if Asset IDs exist
      if (formData.value.modelAssetId) {
        modelPreviewUrl.value = await getAssetUrl(formData.value.modelAssetId) || null;
      }
      if (formData.value.screenshotAssetId) {
        screenshotPreviewUrl.value = await getAssetUrl(formData.value.screenshotAssetId) || null;
      }
      
      addToast('下書きを復元しました', '前回の入力内容を復元しました。', 'info', 3000);
    } catch (e) {
      console.error('Draft restore failed', e);
    }
  }
});

const validateForm = (): string | null => {
  if (!formData.value.title.trim()) {
    return '作品名を入力してください';
  }
  if (!formData.value.createdAt) {
    return '作成日を入力してください';
  }
  return null;
};

const handleModelFilesDropped = async (files: File[]) => {
  if (files.length === 0) return;
  const file = files[0];
  modelFile.value = file;
  
  // Create temp URL for preview (revoked later or handled by IDB)
  modelPreviewUrl.value = URL.createObjectURL(file);
  
  // Immediately save to IDB (Draft/Asset style)
  try {
    const assetId = await saveAsset(file);
    formData.value.modelAssetId = assetId; // "idb://..." logic handled at conversion
    addToast('3Dモデルを読み込みました', file.name, 'success', 2000);
  } catch (e) {
    addToast('保存エラー', '3Dモデルの一時保存に失敗しました', 'error');
  }
};

const handleScreenshotFilesDropped = async (files: File[]) => {
  if (files.length === 0) return;
  const file = files[0];
  screenshotFile.value = file;
  screenshotPreviewUrl.value = URL.createObjectURL(file);

  try {
    const assetId = await saveAsset(file);
    formData.value.screenshotAssetId = assetId;
    addToast('画像を読み込みました', file.name, 'success', 2000);
  } catch (e) {
    addToast('保存エラー', '画像の一時保存に失敗しました', 'error');
  }
};

const handleError = (msg: string) => {
  addToast('エラー', msg, 'error');
};

const handleSubmit = async () => {
  const validationError = validateForm();
  if (validationError) {
    addToast('入力エラー', validationError, 'warning');
    return;
  }

  isSubmitting.value = true;

  try {
    // Construct final data
    // Note: We use the special scheme "idb://" for internal assets
    const finalModelUrl = formData.value.modelAssetId ? `idb://${formData.value.modelAssetId}` : undefined;
    const finalScreenshotUrl = formData.value.screenshotAssetId ? `idb://${formData.value.screenshotAssetId}` : undefined;

    const newProject: MinecraftProject = {
      id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: formData.value.title.trim(),
      description: formData.value.description.trim(),
      createdAt: formData.value.createdAt,
      modelUrl: finalModelUrl,
      screenshotUrl: finalScreenshotUrl,
      makeCodeUrl: formData.value.makeCodeUrl.trim() || undefined,
    };

    addMinecraftProject(props.studentId, newProject);

    // ダッシュボードに表示するためのカードも作成
    createCard({
      studentId: props.studentId,
      date: formData.value.createdAt,
      title: formData.value.title.trim(),
      description: formData.value.description.trim() || 'Minecraft作品',
      imageUrl: finalScreenshotUrl || placeholders.minecraftScreenshot('Minecraft'),
      rarity: 'R', // デフォルトでRare
      isOpened: false, // ガチャ未開封
      minecraftData: {
        modelUrl: finalModelUrl,
        screenshotUrl: finalScreenshotUrl,
        makeCodeUrl: formData.value.makeCodeUrl.trim() || undefined,
      },
    });

    addToast('保存完了', 'Minecraft作品を登録しました！', 'success');
    
    // Reset Form
    formData.value = {
      title: '',
      description: '',
      createdAt: new Date().toISOString().split('T')[0],
      modelAssetId: '',
      screenshotAssetId: '',
      makeCodeUrl: '',
    };
    modelFile.value = null;
    screenshotFile.value = null;
    modelPreviewUrl.value = null;
    screenshotPreviewUrl.value = null;
    
    // Clear Draft
    localStorage.removeItem(DRAFT_KEY);

  } catch (error) {
    addToast('保存失敗', error instanceof Error ? error.message : '保存に失敗しました', 'error');
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
        <div class="form-grid">
          <!-- Text Inputs -->
          <div class="input-section">
            <div class="form-group">
              <label for="minecraft-title" class="form-label">作品名 <span class="required">*</span></label>
              <input
                id="minecraft-title"
                v-model="formData.title"
                type="text"
                class="form-input"
                placeholder="例: むらさきのせかい"
                required
              />
            </div>

            <div class="form-group">
              <label for="minecraft-date" class="form-label">作成日 <span class="required">*</span></label>
              <input
                id="minecraft-date"
                v-model="formData.createdAt"
                type="date"
                class="form-input"
                required
              />
            </div>
            
             <div class="form-group">
              <label for="minecraft-makecode" class="form-label">MakeCode URL</label>
              <input
                id="minecraft-makecode"
                v-model="formData.makeCodeUrl"
                type="url"
                class="form-input"
                placeholder="https://..."
              />
            </div>

            <div class="form-group">
              <label for="minecraft-description" class="form-label">作品の説明</label>
              <textarea
                id="minecraft-description"
                v-model="formData.description"
                class="form-textarea"
                rows="4"
                placeholder="作品のポイントやがんばったところ..."
              ></textarea>
            </div>
          </div>

          <!-- File Uploads -->
          <div class="upload-section">
            <div class="form-group">
              <label class="form-label">3Dモデル (.glb)</label>
              <DropZone
                accept=".glb,model/gltf-binary"
                :max-size-m-b="50"
                @files-dropped="handleModelFilesDropped"
                @error="handleError"
              >
                <div v-if="modelPreviewUrl" class="file-preview">
                   <span class="file-icon">📦</span>
                   <span class="file-status">アップロード完了</span>
                </div>
                <div v-else>
                  <p class="primary-text">3Dモデルをドロップ</p>
                  <p class="secondary-text">またはクリック (.glb)</p>
                </div>
              </DropZone>
            </div>

            <div class="form-group">
              <label class="form-label">スクリーンショット</label>
              <DropZone
                accept="image/*"
                :max-size-m-b="10"
                @files-dropped="handleScreenshotFilesDropped"
                @error="handleError"
              >
                 <div v-if="screenshotPreviewUrl" class="image-preview-wrapper">
                   <img :src="screenshotPreviewUrl" class="preview-img" />
                </div>
                <div v-else>
                  <p class="primary-text">画像をドロップ</p>
                </div>
              </DropZone>
            </div>
          </div>
        </div>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="submit-button"
          :class="{ submitting: isSubmitting }"
        >
          <span v-if="!isSubmitting">保存する</span>
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
  margin: 0 0 2rem 0;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

@media (min-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
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
  transition: all 0.3s ease;
  width: 100%;
}

.form-input:focus, .form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.file-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: #10b981;
}

.file-icon {
  font-size: 2rem;
}

.image-preview-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  border-radius: 8px;
}

.preview-img {
  max-width: 100%;
  max-height: 150px;
  object-fit: contain;
}

.submit-button {
  width: 100%;
  padding: 1rem;
  margin-top: 1rem;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.125rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 12px rgba(59, 130, 246, 0.4);
}

.submit-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.primary-text {
  font-weight: 600;
  color: #334155;
}
.secondary-text {
  font-size: 0.875rem;
  color: #64748b;
}

</style>

