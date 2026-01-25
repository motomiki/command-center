<script setup lang="ts">
import { ref, computed } from 'vue';
import confetti from 'canvas-confetti';
import type { CardData, Rarity } from '@/types/card';
import type { GachaState } from '@/types/gacha';
import SsrCard from './SsrCard.vue';
import { getRarityDisplayName } from '@/utils/rarity';
import { placeholders } from '@/utils/placeholder';

// Propsの定義: CardDataを直接受け取るか、個別プロパティを受け取る
interface Props {
  // パターン1: CardDataを直接受け取る（推奨）
  card?: CardData;
  // パターン2: 未開封カードの配列（複数ガチャ権利がある場合）
  unopenedCards?: CardData[];
  // パターン3: 後方互換性のため（非推奨）
  dailyResult?: {
    rarity: Rarity;
    imageUrl: string;
    message: string;
  } | null;
}

const props = defineProps<Props>();

// イベントエミット
const emit = defineEmits<{
  'card-opened': [card: CardData];
  'gacha-complete': [card: CardData];
}>();

// 状態管理
const gachaState = ref<GachaState>('idle');
const currentCard = ref<CardData | null>(null);
const spinTimeoutId = ref<number | null>(null);
const revealTimeoutId = ref<number | null>(null);

// CardDataを取得（優先順位: card > unopenedCards[0] > dailyResultから変換）
const availableCard = computed<CardData | null>(() => {
  if (props.card) {
    return props.card;
  }
  if (props.unopenedCards && props.unopenedCards.length > 0) {
    return props.unopenedCards[0];
  }
  if (props.dailyResult) {
    // dailyResultからCardDataに変換（簡易版）
    return {
      id: `gacha-${Date.now()}`,
      studentId: 'unknown',
      date: new Date().toISOString().split('T')[0],
      title: props.dailyResult.message || 'ガチャカード',
      description: props.dailyResult.message,
      imageUrl: props.dailyResult.imageUrl,
      rarity: props.dailyResult.rarity,
      isOpened: false,
    };
  }
  return null;
});

// ガチャが実行可能かどうか
const canSpin = computed(() => {
  return gachaState.value === 'idle' && availableCard.value !== null;
});

// レアリティ別の演出時間（ミリ秒）
const getRarityDuration = (rarity: Rarity): { spin: number; reveal: number } => {
  const durations = {
    UR: { spin: 2500, reveal: 2000 }, // 合計4.5秒
    SR: { spin: 2000, reveal: 2000 }, // 合計4秒
    RR: { spin: 1500, reveal: 2000 }, // 合計3.5秒
    R: { spin: 1000, reveal: 2000 },  // 合計3秒
    U: { spin: 500, reveal: 1500 },   // 合計2秒
    C: { spin: 500, reveal: 1000 },   // 合計1.5秒
  };
  return durations[rarity];
};

// ガチャを実行
const spinGacha = () => {
  if (!canSpin.value || !availableCard.value) return;

  const card = availableCard.value;
  currentCard.value = card;
  gachaState.value = 'spinning';

  // スピン中のタイマー
  const { spin, reveal } = getRarityDuration(card.rarity);
  spinTimeoutId.value = window.setTimeout(() => {
    gachaState.value = 'revealing';
    
    // レアリティ別のエフェクト
    if (['UR', 'SR'].includes(card.rarity)) {
      fireConfetti(card.rarity);
    }

    // 排出中のタイマー
    revealTimeoutId.value = window.setTimeout(() => {
      gachaState.value = 'opened';
      emit('card-opened', card);
      emit('gacha-complete', card);
    }, reveal);
  }, spin);
};

// ガチャをリセット
const resetGacha = () => {
  if (spinTimeoutId.value !== null) {
    clearTimeout(spinTimeoutId.value);
    spinTimeoutId.value = null;
  }
  if (revealTimeoutId.value !== null) {
    clearTimeout(revealTimeoutId.value);
    revealTimeoutId.value = null;
  }
  gachaState.value = 'idle';
  currentCard.value = null;
};

