<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import confetti from 'canvas-confetti';
import type { CardData, Rarity } from '@/types/card';
import type { GachaState } from '@/types/gacha';
import SsrCard from './SsrCard.vue';
import GachaScene from './GachaScene.vue';
import { getRarityDisplayName } from '@/utils/rarity';
import { placeholders } from '@/utils/placeholder';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface Props {
  card?: CardData;
  unopenedCards?: CardData[];
  dailyResult?: {
    rarity: Rarity;
    imageUrl: string;
    message: string;
  } | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'card-opened': [card: CardData];
  'gacha-complete': [card: CardData];
}>();

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const gachaState = ref<GachaState>('idle');
const currentCard = ref<CardData | null>(null);
const spinTimeoutId = ref<number | null>(null);
const revealTimeoutId = ref<number | null>(null);

/** ダイヤルの累積回転角（CSSに渡す） */
const knobRotation = ref(0);

/** 未開封カードリストから選択されているカードID（unopenedCards 使用時） */
const selectedCardId = ref<string | null>(null);

// unopenedCards が変わったら選択を先頭に合わせる
watch(
  () => props.unopenedCards,
  (cards) => {
    if (!cards || cards.length === 0) {
      selectedCardId.value = null;
      return;
    }
    const currentId = selectedCardId.value;
    const stillExists = currentId && cards.some((c) => c.id === currentId);
    selectedCardId.value = stillExists ? currentId : cards[0].id;
  },
  { immediate: true }
);

const selectCard = (cardId: string) => {
  selectedCardId.value = cardId;
};

const availableCard = computed<CardData | null>(() => {
  if (props.card) return props.card;
  if (props.unopenedCards && props.unopenedCards.length > 0) {
    const id = selectedCardId.value;
    const found = id
      ? props.unopenedCards.find((c) => c.id === id)
      : props.unopenedCards[0];
    return found ?? props.unopenedCards[0];
  }
  if (props.dailyResult) {
    return {
      id: `gacha-${Date.now()}`,
      studentId: 'unknown',
      date: new Date().toISOString().split('T')[0],
      title: props.dailyResult.message || 'ガチャカード',
      description: props.dailyResult.message || '',
      imageUrl: props.dailyResult.imageUrl,
      rarity: (props.dailyResult.rarity as Rarity) || ('C' as Rarity),
      isOpened: false,
      type: 'typing',
    };
  }
  return null;
});

const isSceneActive = computed(() => {
  return gachaState.value === 'revealing' || gachaState.value === 'opened';
});

const canSpin = computed(() => {
  return gachaState.value === 'idle' && availableCard.value !== null;
});

/** ガチャを回せる回数（表示用）。ホームの通知バッジと一致させる */
const spinCount = computed(() => {
  if (props.unopenedCards && props.unopenedCards.length > 0) {
    return props.unopenedCards.length;
  }
  if (props.card || props.dailyResult) {
    return 1;
  }
  return 0;
});

/** ディスプレイ用カード一覧（レアリティボタン表示・単一カード時も1件表示） */
const displayCards = computed<CardData[]>(() => {
  if (props.unopenedCards && props.unopenedCards.length > 0) {
    return props.unopenedCards;
  }
  if (props.card) {
    return [props.card];
  }
  if (props.dailyResult) {
    return [
      {
        id: `gacha-daily-${props.dailyResult.rarity}`,
        studentId: 'unknown',
        date: new Date().toISOString().split('T')[0],
        title: props.dailyResult.message || 'ガチャカード',
        description: props.dailyResult.message || '',
        imageUrl: props.dailyResult.imageUrl,
        rarity: (props.dailyResult.rarity as Rarity) || ('C' as Rarity),
        isOpened: false,
        type: 'typing',
      },
    ];
  }
  return [];
});

// ---------------------------------------------------------------------------
// Rarity Durations
// ---------------------------------------------------------------------------
const getRarityDuration = (rarity: Rarity): { spin: number; reveal: number } => {
  const durations: Record<Rarity, { spin: number; reveal: number }> = {
    UR: { spin: 2500, reveal: 2000 },
    SR: { spin: 2000, reveal: 2000 },
    RR: { spin: 1500, reveal: 2000 },
    R: { spin: 1000, reveal: 2000 },
    U: { spin: 500, reveal: 1500 },
    C: { spin: 500, reveal: 1000 },
  };
  return durations[rarity];
};

// ---------------------------------------------------------------------------
// Spin / Reset
// ---------------------------------------------------------------------------
const spinGacha = () => {
  if (!canSpin.value || !availableCard.value) return;

  const card = availableCard.value;
  currentCard.value = card;
  gachaState.value = 'spinning';

  // ダイヤルを回転開始（CSSアニメーションでも回すが角度を記録）
  knobRotation.value += 720;

  const { spin, reveal } = getRarityDuration(card.rarity || 'C');
  spinTimeoutId.value = window.setTimeout(() => {
    gachaState.value = 'revealing';
    fireConfetti(card.rarity || 'C');

    revealTimeoutId.value = window.setTimeout(() => {
      gachaState.value = 'opened';
      fireConfettiOnOpened(card.rarity || 'C');
      emit('card-opened', card);
      emit('gacha-complete', card);
    }, reveal);
  }, spin);
};

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

// ---------------------------------------------------------------------------
// Confetti (unchanged logic, all rarities)
// ---------------------------------------------------------------------------
const CONFETTI_Z_INDEX = 3000;

