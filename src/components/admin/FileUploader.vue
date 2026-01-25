<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  accept?: string;
  maxSizeMB?: number;
  label?: string;
}

const props = withDefaults(defineProps<Props>(), {
  accept: 'image/*',
  maxSizeMB: 10,
  label: '画像をアップロード',
});

const emit = defineEmits<{
  'file-selected': [file: File];
  'file-removed': [];
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const previewUrl = ref<string | null>(null);
const dragOver = ref(false);
const error = ref<string | null>(null);

const hasFile = computed(() => selectedFile.value !== null);

const validateFile = (file: File): string | null => {
  const maxSizeBytes = props.maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return `ファイルサイズが大きすぎます（最大${props.maxSizeMB}MB）`;
  }
  return null;
};

const handleFileSelect = (file: File) => {
  error.value = null;
  const validationError = validateFile(file);
  if (validationError) {
    error.value = validationError;
    return;
  }

  selectedFile.value = file;
  previewUrl.value = URL.createObjectURL(file);
  emit('file-selected', file);
};

const handleInputChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    handleFileSelect(file);
  }
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  dragOver.value = false;

  const file = e.dataTransfer?.files[0];
  if (file) {
    handleFileSelect(file);
  }
};

const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  dragOver.value = true;
};

const handleDragLeave = () => {
  dragOver.value = false;
};

const handleRemove = () => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
  selectedFile.value = null;
  previewUrl.value = null;
  error.value = null;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
  emit('file-removed');
};

const handleClick = () => {
  fileInput.value?.click();
};
</script>

<template>
  <div class="file-uploader">
    <label v-if="props.label" class="uploader-label">{{ props.label }}</label>
    
    <div
      v-if="!hasFile"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      :class="['upload-area', { 'drag-over': dragOver }]"
      role="button"
      tabindex="0"
      @click="handleClick"
      @keydown.enter="handleClick"
      @keydown.space.prevent="handleClick"
      aria-label="ファイルをアップロード"
    >
      <input
        ref="fileInput"
        type="file"
        :accept="props.accept"
        @change="handleInputChange"
        class="file-input"
        aria-hidden="true"
      />
      <div class="upload-content">
        <div class="upload-icon">📁</div>
        <p class="upload-text">クリックまたはドラッグ&ドロップでファイルを選択</p>
        <p class="upload-hint">最大{{ props.maxSizeMB }}MB</p>
      </div>
    </div>

    <div v-else class="preview-area">
      <div class="preview-container">
        <img
          v-if="previewUrl"
          :src="previewUrl"
          alt="プレビュー画像"
          class="preview-image"
          loading="lazy"
        />
        <div class="preview-info">
          <p class="file-name">{{ selectedFile?.name }}</p>
          <p class="file-size">{{ ((selectedFile?.size || 0) / 1024 / 1024).toFixed(2) }}MB</p>
        </div>
        <button
          @click="handleRemove"
          class="remove-button"
          aria-label="ファイルを削除"
        >
          ✕
        </button>
      </div>
    </div>

    <div v-if="error" class="error-message" role="alert">
      ⚠️ {{ error }}
    </div>
  </div>
</template>

<style scoped>
.file-uploader {
  width: 100%;
}

.uploader-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e3a8a;
  margin-bottom: 0.5rem;
}

.upload-area {
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #f8fafc;
}

.upload-area:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.upload-area.drag-over {
  border-color: #3b82f6;
  background: #dbeafe;
  transform: scale(1.02);
}

.upload-area:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.file-input {
  display: none;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.upload-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.upload-text {
  font-size: 1rem;
  color: #475569;
  margin: 0;
  font-weight: 500;
}

.upload-hint {
  font-size: 0.875rem;
  color: #94a3b8;
  margin: 0;
}

.preview-area {
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem;
  background: white;
}

.preview-container {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.preview-image {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
  border: 2px solid #e2e8f0;
}

.preview-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.file-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e3a8a;
  margin: 0;
  word-break: break-all;
}

.file-size {
  font-size: 0.75rem;
  color: #64748b;
  margin: 0;
}

.remove-button {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border: none;
  border-radius: 50%;
  background: #fee2e2;
  color: #dc2626;
  font-size: 1.25rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

@media (hover: hover) and (pointer: fine) {
  .remove-button:hover {
    background: #fca5a5;
    transform: scale(1.1);
  }
}

.error-message {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: #fee2e2;
  border: 2px solid #fca5a5;
  border-radius: 8px;
  color: #991b1b;
  font-size: 0.875rem;
}

/* レスポンシブ対応 */
@media (max-width: 767.98px) {
  .upload-area {
    padding: 2rem 1rem;
  }

  .preview-container {
    flex-direction: column;
    text-align: center;
  }

  .preview-image {
    width: 100%;
    max-width: 200px;
    height: auto;
  }
}
</style>