// 紙吹雪エフェクト
const fireConfetti = (rarity: Rarity) => {
  const colors = rarity === 'UR' 
    ? ['#9333EA', '#EC4899', '#F472B6', '#A855F7'] // 紫/ピンク系
    : ['#FF8C00', '#FF7F50', '#FF6347', '#FFA500']; // オレンジ系

  // メインの紙吹雪
  confetti({
    particleCount: rarity === 'UR' ? 250 : 200,
    spread: 70,
    origin: { y: 0.6 },
    colors: colors,
  });

  // URの場合は追加の紙吹雪
  if (rarity === 'UR') {
    setTimeout(() => {
      confetti({
        particleCount: 100,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });
      confetti({
        particleCount: 100,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      });
    }, 250);
  }
};

// レアリティ別のグローエフェクトスタイル
const getRarityGlowStyle = (rarity: Rarity) => {
  const glows = {
    UR: '0 0 70px 30px rgba(147, 51, 234, 0.9), 0 0 120px 50px rgba(236, 72, 153, 0.5)',
    SR: '0 0 50px 20px rgba(255, 140, 0, 0.8), 0 0 80px 35px rgba(255, 140, 0, 0.4)',
    RR: '0 0 40px 15px rgba(0, 102, 255, 0.7), 0 0 60px 30px rgba(0, 102, 255, 0.3)',
    R: '0 0 35px 12px rgba(0, 170, 0, 0.6), 0 0 50px 25px rgba(0, 170, 0, 0.3)',
    U: '0 0 25px 10px rgba(128, 128, 128, 0.5), 0 0 40px 20px rgba(128, 128, 128, 0.2)',
    C: '0 0 20px 8px rgba(160, 160, 160, 0.4), 0 0 30px 15px rgba(160, 160, 160, 0.2)',
  };
  return glows[rarity];
};

// レアリティ別のシェイク強度
const getShakeIntensity = (rarity: Rarity): string => {
  const intensities = {
    UR: 'shake-intense',
    SR: 'shake-strong',
    RR: 'shake-medium',
    R: 'shake-medium',
    U: 'shake-light',
    C: 'shake-light',
  };
  return intensities[rarity];
};

// キーボード操作対応
const handleKeyPress = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && canSpin.value) {
    spinGacha();
  } else if (e.key === 'Escape' && gachaState.value === 'opened') {
    resetGacha();
  }
};

// コンポーネントのクリーンアップ
import { onMounted, onUnmounted } from 'vue';
onMounted(() => {
  window.addEventListener('keydown', handleKeyPress);
});
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress);
  if (spinTimeoutId.value !== null) {
    clearTimeout(spinTimeoutId.value);
  }
  if (revealTimeoutId.value !== null) {
    clearTimeout(revealTimeoutId.value);
  }
});
</script>