interface ConfettiSettings {
  colors: string[];
  particleCount: number;
  spread: number;
  startVelocity: number;
  scalar?: number;
  gravity?: number;
  drift?: number;
  hasSideCannon: boolean;
  slowFallCount: number;
}

const getConfettiSettings = (rarity: Rarity): ConfettiSettings => {
  const profiles: Record<Rarity, ConfettiSettings> = {
    UR: {
      colors: ['#FFD700', '#FFFFFF', '#FF69B4', '#9333EA', '#EC4899', '#FBBF24'],
      particleCount: 280, spread: 100, startVelocity: 38,
      scalar: 1.2, gravity: 0.8, drift: 0,
      hasSideCannon: true, slowFallCount: 120,
    },
    SR: {
      colors: ['#EA580C', '#FF8C00', '#FF7F50', '#FBBF24', '#FFA500', '#FFD54F'],
      particleCount: 200, spread: 85, startVelocity: 35,
      scalar: 1.1, gravity: 0.9, drift: 0,
      hasSideCannon: true, slowFallCount: 90,
    },
    RR: {
      colors: ['#0066FF', '#00AAFF', '#4FC3F7', '#81D4FA', '#B3E5FC'],
      particleCount: 150, spread: 75, startVelocity: 32,
      scalar: 1, gravity: 1, drift: 0,
      hasSideCannon: true, slowFallCount: 60,
    },
    R: {
      colors: ['#00AA44', '#22C55E', '#4ADE80', '#86EFAC', '#BBF7D0'],
      particleCount: 120, spread: 65, startVelocity: 28,
      scalar: 1, gravity: 1, drift: 0,
      hasSideCannon: false, slowFallCount: 50,
    },
    U: {
      colors: ['#facc15', '#eab308', '#fef08a', '#fde047', '#fef9c3'],
      particleCount: 80, spread: 55, startVelocity: 24,
      scalar: 0.9, gravity: 1.1, drift: 0,
      hasSideCannon: false, slowFallCount: 35,
    },
    C: {
      colors: ['#94A3B8', '#CBD5E1', '#E2E8F0', '#F1F5F9', '#9CA3AF'],
      particleCount: 55, spread: 50, startVelocity: 22,
      scalar: 0.85, gravity: 1.2, drift: 0,
      hasSideCannon: false, slowFallCount: 25,
    },
  };
  return profiles[rarity];
};

const fireConfettiWave1 = (rarity: Rarity) => {
  const s = getConfettiSettings(rarity);
  confetti({
    particleCount: s.particleCount, spread: s.spread,
    origin: { y: 0.6 }, startVelocity: s.startVelocity,
    colors: s.colors, zIndex: CONFETTI_Z_INDEX,
    scalar: s.scalar ?? 1, gravity: s.gravity ?? 1, drift: s.drift ?? 0,
  });
};

const fireConfettiWave2 = (rarity: Rarity) => {
  const s = getConfettiSettings(rarity);
  if (!s.hasSideCannon) return;
  const count = Math.floor(s.particleCount * 0.4);
  const opts = {
    particleCount: count, angle: 60, spread: 55,
    origin: { x: 0, y: 0.55 }, startVelocity: 28,
    colors: s.colors, zIndex: CONFETTI_Z_INDEX,
    scalar: s.scalar ?? 1, gravity: s.gravity ?? 1,
  };
  confetti(opts);
  confetti({ ...opts, angle: 120, origin: { x: 1, y: 0.55 } });
};

const fireConfettiWave3 = (rarity: Rarity) => {
  const s = getConfettiSettings(rarity);
  if (s.slowFallCount <= 0) return;
  confetti({
    particleCount: s.slowFallCount, spread: 100,
    origin: { y: 0 }, startVelocity: 15,
    colors: s.colors, zIndex: CONFETTI_Z_INDEX,
    scalar: (s.scalar ?? 1) * 0.9, gravity: 0.6, drift: 0.5,
  });
};

const fireConfetti = (rarity: Rarity) => {
  fireConfettiWave1(rarity);
  setTimeout(() => fireConfettiWave2(rarity), 220);
  setTimeout(() => fireConfettiWave3(rarity), 450);
};

const fireConfettiOnOpened = (rarity: Rarity) => {
  const s = getConfettiSettings(rarity);
  const count = Math.max(40, Math.floor(s.particleCount * 0.35));
  const opts = {
    particleCount: count, angle: 60, spread: 58,
    origin: { x: 0, y: 0.5 }, startVelocity: 26,
    colors: s.colors, zIndex: CONFETTI_Z_INDEX,
    scalar: s.scalar ?? 1, gravity: s.gravity ?? 1,
  };
  confetti(opts);
  confetti({ ...opts, angle: 120, origin: { x: 1, y: 0.5 } });
};

// ---------------------------------------------------------------------------
// Rarity visual helpers
// ---------------------------------------------------------------------------
const getRarityGlowStyle = (rarity: Rarity) => {
  const glows: Record<Rarity, string> = {
    UR: '0 0 70px 30px rgba(147,51,234,0.9), 0 0 120px 50px rgba(236,72,153,0.5)',
    SR: '0 0 50px 20px rgba(255,140,0,0.8), 0 0 80px 35px rgba(255,140,0,0.4)',
    RR: '0 0 40px 15px rgba(0,102,255,0.7), 0 0 60px 30px rgba(0,102,255,0.3)',
    R: '0 0 35px 12px rgba(0,170,0,0.6), 0 0 50px 25px rgba(0,170,0,0.3)',
    U: '0 0 25px 10px rgba(234,179,8,0.5), 0 0 40px 20px rgba(234,179,8,0.2)',
    C: '0 0 20px 8px rgba(128,128,128,0.4), 0 0 30px 15px rgba(128,128,128,0.2)',
  };
  return glows[rarity];
};

