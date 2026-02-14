<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  accept?: string;
  maxSizeMB?: number;
  multiple?: boolean;
}>();

/** ユーザー向けの形式表示（image/* は JPEG/PNG/WebP などと表記） */
const acceptDisplayLabel = computed(() => {
  const a = props.accept?.trim();
  if (!a) return '';
  if (a === 'image/*') return 'JPEG、PNG、WebPなど';
  return a;
});

const emit = defineEmits<{
  (e: 'files-dropped', files: File[]): void;
  (e: 'error', message: string): void;
}>();

const isDragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const handleDragEnter = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = true;
};

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = false;
};

const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = true; // Ensure it stays true
};

const validateFile = (file: File): string | null => {
  if (props.accept) {
    const acceptedTypes = props.accept.split(',').map(t => t.trim());
    const fileType = file.type;
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    
    // Simple check: matches mime type or extension
    const isValid = acceptedTypes.some(type => {
      if (type.startsWith('.')) return type === fileExt;
      if (type.endsWith('/*')) return fileType.startsWith(type.replace('/*', ''));
      return type === fileType;
    });

    if (!isValid) return `ファイル形式が正しくありません: ${file.name}`;
  }

  if (props.maxSizeMB && file.size > props.maxSizeMB * 1024 * 1024) {
    return `ファイルサイズが大きすぎます (${props.maxSizeMB}MB以下): ${file.name}`;
  }

  return null;
};

const processFiles = (files: FileList | null) => {
  if (!files || files.length === 0) return;

  const validFiles: File[] = [];
  const errors: string[] = [];

  // If not multiple, only take the first one
  const fileArray = props.multiple ? Array.from(files) : [files[0]];

  for (const file of fileArray) {
    const error = validateFile(file);
    if (error) {
      errors.push(error);
    } else {
      validFiles.push(file);
    }
  }

  if (errors.length > 0) {
    emit('error', errors.join('\n'));
  }

  if (validFiles.length > 0) {
    emit('files-dropped', validFiles);
  }
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = false;
  processFiles(e.dataTransfer?.files || null);
};

const handleFileInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  processFiles(target.files);
  // Reset input so same file can be selected again if needed
  target.value = '';
};

const openFileDialog = () => {
  fileInput.value?.click();
};
</script>

<template>
  <div
    class="dropzone"
    :class="{ 'is-dragging': isDragging }"
    @dragenter="handleDragEnter"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
    @click="openFileDialog"
  >
    <input
      ref="fileInput"
      type="file"
      :accept="props.accept"
      :multiple="props.multiple"
      class="hidden-input"
      @change="handleFileInput"
    />
    
    <div class="dropzone-content">
      <div class="icon-wrapper">
        <slot name="icon">
          <!-- Default Upload Icon -->
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-10 h-10">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
          </svg>
        </slot>
      </div>
      
      <div class="text-wrapper">
        <slot>
          <p class="primary-text">ファイルをドラッグ＆ドロップ</p>
          <p class="secondary-text">またはクリックして選択</p>
        </slot>
      </div>

      <div v-if="acceptDisplayLabel" class="meta-text">
        形式: {{ acceptDisplayLabel }}
      </div>
      <div v-if="props.maxSizeMB" class="meta-text">
        最大: {{ props.maxSizeMB }}MB
      </div>
    </div>

    <!-- Drag Overlay -->
    <div v-if="isDragging" class="drag-overlay">
      <p class="overlay-text">ドロップしてアップロード</p>
    </div>
  </div>
</template>

<style scoped>
.dropzone {
  position: relative;
  width: 100%;
  min-height: 200px;
  border: 2px dashed #94a3b8;
  border-radius: 12px;
  background: rgba(248, 250, 252, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.dropzone:hover {
  border-color: #3b82f6;
  background: rgba(239, 246, 255, 0.6);
}

.dropzone.is-dragging {
  border-color: #2563eb;
  background: rgba(219, 234, 254, 0.8);
  transform: scale(1.01);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
}

.hidden-input {
  display: none;
}

.dropzone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
  pointer-events: none; /* Let clicks pass to parent */
}

.icon-wrapper {
  color: #64748b;
  transition: color 0.3s ease;
}

.dropzone:hover .icon-wrapper {
  color: #3b82f6;
}

.text-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.primary-text {
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
}

.secondary-text {
  font-size: 0.875rem;
  color: #64748b;
}

.meta-text {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 0.5rem;
}

.drag-overlay {
  position: absolute;
  inset: 0;
  background: rgba(59, 130, 246, 0.1);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  animation: fadeIn 0.2s ease;
}

.overlay-text {
  font-size: 1.25rem;
  font-weight: bold;
  color: #2563eb;
  background: rgba(255, 255, 255, 0.9);
  padding: 0.75rem 1.5rem;
  border-radius: 9999px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Dark mode / Tech theme adaptations if needed */
@media (prefers-color-scheme: dark) {
  /* ... add dark mode styles if the app supports it, 
     but the current admin panel seems to be light mode based on existing CSS. */
}
</style>