<template>
  <div class="gacha-container" role="region" aria-label="ガチャマシン">
    <!-- 待機中・スピン中・排出中の表示 -->
    <div v-if="gachaState !== 'opened'" class="machine-wrapper">
      <!-- ガチャマシン -->
      <div 
        class="machine" 
        :class="{ 
          'shake-anim': gachaState === 'spinning',
          [currentCard ? getShakeIntensity(currentCard.rarity) : '']: gachaState === 'spinning' && currentCard
        }"
        :data-state="gachaState"
      >
        <div class="machine-body">
          <div class="machine-screen">
            <div class="screen-content">
              <div v-if="gachaState === 'idle'" class="idle-message">
                <div class="idle-icon">🎰</div>
                <p class="idle-text">ガチャマシン</p>
                <p class="idle-subtext">レバーを回してカードをゲット！</p>
              </div>
              <div v-else-if="gachaState === 'spinning'" class="spinning-message">
                <div class="spinning-icon">⚡</div>
                <p class="spinning-text">スキャン中...</p>
              </div>
              <div v-else-if="gachaState === 'revealing'" class="revealing-message">
                <div class="revealing-icon">✨</div>
                <p class="revealing-text">カード排出中...</p>
              </div>
            </div>
          </div>
          <div class="machine-lever" :class="{ 'lever-active': gachaState === 'spinning' }">
            <div class="lever-handle"></div>
          </div>
          <div class="machine-glow" :class="{ 'glow-active': gachaState === 'spinning' }"></div>
        </div>
      </div>

      <!-- ボタン -->
      <button 
        @click="spinGacha" 
        :disabled="!canSpin"
        class="spin-btn"
        :aria-label="canSpin ? 'ガチャを回す' : 'ガチャを回すことができません'"
        :aria-live="gachaState === 'spinning' || gachaState === 'revealing' ? 'polite' : 'off'"
      >
        <span v-if="gachaState === 'idle'">本日の結果をスキャン！</span>
        <span v-else-if="gachaState === 'spinning'">スキャン中...</span>
        <span v-else-if="gachaState === 'revealing'">排出中...</span>
      </button>

      <!-- 排出中のカード表示 -->
      <div v-if="gachaState === 'revealing' && currentCard" class="card-reveal-preview">
        <div 
          class="card-preview" 
          :data-rarity="currentCard.rarity"
          :style="{ boxShadow: getRarityGlowStyle(currentCard.rarity) }"
        >
          <div class="card-preview-glow"></div>
          <img 
            :src="currentCard.imageUrl" 
            :alt="currentCard.title"
            class="card-preview-image"
            loading="lazy"
            @error="(e) => { (e.target as HTMLImageElement).src = placeholders.cardU('Card'); }"
          />
          <div class="card-preview-rarity">{{ getRarityDisplayName(currentCard.rarity) }} ゲット！！</div>
        </div>
      </div>
    </div>

    <!-- 開封済みの表示（SsrCard.vueを使用） -->
    <div v-else-if="gachaState === 'opened' && currentCard" class="card-reveal-container">
      <div class="card-reveal-overlay" @click.self="resetGacha">
        <div class="card-reveal-content">
          <SsrCard :card="currentCard" />
          <button 
            @click="resetGacha" 
            class="close-btn"
            aria-label="カードを閉じる"
          >
            とじる
          </button>
        </div>
      </div>
    </div>

    <!-- エラー表示 -->
    <div v-if="!availableCard" class="error-message">
      <p>ガチャを回すカードがありません</p>
    </div>
  </div>
</template>

<style scoped>
.gacha-container {
  position: relative;
  width: 100%;
  min-height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

@media (min-width: 640px) {
  .gacha-container {
    min-height: 450px;
    padding: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .gacha-container {
    min-height: 500px;
    padding: 2rem;
  }
}

.machine-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  width: 100%;
  max-width: 600px;
}

/* ガチャマシンの本体 */
.machine {
  position: relative;
  width: 100%;
  max-width: 500px;
  aspect-ratio: 3 / 4;
  perspective: 1000px;
  will-change: transform;
}

.machine-body {
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  border-radius: 20px;
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.5),
    inset 0 0 40px rgba(0, 150, 255, 0.1),
    0 0 80px rgba(0, 150, 255, 0.2);
  overflow: hidden;
  border: 4px solid rgba(255, 255, 255, 0.1);
}