const getShakeIntensity = (rarity: Rarity): string => {
  const intensities: Record<Rarity, string> = {
    UR: 'shake-intense',
    SR: 'shake-strong',
    RR: 'shake-medium',
    R: 'shake-medium',
    U: 'shake-light',
    C: 'shake-light',
  };
  return intensities[rarity];
};

// ---------------------------------------------------------------------------
// Keyboard
// ---------------------------------------------------------------------------
const handleKeyPress = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && canSpin.value) spinGacha();
  else if (e.key === 'Escape' && gachaState.value === 'opened') resetGacha();
};

onMounted(() => window.addEventListener('keydown', handleKeyPress));
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress);
  if (spinTimeoutId.value !== null) clearTimeout(spinTimeoutId.value);
  if (revealTimeoutId.value !== null) clearTimeout(revealTimeoutId.value);
});
</script>

<template>
  <div class="gacha-container" role="region" aria-label="ガチャマシン">
    <!-- ===== Machine (idle / spinning / revealing) ===== -->
    <div v-if="gachaState !== 'opened'" class="machine-wrapper">
      <div
        class="machine-outer"
        :class="{
          [currentCard ? getShakeIntensity(currentCard.rarity || 'C') : 'shake-light']:
            gachaState === 'spinning' && currentCard,
        }"
      >
        <!-- ── Header bar ────────────────────────────── -->
        <div class="machine-header">
          <div class="header-lamps">
            <div
              class="lamp lamp-red"
              :class="{ 'lamp-blink': gachaState === 'spinning' }"
            ></div>
            <div class="lamp lamp-green"></div>
            <div
              class="lamp lamp-yellow"
              :class="{ 'lamp-blink': gachaState === 'revealing' }"
            ></div>
          </div>
          <span class="header-title">CAMPUS CLUB SYSTEM</span>
          <span class="header-star">⭐</span>
        </div>

        <!-- ── Display Window ────────────────────────── -->
        <div class="display-window">
          <!-- Glass reflections -->
          <div class="glass-reflect-tl" aria-hidden="true"></div>
          <div class="glass-reflect-tr" aria-hidden="true"></div>

          <div class="display-inner">
            <!-- Background blurs -->
            <div class="blob blob-orange" aria-hidden="true"></div>
            <div class="blob blob-yellow" aria-hidden="true"></div>

            <!-- Idle: カードあり時は中央揃え（複数なら選択ボタン）、カードなし時はエラー表示 -->
            <div v-if="gachaState === 'idle'" class="display-content display-idle">
              <template v-if="availableCard">
                <div class="idle-content idle-has-cards">
                  <span class="badge-new">きょうのカード!</span>
                  <h2 class="display-brand">キャンパスロット</h2>
                  <div v-if="displayCards.length > 0" class="idle-card-selector">
                    <button
                      v-for="card in displayCards"
                      :key="card.id"
                      type="button"
                      @click="selectCard(card.id)"
                      :class="['display-select-btn', displayCards.length === 1 || selectedCardId === card.id ? 'active' : '']"
                      :aria-pressed="displayCards.length === 1 || selectedCardId === card.id"
                    >
                      {{ getRarityDisplayName(card.rarity || 'C') }}
                    </button>
                  </div>
                  <p class="series-label">Series 1</p>
                </div>
              </template>
              <template v-else>
                <div class="idle-content idle-error">
                  <p class="idle-error-icon" aria-hidden="true">🎴</p>
                  <p class="idle-error-message">きょうのガチャはまだないよ</p>
                  <p class="idle-error-hint">またあしたきてね!</p>
                </div>
              </template>
            </div>

            <!-- Spinning -->
            <div v-else-if="gachaState === 'spinning'" class="display-content display-spinning">
              <div class="spinner-ring-box">
                <div class="spinner-ring"></div>
                <span class="spinner-icon">⚡</span>
              </div>
              <p class="display-status">スキャンちゅう...</p>
            </div>

            <!-- Revealing -->
            <div v-else-if="gachaState === 'revealing'" class="display-content display-revealing">
              <div class="reveal-flash" aria-hidden="true"></div>
              <span class="reveal-icon">✨</span>
              <p class="display-status">カードはいしゅつ!!</p>
            </div>
          </div>
        </div>

        <!-- ── Control Panel ─────────────────────────── -->
        <div class="control-panel">
          <!-- Left: status + token -->
          <div class="ctrl-left">
            <div class="status-box">
              <p class="status-line">
                <span class="status-face" :class="{ 'bounce-anim': gachaState === 'idle' }">😆</span>
                <span v-if="gachaState === 'idle'" class="status-main">あそべるよ!</span>
                <span v-else-if="gachaState === 'spinning'" class="status-main">スキャンちゅう...</span>
                <span v-else-if="gachaState === 'revealing'" class="status-main">でてくるよ!</span>
              </p>
              <p class="status-hint">
                <template v-if="gachaState === 'idle'">ダイヤルをまわしてね!</template>
                <template v-else>まっててね...</template>
              </p>
            </div>
            <div class="token-row">
              <div class="token-badge">
                <span class="token-num">{{ spinCount }}</span>
                <span class="token-unit">かい</span>
              </div>
              <span class="token-hint">あつめて<br />コンプ!</span>
            </div>
          </div>

          <!-- Right: coin slot + knob -->
          <div class="ctrl-right">
            <div class="ctrl-top-row">
              <!-- Coin slot -->
              <div
                class="coin-slot"
                role="button"
                tabindex="0"
                :aria-label="canSpin ? 'コインをいれる' : 'コインをいれられません'"
                @click="spinGacha"
                @keydown.enter="spinGacha"
                :class="{ 'slot-disabled': !canSpin }"
              >
                <div class="coin-slit"></div>
                <div class="coin-tooltip">コインをいれてね</div>
              </div>

              <!-- Eject (reset) button -->
              <button
                class="eject-btn"
                :disabled="gachaState === 'idle'"
                @click="resetGacha"
                aria-label="リセット"
              >
                <span>✕</span>
              </button>
            </div>

            <!-- Dial Knob -->
            <div
              class="knob-wrapper"
              role="button"
              tabindex="0"
              :aria-label="canSpin ? 'ダイヤルをまわす' : 'ダイヤルをまわせません'"
              @click="spinGacha"
              @keydown.enter="spinGacha"
              :class="{ 'knob-disabled': !canSpin }"
            >
              <div class="knob-housing">
                <div
                  class="knob-body"
                  :class="{
                    'knob-spin-anim': gachaState === 'spinning',
                    'knob-done-anim': gachaState === 'revealing',
                  }"
                  :style="{ '--knob-rotation': knobRotation + 'deg' }"
                >
                  <div class="knob-dotted-border" aria-hidden="true"></div>
                  <div class="knob-center-cap">
                    <div class="knob-cap-groove"></div>
                  </div>
                  <div class="knob-cross-arm" aria-hidden="true">
                    <div class="arm-dot"></div>
                    <div class="arm-dot"></div>
                  </div>
                  <span class="knob-arrow-icon" aria-hidden="true">↻</span>
                </div>
              </div>
              <p class="knob-label">
                <template v-if="canSpin">まわしてね!</template>
                <template v-else-if="gachaState === 'spinning'">ぐるぐる〜</template>
                <template v-else>おまちください</template>
              </p>
            </div>
          </div>
        </div>

        <!-- ── Output Slot (card ejection port) ──────── -->
        <div class="output-slot">
          <div class="output-groove">
            <div
              class="output-light"
              :class="{ 'light-pulse': gachaState === 'revealing' }"
              aria-hidden="true"
            ></div>
          </div>
          <div class="output-tray">
            <div class="tray-line"></div>
          </div>
        </div>

        <!-- ── Decorative sticker ────────────────────── -->
        <div class="deco-sticker" aria-hidden="true">
          ⭐ レアカードをゲット! ⭐
        </div>

        <!-- ── Side vents ────────────────────────────── -->
        <div class="side-vents" aria-hidden="true">
          <div class="vent"></div>
          <div class="vent"></div>
          <div class="vent"></div>
          <div class="vent"></div>
        </div>
      </div>

      <!-- Three.js scene (behind machine) -->
      <GachaScene :isActive="isSceneActive" :rarity="currentCard?.rarity" />

      <!-- Revealing card preview (floating overlay) -->
      <Transition name="card-pop">
        <div v-if="gachaState === 'revealing' && currentCard" class="card-reveal-preview">
          <div
            class="card-preview"
            :data-rarity="currentCard.rarity || 'C'"
            :style="{ boxShadow: getRarityGlowStyle(currentCard.rarity || 'C') }"
          >
            <div class="card-preview-glow"></div>
            <img
              :src="currentCard.imageUrl"
              :alt="currentCard.title"
              class="card-preview-image"
              loading="lazy"
              @error="(e) => { (e.target as HTMLImageElement).src = placeholders.cardU('Card'); }"
            />
            <div class="card-preview-rarity">
              {{ getRarityDisplayName(currentCard.rarity || 'C') }} ゲット!!
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- ===== Opened state (full-screen SsrCard overlay) ===== -->
    <div v-else-if="gachaState === 'opened' && currentCard" class="card-reveal-container">
      <div class="card-reveal-overlay" @click.self="resetGacha">
        <GachaScene :isActive="true" :rarity="currentCard.rarity" class="card-reveal-scene" />
        <div class="card-reveal-content">
          <div class="card-reveal-card-wrapper">
            <SsrCard :card="currentCard" />
          </div>
          <button @click="resetGacha" class="close-btn" aria-label="カードをとじる">
            とじる
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* =========================================================================
   DESIGN SYSTEM — Carddass-style TCG Vending Machine
   Primary Blue #3B82F6 | Accent Yellow #F59E0B | Base Cream #FFFBEB
   ========================================================================= */

