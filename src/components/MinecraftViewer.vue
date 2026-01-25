<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import '@google/model-viewer';
import type { CardData } from '@/types/card';
import { getAssetUrl } from '@/utils/assetStore';

// Propsの定義
interface Props {
  card?: CardData;
  modelUrl?: string;
  screenshotUrl?: string;
  makeCodeUrl?: string;
  alt?: string;
  title?: string;
}

const props = defineProps<Props>();

// Raw URLs from props
const rawModelUrl = computed(() => props.card?.minecraftData?.modelUrl ?? props.modelUrl ?? '');
const rawScreenshotUrl = computed(() => props.card?.minecraftData?.screenshotUrl ?? props.screenshotUrl);

// Constants
const DEFAULT_MAKECODE_URL = 'https://minecraft.makecode.com/';

const makeCodeUrl = computed(() => props.card?.minecraftData?.makeCodeUrl ?? props.makeCodeUrl ?? DEFAULT_MAKECODE_URL);
const altText = computed(() => props.card?.title ?? props.alt ?? props.title ?? 'Minecraft作品');
const displayTitle = computed(() => props.card?.title ?? props.title);

// Resolved URLs (for IDB)
const resolvedModelUrl = ref('');
const resolvedScreenshotUrl = ref('');

// IDB Resolution Logic
watch(rawModelUrl, async (newUrl) => {
  if (newUrl?.startsWith('idb://')) {
    resolvedModelUrl.value = await getAssetUrl(newUrl.replace('idb://', '')) || '';
  } else {
    resolvedModelUrl.value = newUrl;
  }
}, { immediate: true });

watch(rawScreenshotUrl, async (newUrl) => {
  if (newUrl?.startsWith('idb://')) {
    resolvedScreenshotUrl.value = await getAssetUrl(newUrl.replace('idb://', '')) || '';
  } else {
    resolvedScreenshotUrl.value = newUrl || '';
  }
}, { immediate: true });

// ローディング状態の管理
const isLoading = ref(true);
const hasError = ref(false);
const modelViewerRef = ref<HTMLElement | null>(null);

// 遅延読み込み用の状態管理
const isVisible = ref(false);
const containerRef = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

const handleLoad = () => {
  isLoading.value = false;
  hasError.value = false;
};

const handleError = () => {
  isLoading.value = false;
  hasError.value = true;
};

// リトライ機能
const retryLoad = () => {
  isLoading.value = true;
  hasError.value = false;
  if (modelViewerRef.value) {
    const viewer = modelViewerRef.value as any;
    if (viewer.src) {
      const currentSrc = viewer.src;
      viewer.src = '';
      setTimeout(() => {
        viewer.src = currentSrc;
      }, 100);
    }
  }
};

// resolvedModelUrlが変更されたときにローディング状態をリセット
const resetLoadingState = () => {
  if (resolvedModelUrl.value && isVisible.value) {
    isLoading.value = true;
    hasError.value = false;
  } else {
    isLoading.value = false;
  }
};

// Intersection Observer
onMounted(() => {
  if (!containerRef.value) return;
  
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          isVisible.value = true;
          observer?.disconnect();
        }
      });
    },
    {
      rootMargin: '50px',
      threshold: 0.1,
    }
  );
  
  observer.observe(containerRef.value);
});

onUnmounted(() => {
  observer?.disconnect();
});

// Watch resolved url instead of raw
watch([resolvedModelUrl, isVisible], () => {
  resetLoadingState();
}, { immediate: true });
</script>

<template>
  <div ref="containerRef" class="minecraft-viewer-container">
    <!-- プレースホルダー（まだ読み込まれていない場合） -->
    <div v-if="!isVisible && rawModelUrl" class="placeholder-container">
      <div class="placeholder-icon">🏗️</div>
      <p class="placeholder-text">スクロールすると3Dモデルが表示されます</p>
      <div v-if="resolvedScreenshotUrl" class="placeholder-screenshot">
        <img 
          :src="resolvedScreenshotUrl" 
          :alt="`${displayTitle || 'Minecraft作品'}のプレビュー`"
          class="placeholder-screenshot-image"
        />
      </div>
    </div>

    <!-- ローディングインジケータ -->
    <div v-if="isLoading && resolvedModelUrl && isVisible" class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">まいんくらふとのせかいをよみこみちゅう...</p>
    </div>

    <!-- エラー表示（スクリーンショットがない場合、またはmodelUrlがない場合） -->
    <div v-if="(hasError || (!resolvedModelUrl && !resolvedScreenshotUrl)) && !resolvedScreenshotUrl" class="error-container">
      <div class="error-icon">🏗️</div>
      <p class="error-text">
        {{ resolvedModelUrl ? 'せかいをみつけられなかったよ...' : 'まいんくらふとのせかいはまだないよ' }}
      </p>
      <button v-if="resolvedModelUrl" @click="retryLoad" class="retry-button">もういちどためす</button>
    </div>

    <!-- 3Dモデルビューアー -->
    <div 
      v-if="resolvedModelUrl && !hasError && isVisible" 
      class="model-viewer-wrapper"
      :class="{ 'fade-in': !isLoading }"
    >
      <model-viewer
        ref="modelViewerRef"
        :src="resolvedModelUrl"
        :alt="altText"
        :auto-rotate="false"
        camera-controls
        shadow-intensity="1"
        background-color="#1a1a2e"
        class="model-viewer"
        @load="handleLoad"
        @error="handleError"
      ></model-viewer>
    </div>

    <!-- スクリーンショット表示 (フォールバック) -->
    <div v-if="resolvedScreenshotUrl && (hasError || !resolvedModelUrl)" class="screenshot-container" :class="{ 'error-fallback': hasError || !resolvedModelUrl }">
      <img 
        :src="resolvedScreenshotUrl" 
        :alt="`${displayTitle || 'Minecraft作品'}のスクリーンショット`"
        class="screenshot-image"
        @error="(e) => { (e.target as HTMLImageElement).style.display = 'none'; }"
      />
    </div>

    <!-- MakeCodeリンク -->
    <div v-if="makeCodeUrl" class="makecode-link-container">
      <a 
        :href="makeCodeUrl" 
        target="_blank" 
        rel="noopener noreferrer"
        class="makecode-link-button"
      >
        <span class="makecode-icon">💻</span>
        <span>MakeCodeでみる</span>
      </a>
    </div>
  </div>