.machine-screen {
  position: absolute;
  top: 15%;
  left: 10%;
  width: 80%;
  height: 50%;
  background: linear-gradient(135deg, #000428 0%, #004e92 100%);
  border-radius: 15px;
  border: 3px solid rgba(0, 200, 255, 0.3);
  box-shadow: 
    inset 0 0 30px rgba(0, 0, 0, 0.8),
    0 0 20px rgba(0, 200, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.screen-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  text-align: center;
}

.idle-message,
.spinning-message,
.revealing-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.idle-icon,
.spinning-icon,
.revealing-icon {
  font-size: 3rem;
  animation: float 2s ease-in-out infinite;
}

@media (min-width: 640px) {
  .idle-icon,
  .spinning-icon,
  .revealing-icon {
    font-size: 3.5rem;
  }
}

@media (min-width: 1024px) {
  .idle-icon,
  .spinning-icon,
  .revealing-icon {
    font-size: 4rem;
  }
}

.spinning-icon {
  animation: spin-pulse 0.5s ease-in-out infinite;
}

.revealing-icon {
  animation: sparkle 1s ease-in-out infinite;
}

.idle-text,
.spinning-text,
.revealing-text {
  font-size: 1.5rem;
  font-weight: bold;
  color: #00d4ff;
  text-shadow: 0 0 10px rgba(0, 212, 255, 0.8);
}

.idle-subtext {
  font-size: 1rem;
  color: #88d4ff;
  text-shadow: 0 0 5px rgba(136, 212, 255, 0.6);
}

/* レバー */
.machine-lever {
  position: absolute;
  bottom: 10%;
  right: 15%;
  width: 60px;
  height: 120px;
  transform-origin: top center;
  transition: transform 0.3s ease;
}

.lever-handle {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
  border-radius: 30px;
  box-shadow: 
    0 5px 15px rgba(0, 0, 0, 0.3),
    inset 0 2px 5px rgba(255, 255, 255, 0.2);
  border: 3px solid rgba(255, 255, 255, 0.1);
  position: relative;
}

.lever-handle::before {
  content: '';
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 20px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
}

.lever-active {
  animation: lever-pull 0.5s ease-in-out infinite;
}

/* 光るエフェクト */
.machine-glow {
  position: absolute;
  inset: -10px;
  border-radius: 20px;
  background: radial-gradient(circle at center, rgba(0, 212, 255, 0.3) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.glow-active {
  opacity: 1;
  animation: glow-pulse 1s ease-in-out infinite;
}

/* シェイクアニメーション */
.shake-anim {
  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both infinite;
}

.shake-light {
  animation: shake-light 0.4s cubic-bezier(.36,.07,.19,.97) both infinite;
}

.shake-medium {
  animation: shake-medium 0.5s cubic-bezier(.36,.07,.19,.97) both infinite;
}

.shake-strong {
  animation: shake-strong 0.6s cubic-bezier(.36,.07,.19,.97) both infinite;
}

.shake-intense {
  animation: shake-intense 0.7s cubic-bezier(.36,.07,.19,.97) both infinite;
}

@keyframes shake {
  10%, 90% { transform: translate3d(-2px, 0, 0); }
  20%, 80% { transform: translate3d(4px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-6px, 0, 0); }
  40%, 60% { transform: translate3d(6px, 0, 0); }
}

@keyframes shake-light {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-3px, 0, 0); }
  40%, 60% { transform: translate3d(3px, 0, 0); }
}

@keyframes shake-medium {
  10%, 90% { transform: translate3d(-3px, 0, 0); }
  20%, 80% { transform: translate3d(6px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-8px, 0, 0); }
  40%, 60% { transform: translate3d(8px, 0, 0); }
}

@keyframes shake-strong {
  10%, 90% { transform: translate3d(-4px, 0, 0) rotate(-1deg); }
  20%, 80% { transform: translate3d(8px, 0, 0) rotate(1deg); }
  30%, 50%, 70% { transform: translate3d(-10px, 0, 0) rotate(-1deg); }
  40%, 60% { transform: translate3d(10px, 0, 0) rotate(1deg); }
}

@keyframes shake-intense {
  10%, 90% { transform: translate3d(-5px, 0, 0) rotate(-2deg); }
  20%, 80% { transform: translate3d(10px, 0, 0) rotate(2deg); }
  30%, 50%, 70% { transform: translate3d(-12px, 0, 0) rotate(-2deg); }
  40%, 60% { transform: translate3d(12px, 0, 0) rotate(2deg); }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes spin-pulse {
  0%, 100% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(180deg) scale(1.2); }
}

@keyframes sparkle {
  0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
  50% { transform: scale(1.3) rotate(180deg); opacity: 0.8; }
}

@keyframes lever-pull {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(-20deg); }
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* ボタン */
.spin-btn {
  padding: 1rem 2rem;
  min-height: 44px;
  min-width: 200px;
  font-size: 1rem;
  font-weight: bold;
  color: white;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 50px;
  cursor: pointer;
  box-shadow: 
    0 10px 30px rgba(102, 126, 234, 0.4),
    inset 0 2px 5px rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

@media (min-width: 640px) {
  .spin-btn {
    font-size: 1.125rem;
  }
}

@media (min-width: 1024px) {
  .spin-btn {
    font-size: 1.25rem;
  }
}

.spin-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.spin-btn:hover:not(:disabled)::before {
  width: 300px;
  height: 300px;
}

.spin-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 
    0 15px 40px rgba(102, 126, 234, 0.6),
    inset 0 2px 5px rgba(255, 255, 255, 0.3);
}

.spin-btn:active:not(:disabled) {
  transform: translateY(0);
}

.spin-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 排出中のカードプレビュー */
.card-reveal-preview {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
  animation: card-reveal-slide 0.5s ease-out;
}

.card-preview {
  position: relative;
  width: 280px;
  height: 420px;
  border-radius: 15px;
  overflow: hidden;
  animation: card-reveal-scale 0.5s ease-out;
}

.card-preview-glow {
  position: absolute;
  inset: -20px;
  border-radius: 15px;
  z-index: -1;
  animation: glow-pulse 1s ease-in-out infinite;
}

.card-preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-preview-rarity {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1rem;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.9), transparent);
  color: white;
  font-size: 1.5rem;
  font-weight: bold;
  text-align: center;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
}