/* --- Container ---------------------------------------------------------- */
.gacha-container {
  position: relative;
  width: 100%;
  min-height: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  font-family: 'Fredoka', 'Rounded Mplus 1c', 'Hiragino Maru Gothic ProN', sans-serif;
}

@media (min-width: 640px) {
  .gacha-container { min-height: 480px; padding: 1.5rem; }
}
@media (min-width: 1024px) {
  .gacha-container { min-height: 540px; padding: 2rem; }
}

/* --- Machine wrapper ---------------------------------------------------- */
.machine-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 580px;
  z-index: 1;
}

/* --- Machine outer body ------------------------------------------------- */
.machine-outer {
  position: relative;
  width: 100%;
  background: #3B82F6;
  border-radius: 2.5rem;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  /* Neumorphic toy plastic feel */
  border-top: 2px solid rgba(255, 255, 255, 0.4);
  border-left: 2px solid rgba(255, 255, 255, 0.4);
  border-bottom: 4px solid rgba(30, 64, 175, 0.25);
  border-right: 4px solid rgba(30, 64, 175, 0.25);
  box-shadow:
    inset 10px 10px 20px rgba(255, 255, 255, 0.2),
    inset -10px -10px 20px rgba(0, 0, 0, 0.2),
    20px 20px 60px rgba(0, 0, 0, 0.15);
  will-change: transform;
}

