<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import '@google/model-viewer';
import { getAssetUrl } from '@/utils/assetStore';

const props = defineProps<{
  show: boolean;
  modelUrl: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'capture', file: File): void;
}>();

const modelViewerRef = ref<HTMLElement | null>(null);
const isLoading = ref(true);
const hasError = ref(false);
const isCapturing = ref(false);

/** Resolved URL for model-viewer (blob or resolved idb://) */
const resolvedModelUrl = ref('');

watch(
  () => [props.show, props.modelUrl] as const,
  async ([show, url]) => {
    if (!show || !url) {
      resolvedModelUrl.value = '';
      isLoading.value = true;
      hasError.value = false;
      return;
    }
    if (url.startsWith('idb://')) {
      const id = url.replace('idb://', '');
      resolvedModelUrl.value = (await getAssetUrl(id)) || '';
    } else {
      resolvedModelUrl.value = url;
    }
    isLoading.value = !!resolvedModelUrl.value;
    hasError.value = false;
  },
  { immediate: true }
);

const handleLoad = () => {
  isLoading.value = false;
  hasError.value = false;
};

const handleError = () => {
  isLoading.value = false;
  hasError.value = true;
};

const handleClose = () => {
  emit('close');
};

const handleCapture = async () => {
  const viewer = modelViewerRef.value;
  if (!viewer || isLoading.value) return;

  const mv = viewer as unknown as { toBlob?: (options?: { mimeType?: string; qualityArgument?: number; idealAspect?: boolean }) => Promise<Blob> };
  if (typeof mv.toBlob !== 'function') {
    return;
  }

  isCapturing.value = true;
  try {
    const blob = await mv.toBlob({
      mimeType: 'image/png',
      qualityArgument: 1.0,
      idealAspect: false,
    });
    const file = new File([blob], 'screenshot.png', { type: 'image/png' });
    emit('capture', file);
    handleClose();
  } catch (e) {
    console.error('Capture failed', e);
  } finally {
    isCapturing.value = false;
  }
};

const canCapture = computed(() => resolvedModelUrl.value && !isLoading.value && !hasError.value && !isCapturing.value);
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">3Dモデルからスクリーンショットを撮影</h3>
        <button type="button" class="close-btn" aria-label="閉じる" @click="handleClose">×</button>
      </div>

      <div class="modal-body">
        <p class="modal-hint">ドラッグで回転、スクロールでズームできます。構図を決めたら「撮影」をクリックしてください。</p>

        <div class="viewer-container">
          <div v-if="isLoading && resolvedModelUrl" class="viewer-loading">
            <div class="loading-spinner"></div>
            <p class="loading-text">読み込み中...</p>
          </div>
          <div v-if="hasError" class="viewer-error">
            <p class="error-text">モデルを読み込めませんでした</p>
          </div>
          <model-viewer
            v-if="resolvedModelUrl && !hasError"
            ref="modelViewerRef"
            :src="resolvedModelUrl"
            alt="3Dモデル"
            :auto-rotate="false"
            camera-controls
            shadow-intensity="1"
            background-color="#1a1a2e"
            class="model-viewer"
            @load="handleLoad"
            @error="handleError"
          ></model-viewer>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="cancel-btn" @click="handleClose">キャンセル</button>
        <button
          type="button"
          class="capture-btn"
          :disabled="!canCapture"
          @click="handleCapture"
        >
          {{ isCapturing ? '撮影中...' : '撮影' }}
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
  max-width: 560px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  animation: modal-in 0.3s ease-out;
}

@keyframes modal-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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

.close-btn:hover {
  color: #1e293b;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
}

.modal-hint {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0 0 1rem 0;
  line-height: 1.5;
}

.viewer-container {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  min-height: 280px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  background: #1a1a2e;
}

.viewer-loading,
.viewer-error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #1a1a2e;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #3b82f6;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  margin-top: 1rem;
  font-size: 0.875rem;
  color: #93c5fd;
}

.error-text {
  font-size: 0.875rem;
  color: #fca5a5;
}

.model-viewer {
  width: 100%;
  height: 100%;
  display: block;
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
  font-weight: 600;
  cursor: pointer;
}

.cancel-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #475569;
}

.capture-btn {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
}

.capture-btn:hover:not(:disabled) {
  filter: brightness(1.05);
  box-shadow: 0 4px 10px rgba(59, 130, 246, 0.4);
}

.capture-btn:disabled {
  background: #94a3b8;
  cursor: not-allowed;
  box-shadow: none;
}
</style>
