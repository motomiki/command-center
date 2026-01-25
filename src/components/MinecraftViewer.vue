<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import '@google/model-viewer';
import type { CardData } from '@/types/card';

// Propsの定義: CardDataを直接受け取るか、個別プロパティを受け取る
interface Props {
  // パターン1: CardDataを直接受け取る
  card?: CardData;
  // パターン2: 個別プロパティ（後方互換性のため）
  modelUrl?: string;      // .glbファイルのURL
  screenshotUrl?: string;  // スクリーンショットのURL
  makeCodeUrl?: string;    // MakeCodeの共有URL
  alt?: string;           // アクセシビリティ用の代替テキスト
  title?: string;         // 作品タイトル（表示用）
}

const props = defineProps<Props>();

// CardDataから値を取得するか、個別プロパティから取得する
const modelUrl = computed(() => props.card?.minecraftData?.modelUrl ?? props.modelUrl ?? '');
const screenshotUrl = computed(() => props.card?.minecraftData?.screenshotUrl ?? props.screenshotUrl);
const makeCodeUrl = computed(() => props.card?.minecraftData?.makeCodeUrl ?? props.makeCodeUrl);
const altText = computed(() => props.card?.title ?? props.alt ?? props.title ?? 'Minecraft作品');
const displayTitle = computed(() => props.card?.title ?? props.title);

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
  // model-viewerを再読み込みするために、srcを一時的に変更して戻す
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

// modelUrlが変更されたときにローディング状態をリセット
const resetLoadingState = () => {
  if (modelUrl.value && isVisible.value) {
    isLoading.value = true;
    hasError.value = false;
  } else {
    // modelUrlが空の場合、またはまだビューポートに入っていない場合はローディングを停止
    isLoading.value = false;
  }
};

// Intersection Observer の実装
onMounted(() => {
  if (!containerRef.value) return;
  
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          isVisible.value = true;
          observer?.disconnect(); // 一度読み込んだら監視を停止
        }
      });
    },
    {
      rootMargin: '50px', // 50px手前から読み込み開始
      threshold: 0.1,     // 10%表示された時点で読み込み
    }
  );
  
  observer.observe(containerRef.value);
});

onUnmounted(() => {
  observer?.disconnect();
});

// modelUrlとisVisibleの両方を監視
watch([modelUrl, isVisible], () => {
  resetLoadingState();
}, { immediate: true });
</script>

<template>
  <div ref="containerRef" class="minecraft-viewer-container">
    <!-- プレースホルダー（まだ読み込まれていない場合） -->
    <div v-if="!isVisible && modelUrl" class="placeholder-container">
      <div class="placeholder-icon">🏗️</div>
      <p class="placeholder-text">スクロールすると3Dモデルが表示されます</p>
      <div v-if="screenshotUrl" class="placeholder-screenshot">
        <img 
          :src="screenshotUrl" 
          :alt="`${displayTitle || 'Minecraft作品'}のプレビュー`"
          class="placeholder-screenshot-image"
        />
      </div>
    </div>

    <!-- ローディングインジケータ -->
    <div v-if="isLoading && modelUrl && isVisible" class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">まいんくらふとのせかいをよみこみちゅう...</p>
    </div>

    <!-- エラー表示（スクリーンショットがない場合、またはmodelUrlがない場合） -->
    <div v-if="(hasError || (!modelUrl && !screenshotUrl)) && !screenshotUrl" class="error-container">
      <div class="error-icon">🏗️</div>
      <p class="error-text">
        {{ modelUrl ? 'せかいをみつけられなかったよ...' : 'まいんくらふとのせかいはまだないよ' }}
      </p>
      <button v-if="modelUrl" @click="retryLoad" class="retry-button">もういちどためす</button>
    </div>

    <!-- 3Dモデルビューアー（ビューポートに入った時だけ表示） -->
    <div 
      v-if="modelUrl && !hasError && isVisible" 
      class="model-viewer-wrapper"
      :class="{ 'fade-in': !isLoading }"
    >
      <model-viewer
        ref="modelViewerRef"
        :src="modelUrl"
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

    <!-- スクリーンショット表示（フォールバックまたは追加表示） -->
    <div v-if="screenshotUrl" class="screenshot-container" :class="{ 'error-fallback': hasError || !modelUrl }">
      <img 
        :src="screenshotUrl" 
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