/* ========================================================================
   HEADER BAR
   ======================================================================== */
.machine-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #2563EB;
  height: 3.5rem;
  border-radius: 0.75rem 0.75rem 0 0;
  margin: 0.5rem 0.5rem 0;
  padding: 0 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.15);
}

.header-lamps {
  display: flex;
  gap: 0.5rem;
}

.lamp {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.3);
}
.lamp-red   { background: #f87171; }
.lamp-green { background: #4ade80; }
.lamp-yellow { background: #facc15; }

.lamp-blink {
  animation: lamp-blink 0.6s ease-in-out infinite alternate;
}

@keyframes lamp-blink {
  0%   { opacity: 0.4; transform: scale(0.9); }
  100% { opacity: 1;   transform: scale(1.15); box-shadow: 0 0 8px currentColor; }
}

.header-title {
  color: rgba(255, 255, 255, 0.8);
  font-weight: 900;
  letter-spacing: 0.08em;
  font-size: 0.8rem;
  text-transform: uppercase;
}

.header-star {
  font-size: 1.1rem;
}

/* ========================================================================
   DISPLAY WINDOW
   ======================================================================== */
.display-window {
  position: relative;
  background: #2d3748;
  border-radius: 1rem;
  border: 4px solid #fff;
  margin: 0 1rem;
  overflow: hidden;
  height: 300px;
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.5);
}

@media (min-width: 640px) {
  .display-window { height: 340px; }
}

/* Glass reflections */
.glass-reflect-tl {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom right, rgba(255, 255, 255, 0.1), transparent 40%);
  pointer-events: none;
  z-index: 20;
}
.glass-reflect-tr {
  position: absolute;
  top: 0; right: 0;
  width: 8rem; height: 8rem;
  background: radial-gradient(ellipse at top right, rgba(255, 255, 255, 0.1), transparent 70%);
  border-bottom-left-radius: 100%;
  pointer-events: none;
  z-index: 20;
}

.display-inner {
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(to bottom, #38bdf8, #4f46e5);
  overflow: hidden;
}

/* Background decorative blurs */
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(40px);
  opacity: 0.3;
  pointer-events: none;
}
.blob-orange { width: 8rem; height: 8rem; background: #fb923c; top: 2rem; left: 2rem; }
.blob-yellow { width: 10rem; height: 10rem; background: #fde047; bottom: 4rem; right: 2rem; }

/* Common display content */
.display-content {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

/* ---- Idle state: 中央揃えレイアウト ---- */
.display-idle {
  padding: 1rem;
}

.idle-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
  max-width: 100%;
}

.idle-has-cards {
  animation: idle-breathe 4s ease-in-out infinite;
}

@keyframes idle-breathe {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.98; transform: scale(1.01); }
}

.badge-new {
  display: inline-block;
  background: #facc15;
  color: #1e3a5f;
  font-size: 1.05rem; /* 0.7rem × 1.5 */
  font-weight: 900;
  padding: 0.375rem 1.125rem; /* 0.25/0.75 × 1.5 */
  border-radius: 9999px;
  letter-spacing: 0.05em;
  border: 3px solid #fff; /* 2px × 1.5 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  animation: badge-pulse 2s ease-in-out infinite;
}

@keyframes badge-pulse {
  0%, 100% { box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2); }
  50%      { box-shadow: 0 0 16px rgba(250, 204, 21, 0.5), 0 2px 8px rgba(0, 0, 0, 0.2); }
}

.display-brand {
  color: #fff;
  font-size: 2.625rem; /* 1.75rem × 1.5 */
  font-weight: 900;
  font-style: italic;
  letter-spacing: -0.02em;
  line-height: 1.1;
  text-align: center;
  text-shadow: 0 4px 0 rgba(0, 0, 0, 0.3), 0 0 24px rgba(253, 224, 71, 0.2);
  animation: brand-glow 3s ease-in-out infinite;
}
@media (min-width: 640px) {
  .display-brand { font-size: 3rem; } /* 2rem × 1.5 */
}
@keyframes brand-glow {
  0%, 100% { text-shadow: 0 4px 0 rgba(0, 0, 0, 0.3), 0 0 24px rgba(253, 224, 71, 0.2); }
  50%      { text-shadow: 0 4px 0 rgba(0, 0, 0, 0.3), 0 0 32px rgba(253, 224, 71, 0.35), 0 0 48px rgba(253, 224, 71, 0.15); }
}
.brand-accent {
  color: #fde047;
}

.idle-card-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem; /* 0.4rem × 1.5 */
  justify-content: center;
  margin: 0.375rem 0; /* 0.25rem × 1.5 */
}