@keyframes card-reveal-slide {
  from {
    transform: translate(-50%, 100%);
    opacity: 0;
  }
  to {
    transform: translate(-50%, -50%);
    opacity: 1;
  }
}

@keyframes card-reveal-scale {
  from {
    transform: scale(0.5);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* 開封済みのカード表示 */
.card-reveal-container {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fade-in 0.3s ease-out;
}

.card-reveal-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-reveal-content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  animation: scale-in 0.4s ease-out;
}

.close-btn {
  padding: 0.875rem 2rem;
  min-height: 44px;
  min-width: 120px;
  font-size: 1rem;
  font-weight: bold;
  color: white;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 50px;
  cursor: pointer;
  box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
}

@media (min-width: 640px) {
  .close-btn {
    font-size: 1.05rem;
  }
}

@media (min-width: 1024px) {
  .close-btn {
    font-size: 1.1rem;
  }
}


.close-btn:active {
  transform: translateY(0);
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scale-in {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* エラーメッセージ */
.error-message {
  padding: 2rem;
  text-align: center;
  color: #ff6b6b;
  font-size: 1.2rem;
  background: rgba(255, 107, 107, 0.1);
  border-radius: 10px;
  border: 2px solid rgba(255, 107, 107, 0.3);
}

/* レアリティ別のグローエフェクト（排出中プレビュー用） */
[data-rarity="UR"] .card-preview-glow {
  background: radial-gradient(circle at center, rgba(147, 51, 234, 0.7) 0%, transparent 70%);
}

[data-rarity="SR"] .card-preview-glow {
  background: radial-gradient(circle at center, rgba(255, 140, 0, 0.5) 0%, transparent 70%);
}

[data-rarity="RR"] .card-preview-glow {
  background: radial-gradient(circle at center, rgba(0, 102, 255, 0.4) 0%, transparent 70%);
}

[data-rarity="R"] .card-preview-glow {
  background: radial-gradient(circle at center, rgba(0, 170, 0, 0.3) 0%, transparent 70%);
}

[data-rarity="U"] .card-preview-glow {
  background: radial-gradient(circle at center, rgba(128, 128, 128, 0.2) 0%, transparent 70%);
}

[data-rarity="C"] .card-preview-glow {
  background: radial-gradient(circle at center, rgba(160, 160, 160, 0.15) 0%, transparent 70%);
}

/* アクセシビリティ: アニメーションを好まないユーザー向け */
@media (prefers-reduced-motion: reduce) {
  .shake-anim,
  .shake-light,
  .shake-medium,
  .shake-strong,
  .shake-intense {
    animation: none;
  }

  .idle-icon,
  .spinning-icon,
  .revealing-icon {
    animation: none;
  }

  .lever-active {
    animation: none;
  }

  .glow-active {
    animation: none;
  }

  .card-reveal-preview,
  .card-reveal-content {
    animation: none;
  }
}
</style>