</template>

<style scoped>
.minecraft-viewer-container {
  @apply relative w-full rounded-xl overflow-hidden shadow-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-black border border-gray-700/50;
  min-height: 300px;
  transition: transform 0.3s ease-out, box-shadow 0.3s ease-out;
}

.loading-container {
  @apply absolute inset-0 flex flex-col items-center justify-center z-20 bg-gradient-to-br from-gray-900 via-gray-800 to-black;
}

.loading-spinner {
  @apply w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  @apply mt-4 text-blue-300 text-lg font-medium;
  font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif;
}

.error-container {
  @apply absolute inset-0 flex flex-col items-center justify-center z-20 bg-gradient-to-br from-gray-900 via-gray-800 to-black p-8;
}

.error-icon {
  @apply text-6xl mb-4;
}

.error-text {
  @apply text-yellow-300 text-lg font-medium mb-6 text-center;
  font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif;
}

.retry-button {
  @apply px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-lg;
  font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif;
}

.retry-button:active {
  @apply scale-95;
}

.model-viewer-wrapper {
  @apply relative w-full;
  height: 300px;
  opacity: 0;
  transition: opacity 0.5s ease-in-out;
}

.model-viewer-wrapper.fade-in {
  opacity: 1;
}

.model-viewer {
  @apply w-full h-full;
  min-height: 300px;
}

.screenshot-container {
  @apply mt-4 rounded-lg overflow-hidden shadow-lg;
}

.screenshot-container.error-fallback {
  @apply border-2 border-yellow-500/50;
}

.screenshot-image {
  @apply w-full h-auto object-cover;
  transition: opacity 0.3s ease-in-out;
}

.makecode-link-container {
  @apply mt-4 flex justify-center;
}

.makecode-link-button {
  @apply inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg;
  font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif;
}

.makecode-link-button:active {
  @apply scale-95;
}

.makecode-icon {
  @apply text-xl;
}

.placeholder-container {
  @apply absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-8;
  min-height: 300px;
}

.placeholder-icon {
  @apply text-6xl mb-4 opacity-50;
}

.placeholder-text {
  @apply text-gray-400 text-sm mb-4 text-center;
  font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif;
}

.placeholder-screenshot {
  @apply mt-4 max-w-full max-h-48 rounded-lg overflow-hidden shadow-lg;
}

.placeholder-screenshot-image {
  @apply w-full h-auto object-cover opacity-60;
}

/* レスポンシブ対応 */
@media (min-width: 640px) {
  .model-viewer-wrapper {
    height: 400px;
  }
  
  .model-viewer {
    min-height: 400px;
  }
}

@media (min-width: 1024px) {
  .model-viewer-wrapper {
    height: 500px;
  }
  
  .model-viewer {
    min-height: 500px;
  }
}

@media (min-width: 1280px) {
  .model-viewer-wrapper {
    height: 600px;
  }
  
  .model-viewer {
    min-height: 600px;
  }
}

/* アクセシビリティ対応 */
@media (prefers-reduced-motion: reduce) {
  .loading-spinner {
    animation: none;
    @apply border-blue-400;
  }
  
  .model-viewer-wrapper {
    transition: none;
    opacity: 1;
  }
  
  model-viewer {
    --auto-rotate-delay: 0;
  }
  
  .retry-button:active,
  .makecode-link-button:active {
    transform: none;
  }
}

/* ホバーエフェクト（タッチデバイスでは無効化） */
@media (hover: hover) and (pointer: fine) {
  .minecraft-viewer-container:hover {
    transform: translateY(-4px);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  }
}
</style>