.display-select-btn {
  padding: 0.6rem 1.125rem; /* 0.4/0.75 × 1.5 */
  font-size: 1.05rem; /* 0.7rem × 1.5 */
  font-weight: 700;
  font-family: inherit;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(30, 27, 75, 0.5);
  border: 3px solid rgba(255, 255, 255, 0.35); /* 2px × 1.5 */
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(6px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}
.display-select-btn:hover {
  background: rgba(59, 130, 246, 0.4);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}
.display-select-btn.active {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.9), rgba(118, 75, 162, 0.9));
  border-color: rgba(255, 255, 255, 0.6);
  color: #fff;
  box-shadow: 0 0 20px rgba(102, 126, 234, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.series-label {
  color: rgba(255, 255, 255, 0.95);
  font-size: 1.125rem; /* 0.75rem × 1.5 */
  font-weight: 700;
  background: rgba(59, 130, 246, 0.5);
  padding: 0.3rem 0.9rem; /* 0.2/0.6 × 1.5 */
  border-radius: 0.375rem; /* 0.25rem × 1.5 */
  backdrop-filter: blur(4px);
  border: 2px solid rgba(255, 255, 255, 0.2); /* 1px × 1.5 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* ---- Idle エラー表示（ディスプレイ内） ---- */
.idle-error {
  text-align: center;
  padding: 1.5rem 1rem;
  background: linear-gradient(180deg, rgba(30, 27, 75, 0.85), rgba(30, 27, 75, 0.7));
  border: 2px solid rgba(248, 113, 113, 0.4);
  border-radius: 1rem;
  box-shadow: inset 0 0 24px rgba(248, 113, 113, 0.08), 0 0 20px rgba(0, 0, 0, 0.2);
  max-width: 85%;
  animation: idle-error-glow 2.5s ease-in-out infinite;
}

@keyframes idle-error-glow {
  0%, 100% { border-color: rgba(248, 113, 113, 0.4); box-shadow: inset 0 0 24px rgba(248, 113, 113, 0.08), 0 0 20px rgba(0, 0, 0, 0.2); }
  50%      { border-color: rgba(248, 113, 113, 0.6); box-shadow: inset 0 0 28px rgba(248, 113, 113, 0.12), 0 0 24px rgba(0, 0, 0, 0.25); }
}

.idle-error-icon {
  font-size: 2.5rem;
  margin: 0 0 0.5rem;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
}

.idle-error-message {
  color: #fca5a5;
  font-size: 1rem;
  font-weight: 800;
  margin: 0;
  text-shadow: 0 0 12px rgba(248, 113, 113, 0.4), 0 2px 0 rgba(0, 0, 0, 0.3);
}

.idle-error-hint {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.8rem;
  font-weight: 600;
  margin: 0.5rem 0 0;
}

/* ---- Spinning state ---- */
.display-spinning {
  gap: 1.25rem;
}

.spinner-ring-box {
  position: relative;
  width: 6rem;
  height: 6rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner-ring {
  position: absolute;
  inset: 0;
  border: 4px solid rgba(255, 255, 255, 0.15);
  border-top-color: #fde047;
  border-right-color: #fde047;
  border-radius: 50%;
  animation: spin-ring 0.7s linear infinite;
}
@keyframes spin-ring {
  to { transform: rotate(360deg); }
}

.spinner-icon {
  font-size: 2.5rem;
  animation: pulse-scale 0.6s ease-in-out infinite alternate;
}
@keyframes pulse-scale {
  0%   { transform: scale(1);   }
  100% { transform: scale(1.25); }
}

.display-status {
  color: #fff;
  font-size: 1.4rem;
  font-weight: 800;
  text-shadow: 0 0 16px rgba(253, 224, 71, 0.8), 0 2px 0 rgba(0, 0, 0, 0.3);
  letter-spacing: 0.04em;
}

/* ---- Revealing state ---- */
.display-revealing {
  gap: 1rem;
}

.reveal-flash {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(255, 255, 255, 0.7), transparent 70%);
  animation: flash-burst 0.6s ease-out forwards;
  pointer-events: none;
}
@keyframes flash-burst {
  0%   { opacity: 1; transform: scale(0.5); }
  100% { opacity: 0; transform: scale(2); }
}

.reveal-icon {
  font-size: 4rem;
  animation: sparkle-rotate 1s ease-in-out infinite;
}
@keyframes sparkle-rotate {
  0%, 100% { transform: scale(1) rotate(0deg);   opacity: 1;   }
  50%      { transform: scale(1.3) rotate(180deg); opacity: 0.8; }
}

/* ========================================================================
   CONTROL PANEL
   ======================================================================== */
.control-panel {
  display: flex;
  gap: 1.5rem;
  background: #fff;
  border-radius: 1rem;
  margin: 0 1rem 0.5rem;
  padding: 1.25rem;
  box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.05);
  border: 2px solid #dbeafe;
}

/* Left column */
.ctrl-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1rem;
}

.status-box {
  background: #eff6ff;
  padding: 0.75rem;
  border-radius: 0.75rem;
  border: 1px solid #dbeafe;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.status-line {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: #2563EB;
  font-weight: 700;
  font-size: 0.85rem;
  line-height: 1.3;
}
.status-face { font-size: 1rem; }
.status-main { white-space: nowrap; }

.status-hint {
  color: #93c5fd;
  font-weight: 500;
  font-size: 0.7rem;
  margin-top: 0.25rem;
}

.token-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.token-badge {
  background: #facc15;
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
  box-shadow: 0 4px 0 #b45309;
  border: 2px solid #eab308;
  transform: rotate(-2deg);
  display: flex;
  align-items: baseline;
  gap: 0.2rem;
}
.token-num  { color: #1e3a8a; font-weight: 900; font-size: 1.25rem; }
.token-unit { color: #1e3a8a; font-weight: 700; font-size: 0.65rem; }

.token-hint {
  font-size: 0.6rem;
  color: #93c5fd;
  font-weight: 700;
  line-height: 1.3;
  text-transform: uppercase;
  max-width: 5rem;
}

/* Right column */
.ctrl-right {
  width: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  border-left: 2px dashed #dbeafe;
  padding-left: 1.5rem;
}

.ctrl-top-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  justify-content: center;
}

/* ---- Coin slot ---- */
.coin-slot {
  position: relative;
  height: 4rem;
  width: 2rem;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.15s;
  /* Chrome metallic */
  background: linear-gradient(135deg, #e0e0e0 0%, #ffffff 50%, #999999 100%);
  border: 2px solid #888;
  box-shadow:
    3px 3px 8px rgba(0, 0, 0, 0.15),
    -2px -2px 6px rgba(255, 255, 255, 0.6);
}
.coin-slot:active:not(.slot-disabled) {
  transform: scale(0.95);
}
.slot-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.coin-slit {
  width: 0.35rem;
  height: 2.5rem;
  background: #222;
  border-radius: 9999px;
  box-shadow: inset 0 0 4px rgba(0, 0, 0, 1);
}

.coin-tooltip {
  position: absolute;
  top: -2.5rem;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  background: #2563EB;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.25rem 0.65rem;
  border-radius: 9999px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}
.coin-slot:hover .coin-tooltip {
  opacity: 1;
}

/* ---- Eject button ---- */
.eject-btn {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: #ef4444;
  color: #fff;
  font-weight: 900;
  font-size: 0.9rem;
  border: 2px solid #dc2626;
  box-shadow: 0 4px 0 #991b1b;
  cursor: pointer;
  transition: all 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.eject-btn:active:not(:disabled) {
  box-shadow: none;
  transform: translateY(2px);
}
.eject-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* ---- Dial Knob ---- */
.knob-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: grab;
  margin-top: 0.25rem;
}
.knob-wrapper:active {
  cursor: grabbing;
}
.knob-disabled {
  opacity: 0.5;
  cursor: not-allowed !important;
}

.knob-housing {
  width: 6rem;
  height: 6rem;
  border-radius: 50%;
  background: #dbeafe;
  box-shadow:
    inset 0 2px 5px rgba(255, 255, 255, 1),
    inset 0 -2px 5px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4px solid #fff;
}

.knob-body {
  width: 5rem;
  height: 5rem;
  border-radius: 50%;
  background: linear-gradient(145deg, #FFD700, #FFA500);
  box-shadow:
    5px 5px 10px rgba(0, 0, 0, 0.2),
    -5px -5px 10px rgba(255, 255, 255, 0.3);
  border: 2px solid rgba(202, 138, 4, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.knob-spin-anim {
  animation: knob-rotate 0.8s linear infinite;
}
.knob-done-anim {
  transform: rotate(var(--knob-rotation, 720deg));
}

@keyframes knob-rotate {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.knob-dotted-border {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 6px dotted rgba(255, 255, 255, 0.4);
}

.knob-center-cap {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: #fff;
  box-shadow: inset 1px 1px 2px rgba(0, 0, 0, 0.1);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}
.knob-cap-groove {
  width: 1rem;
  height: 0.25rem;
  background: #e5e7eb;
  border-radius: 9999px;
}

.knob-cross-arm {
  position: absolute;
  height: 1.25rem;
  width: 110%;
  background: #fb923c;
  border-radius: 9999px;
  transform: rotate(45deg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0.25rem;
  border: 1px solid #ea580c;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  z-index: 0;
}
.arm-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
}

.knob-arrow-icon {
  position: absolute;
  top: -0.15rem;
  color: rgba(255, 255, 255, 0.6);
  font-size: 1.25rem;
  font-weight: 900;
  transform: rotate(45deg);
  z-index: 5;
}

.knob-label {
  text-align: center;
  font-size: 0.6rem;
  font-weight: 700;
  color: #93c5fd;
  margin-top: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: rgba(255, 255, 255, 0.5);
  padding: 0.1rem 0.5rem;
  border-radius: 9999px;
}

/* ========================================================================
   OUTPUT SLOT (card ejection port)
   ======================================================================== */
.output-slot {
  margin: 0 2rem 1.5rem;
  position: relative;
  z-index: 0;
}

.output-groove {
  height: 1.25rem;
  background: #1e3a8a;
  border-radius: 9999px;
  border-bottom: 2px solid #172554;
  box-shadow: inset 0 5px 10px rgba(0, 0, 0, 0.5);
  position: relative;
  overflow: hidden;
}

.output-light {
  position: absolute;
  top: 0.25rem;
  left: 50%;
  transform: translateX(-50%);
  width: 8rem;
  height: 0.375rem;
  background: rgba(250, 204, 21, 0.3);
  border-radius: 9999px;
}
.light-pulse {
  animation: output-glow 0.5s ease-in-out infinite alternate;
}
@keyframes output-glow {
  0%   { opacity: 0.3; }
  100% { opacity: 1; box-shadow: 0 0 12px rgba(250, 204, 21, 0.8); }
}

.output-tray {
  height: 2rem;
  background: #3B82F6;
  margin: 0 1rem;
  border-radius: 0 0 1rem 1rem;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.tray-line {
  width: 5rem;
  height: 0.375rem;
  background: rgba(30, 58, 138, 0.3);
  border-radius: 9999px;
}

/* ========================================================================
   DECORATIVE STICKER
   ======================================================================== */
.deco-sticker {
  position: absolute;
  bottom: 6rem;
  left: 1rem;
  transform: rotate(-6deg);
  background: linear-gradient(to right, #fde047, #facc15);
  color: #78350f;
  font-size: 0.6rem;
  font-weight: 900;
  padding: 0.4rem 0.6rem;
  border-radius: 0.5rem;
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  max-width: 6.5rem;
  line-height: 1.3;
  text-align: center;
  transition: transform 0.2s;
  cursor: default;
}
.deco-sticker:hover {
  transform: rotate(0deg) scale(1.08);
}

/* ========================================================================
   SIDE VENTS
   ======================================================================== */
.side-vents {
  position: absolute;
  top: 10rem;
  right: 0.75rem;
  width: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  opacity: 0.4;
}
.vent {
  width: 100%;
  height: 1rem;
  background: rgba(30, 58, 138, 0.3);
  border-radius: 9999px;
}

/* ========================================================================
   SHAKE ANIMATIONS (rarity-based intensity)
   ======================================================================== */
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

/* ========================================================================
   BOUNCE ANIMATION (status icon)
   ======================================================================== */
.bounce-anim {
  display: inline-block;
  animation: bounce-face 1.2s ease-in-out infinite;
}
@keyframes bounce-face {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-4px); }
}

/* ========================================================================
   CARD REVEAL PREVIEW (floating overlay during "revealing")
   ======================================================================== */
.card-reveal-preview {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
}

/* Vue transition */
.card-pop-enter-active {
  animation: card-pop-in 0.5s ease-out;
}
.card-pop-leave-active {
  animation: card-pop-in 0.3s ease-in reverse;
}

@keyframes card-pop-in {
  0% {
    transform: translate(-50%, 100%);
    opacity: 0;
  }
  100% {
    transform: translate(-50%, -50%);
    opacity: 1;
  }
}

.card-preview {
  position: relative;
  width: 260px;
  height: 390px;
  border-radius: 1rem;
  overflow: hidden;
  animation: card-scale-in 0.5s ease-out;
}
@media (min-width: 640px) {
  .card-preview {
    width: 280px;
    height: 420px;
  }
}

@keyframes card-scale-in {
  0%   { transform: scale(0.5); opacity: 0; }
  100% { transform: scale(1);   opacity: 1; }
}

.card-preview-glow {
  position: absolute;
  inset: -20px;
  border-radius: 1rem;
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
  bottom: 0; left: 0; right: 0;
  padding: 1rem;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.9), transparent);
  color: #fff;
  font-size: 1.35rem;
  font-weight: 800;
  text-align: center;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.5; }
  50%      { opacity: 1;   }
}

/* Rarity glow colours */
[data-rarity="UR"] .card-preview-glow { background: radial-gradient(circle, rgba(147,51,234,0.7), transparent 70%); }
[data-rarity="SR"] .card-preview-glow { background: radial-gradient(circle, rgba(255,140,0,0.5), transparent 70%); }
[data-rarity="RR"] .card-preview-glow { background: radial-gradient(circle, rgba(0,102,255,0.4), transparent 70%); }
[data-rarity="R"]  .card-preview-glow { background: radial-gradient(circle, rgba(0,170,0,0.3), transparent 70%); }
[data-rarity="U"]  .card-preview-glow { background: radial-gradient(circle, rgba(234,179,8,0.35), transparent 70%); }
[data-rarity="C"]  .card-preview-glow { background: radial-gradient(circle, rgba(128,128,128,0.2), transparent 70%); }

/* ========================================================================
   OPENED STATE (full-screen overlay with SsrCard)
   ======================================================================== */
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

.card-reveal-scene {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.card-reveal-content {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  animation: scale-in 0.4s ease-out;
}

.card-reveal-card-wrapper {
  display: block;
  width: 280px;
  max-width: 90vw;
  min-width: 0;
}

.close-btn {
  padding: 0.875rem 2rem;
  min-height: 44px;
  min-width: 120px;
  font-size: 1rem;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #3B82F6, #6366F1);
  border: none;
  border-radius: 9999px;
  cursor: pointer;
  box-shadow: 0 6px 0 #1e40af, 0 8px 24px rgba(59, 130, 246, 0.4);
  transition: all 0.15s;
  font-family: inherit;
}
.close-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 0 #1e40af, 0 10px 28px rgba(59, 130, 246, 0.5);
}
.close-btn:active {
  transform: translateY(2px);
  box-shadow: 0 2px 0 #1e40af;
}

@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes scale-in {
  from { transform: scale(0.8); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}

/* ========================================================================
   ACCESSIBILITY: prefers-reduced-motion
   ======================================================================== */
@media (prefers-reduced-motion: reduce) {
  .shake-light,
  .shake-medium,
  .shake-strong,
  .shake-intense,
  .knob-spin-anim,
  .lamp-blink,
  .bounce-anim,
  .idle-has-cards,
  .badge-new,
  .display-brand,
  .idle-error,
  .spinner-ring,
  .spinner-icon,
  .reveal-icon,
  .reveal-flash,
  .output-light,
  .card-reveal-preview,
  .card-reveal-content {
    animation: none !important;
  }
}
</style>
