<script setup lang="ts">
  import { ref, computed, watch } from 'vue';
  import type { Rarity, CardData } from '@/types/card';
  import { getRarityBadgeName } from '@/utils/rarity';
  import { getAssetUrl } from '@/utils/assetStore';
  
  // Propsの定義: CardDataを直接受け取るか、個別プロパティを受け取る
  interface Props {
    // パターン1: CardDataを直接受け取る
    card?: CardData;
    // パターン2: 個別プロパティ（後方互換性のため）
    title?: string;
    imageUrl?: string;
    description?: string;
    rarity?: Rarity;
  }
  
  const props = withDefaults(defineProps<Props>(), {
    rarity: 'C' as Rarity,
  });
  
  // CardDataから値を取得するか、個別プロパティから取得する
  const cardTitle = computed(() => props.card?.title ?? props.title ?? '');
  const rawImageUrl = computed(() => props.card?.imageUrl ?? props.imageUrl ?? '');
  const cardDescription = computed(() => props.card?.description ?? props.description);
  const cardRarity = computed(() => props.card?.rarity ?? props.rarity ?? 'UR');

  // IDB URL Resolution
  const resolvedImageUrl = ref('');

  watch(rawImageUrl, async (newUrl) => {
    if (newUrl && newUrl.startsWith('idb://')) {
      const id = newUrl.replace('idb://', '');
      const url = await getAssetUrl(id);
      resolvedImageUrl.value = url || '';
    } else {
      resolvedImageUrl.value = newUrl;
    }
  }, { immediate: true });

  const cardImageUrl = computed(() => resolvedImageUrl.value);
  
  // --- 3D Tilt Logic ---
  const cardRef = ref<HTMLElement | null>(null);
  const rotX = ref(0);
  const rotY = ref(0);
  const brightness = ref(1);
  
  // マウスが動いた時の計算（カードの中心からの距離で角度を決める）
  const handleMouseMove = (e: MouseEvent) => {
    if (!cardRef.value) return;
    const rect = cardRef.value.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 中心座標
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
  
    // 回転角度の計算（最大20度傾く）
    const rotateX = ((y - centerY) / centerY) * -20;
    const rotateY = ((x - centerX) / centerX) * 20;
  
    rotX.value = rotateX;
    rotY.value = rotateY;
    
    // 光の反射位置計算（簡易的）
    brightness.value = 1 + (Math.abs(rotateX) + Math.abs(rotateY)) / 100;
  };
  
  // マウスが離れたら元に戻す
  const handleMouseLeave = () => {
    rotX.value = 0;
    rotY.value = 0;
    brightness.value = 1;
  };
  
  // スタイルを動的に適用
  const cardStyle = computed(() => ({
    transform: `perspective(1000px) rotateX(${rotX.value}deg) rotateY(${rotY.value}deg) scale3d(1.02, 1.02, 1.02)`,
    transition: 'transform 0.1s ease-out', // 動きを少し滑らかに
    filter: `brightness(${brightness.value})`,
  }));
  
  // 光沢（シマー）の位置を逆算して移動させる
  const sheenStyle = computed(() => ({
    backgroundPosition: `${50 + (rotY.value * 2)}% ${50 + (rotX.value * 2)}%`
  }));
  
  // レアリティ別のスタイリング（完全なクラス名を返す）
  const rarityPulseGlow = computed(() => {
    const classes = {
      UR: 'absolute -inset-4 bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 rounded-xl opacity-0 group-hover:opacity-70 blur-xl transition-opacity duration-500 animate-pulse-slow',
      SR: 'absolute -inset-4 bg-gradient-to-r from-orange-600 via-orange-200 to-orange-600 rounded-xl opacity-0 group-hover:opacity-70 blur-xl transition-opacity duration-500 animate-pulse-slow',
      RR: 'absolute -inset-4 bg-gradient-to-r from-blue-600 via-blue-200 to-blue-600 rounded-xl opacity-0 group-hover:opacity-70 blur-xl transition-opacity duration-500 animate-pulse-slow',
      R: 'absolute -inset-4 bg-gradient-to-r from-green-600 via-green-200 to-green-600 rounded-xl opacity-0 group-hover:opacity-70 blur-xl transition-opacity duration-500 animate-pulse-slow',
      U: 'absolute -inset-4 bg-gradient-to-r from-gray-500 via-gray-300 to-gray-500 rounded-xl opacity-0 group-hover:opacity-70 blur-xl transition-opacity duration-500',
      C: 'absolute -inset-4 bg-gradient-to-r from-gray-400 via-gray-200 to-gray-400 rounded-xl opacity-0 group-hover:opacity-70 blur-xl transition-opacity duration-500',
    };
    return classes[cardRarity.value];
  });
  
  const rarityGradientBg = computed(() => {
    const classes = {
      UR: 'absolute inset-0 bg-gradient-to-br from-purple-700 via-pink-500 to-purple-600 p-1',
      SR: 'absolute inset-0 bg-gradient-to-br from-orange-700 via-orange-200 to-orange-600 p-1',
      RR: 'absolute inset-0 bg-gradient-to-br from-blue-700 via-blue-200 to-blue-600 p-1',
      R: 'absolute inset-0 bg-gradient-to-br from-green-700 via-green-200 to-green-600 p-1',
      U: 'absolute inset-0 bg-gradient-to-br from-gray-600 via-gray-300 to-gray-500 p-1',
      C: 'absolute inset-0 bg-gradient-to-br from-gray-500 via-gray-200 to-gray-400 p-1',
    };
    return classes[cardRarity.value];
  });
  
  const rarityBorder = computed(() => {
    const classes = {
      UR: 'absolute inset-0 rounded-lg border-4 border-purple-400/50 z-20 pointer-events-none mix-blend-overlay',
      SR: 'absolute inset-0 rounded-lg border-4 border-orange-400/50 z-20 pointer-events-none mix-blend-overlay',
      RR: 'absolute inset-0 rounded-lg border-4 border-blue-400/50 z-20 pointer-events-none mix-blend-overlay',
      R: 'absolute inset-0 rounded-lg border-4 border-green-400/50 z-20 pointer-events-none mix-blend-overlay',
      U: 'absolute inset-0 rounded-lg border-4 border-gray-400/50 z-20 pointer-events-none mix-blend-overlay',
      C: 'absolute inset-0 rounded-lg border-4 border-gray-300/50 z-20 pointer-events-none mix-blend-overlay',
    };
    return classes[cardRarity.value];
  });
  
  const rarityBottomContainer = computed(() => {
    const classes = {
      UR: 'relative flex-1 bg-gradient-to-b from-gray-900 via-gray-800 to-black p-4 border-t-2 border-purple-500/50 flex flex-col items-center justify-center text-center z-10',
      SR: 'relative flex-1 bg-gradient-to-b from-gray-900 via-gray-800 to-black p-4 border-t-2 border-orange-500/50 flex flex-col items-center justify-center text-center z-10',
      RR: 'relative flex-1 bg-gradient-to-b from-gray-900 via-gray-800 to-black p-4 border-t-2 border-blue-500/50 flex flex-col items-center justify-center text-center z-10',
      R: 'relative flex-1 bg-gradient-to-b from-gray-900 via-gray-800 to-black p-4 border-t-2 border-green-500/50 flex flex-col items-center justify-center text-center z-10',
      U: 'relative flex-1 bg-gradient-to-b from-gray-900 via-gray-800 to-black p-4 border-t-2 border-gray-400/50 flex flex-col items-center justify-center text-center z-10',
      C: 'relative flex-1 bg-gradient-to-b from-gray-900 via-gray-800 to-black p-4 border-t-2 border-gray-300/50 flex flex-col items-center justify-center text-center z-10',
    };
    return classes[cardRarity.value];
  });
  
  const rarityBadgeStyle = computed(() => {
    const classes = {
      UR: 'absolute -top-6 bg-gradient-to-r from-purple-600 via-pink-300 to-purple-600 text-purple-900 font-black px-6 py-1 rounded-full shadow-lg border-2 border-white/50 tracking-widest text-xl transform',
      SR: 'absolute -top-6 bg-gradient-to-r from-orange-600 via-orange-300 to-orange-600 text-orange-900 font-black px-6 py-1 rounded-full shadow-lg border-2 border-white/50 tracking-widest text-xl transform',
      RR: 'absolute -top-6 bg-gradient-to-r from-blue-600 via-blue-300 to-blue-600 text-blue-900 font-black px-6 py-1 rounded-full shadow-lg border-2 border-white/50 tracking-widest text-xl transform',
      R: 'absolute -top-6 bg-gradient-to-r from-green-600 via-green-300 to-green-600 text-green-900 font-black px-6 py-1 rounded-full shadow-lg border-2 border-white/50 tracking-widest text-xl transform',
      U: 'absolute -top-6 bg-gradient-to-r from-gray-500 via-gray-300 to-gray-500 text-gray-900 font-black px-6 py-1 rounded-full shadow-lg border-2 border-white/50 tracking-widest text-xl transform',
      C: 'absolute -top-6 bg-gradient-to-r from-gray-400 via-gray-200 to-gray-400 text-gray-900 font-black px-6 py-1 rounded-full shadow-lg border-2 border-white/50 tracking-widest text-xl transform',
    };
    return classes[cardRarity.value];
  });
  
  const rarityTitleGradient = computed(() => {
    const classes = {
      UR: 'mt-4 text-transparent bg-clip-text bg-gradient-to-b from-purple-200 to-purple-600 font-bold text-2xl drop-shadow-sm font-serif',
      SR: 'mt-4 text-transparent bg-clip-text bg-gradient-to-b from-orange-200 to-orange-600 font-bold text-2xl drop-shadow-sm font-serif',
      RR: 'mt-4 text-transparent bg-clip-text bg-gradient-to-b from-blue-200 to-blue-600 font-bold text-2xl drop-shadow-sm font-serif',
      R: 'mt-4 text-transparent bg-clip-text bg-gradient-to-b from-green-200 to-green-600 font-bold text-2xl drop-shadow-sm font-serif',
      U: 'mt-4 text-transparent bg-clip-text bg-gradient-to-b from-gray-200 to-gray-500 font-bold text-2xl drop-shadow-sm font-serif',
      C: 'mt-4 text-transparent bg-clip-text bg-gradient-to-b from-gray-200 to-gray-400 font-bold text-2xl drop-shadow-sm font-serif',
    };
    return classes[cardRarity.value];
  });
  
  const rarityTextColor = computed(() => {
    const classes = {
      UR: 'text-purple-100/80 text-xs mt-2 font-medium leading-relaxed',
      SR: 'text-orange-100/80 text-xs mt-2 font-medium leading-relaxed',
      RR: 'text-blue-100/80 text-xs mt-2 font-medium leading-relaxed',
      R: 'text-green-100/80 text-xs mt-2 font-medium leading-relaxed',
      U: 'text-gray-100/80 text-xs mt-2 font-medium leading-relaxed',
      C: 'text-gray-100/80 text-xs mt-2 font-medium leading-relaxed',
    };
    return classes[cardRarity.value];
  });
  
  // パルスアニメーションを表示するかどうか（UR/SR/RR/Rのみ）
  const showPulseAnimation = computed(() => {
    return ['UR', 'SR', 'RR', 'R'].includes(cardRarity.value);
  });
  
  // URカードはカスタム画像フレーム（UR.png）を使用する
  const isCustomFrame = computed(() => cardRarity.value === 'UR');

  // 光沢エフェクトの強度（レアリティに応じて調整）
  const shineEffectOpacity = computed(() => {
    const opacities = {
      UR: 0.9,
      SR: 0.8,
      RR: 0.6,
      R: 0.5,
      U: 0.3,
      C: 0.2,
    };
    return opacities[cardRarity.value];
  });
  </script>
  
  <template>
    <div 
      class="ssr-card-root relative w-full group select-none"
      :class="isCustomFrame ? 'aspect-[5/7]' : 'aspect-[2/3]'"
      @mousemove="handleMouseMove"
      @mouseleave="handleMouseLeave"
    >
      <div 
        v-if="showPulseAnimation"
        :class="rarityPulseGlow"
      ></div>
  
      <div 
        ref="cardRef"
        class="relative w-full h-full rounded-xl shadow-2xl overflow-hidden bg-gray-900"
        :class="isCustomFrame ? '' : 'border-[6px] border-transparent'"
        :style="cardStyle"
        style="will-change: transform;"
      >
      <!-- UR Custom Frame Mode: 画像フレーム（UR.png）を使用 -->
      <template v-if="isCustomFrame">
        <div class="ur-frame-container absolute inset-0 rounded-lg overflow-hidden">
          <!-- Art Image (フレームの下に配置) -->
          <img 
            :src="cardImageUrl" 
            :alt="cardTitle" 
            class="ur-art absolute object-cover"
            loading="lazy"
          />
          <!-- Frame Overlay (UR.png) -->
          <img
            src="/images/frames/UR.png"
            alt=""
            class="absolute inset-0 w-full h-full object-fill pointer-events-none z-10"
          />
          <!-- Title -->
          <h3 class="ur-title absolute z-20 font-bold font-serif text-white">
            {{ cardTitle }}
          </h3>
          <!-- Description -->
          <p v-if="cardDescription" class="ur-desc absolute z-20 text-black line-clamp-2">
            {{ cardDescription }}
          </p>
        </div>
      </template>

      <!-- Standard Card Mode (UR以外のレアリティはすべて従来表示) -->
      <template v-else>
        <div :class="rarityBorder"></div>
        
        <div :class="rarityGradientBg">
          
          <div class="relative h-full w-full min-h-0 bg-slate-900 rounded-lg overflow-hidden flex flex-col">
            
            <div class="relative h-[65%] min-h-0 w-full overflow-hidden flex-shrink-0 bg-gray-900">
              <img 
                :src="cardImageUrl" 
                :alt="cardTitle" 
                class="w-full h-full object-cover transform scale-110 transition-transform duration-700"
                :class="{ 'group-hover:scale-125': true }"
                loading="lazy"
              />
              <div class="absolute inset-0 bg-noise opacity-30 mix-blend-overlay"></div>
            </div>

            <div :class="rarityBottomContainer">
              <div :class="rarityBadgeStyle">
                {{ getRarityBadgeName(cardRarity) }}
              </div>

              <h3 :class="rarityTitleGradient">
                {{ cardTitle }}
              </h3>
              <p v-if="cardDescription" :class="rarityTextColor" class="line-clamp-2">
                {{ cardDescription }}
              </p>
            </div>
          </div>
        </div>
      </template>
  
        <div 
          class="absolute inset-0 pointer-events-none z-30 shine-effect"
          :style="{ opacity: shineEffectOpacity }"
        ></div>
        
        <div 
          class="absolute inset-0 pointer-events-none z-40 bg-gradient-radial from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 mix-blend-soft-light"
          :style="sheenStyle"
        ></div>
        
        <div 
          v-if="['UR', 'SR'].includes(cardRarity)" 
          class="absolute inset-0 z-50 pointer-events-none sparkle-container"
        >
          <div class="sparkle s1"></div>
          <div class="sparkle s2"></div>
          <div class="sparkle s3"></div>
        </div>
      </div>
    </div>
  </template>
  
  <style scoped>
  /* 親から幅が渡らない場合でもカードが潰れないよう最小幅を確保 */
  .ssr-card-root {
    min-width: 160px;
  }

  /* ノイズテクスチャ（画像のっぺり感を消す） */
  .bg-noise {
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  }
  
  /* 走る光のアニメーション（Shine Effect） */
  .shine-effect {
    background: linear-gradient(
      105deg,
      transparent 20%,
      rgba(255, 255, 255, 0.4) 40%,
      rgba(255, 255, 255, 0.8) 45%,
      rgba(255, 255, 255, 0.4) 50%,
      transparent 70%
    );
    background-size: 200% 100%;
    animation: shine 4s infinite linear;
    mix-blend-mode: overlay;
    will-change: background-position;
  }
  
  @keyframes shine {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  
  /* パルスアニメーション（ゆっくり明滅） */
  .animate-pulse-slow {
    animation: pulse-glow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  
  @keyframes pulse-glow {
    0%, 100% { opacity: 0.3; transform: scale(0.95); }
    50% { opacity: 0.6; transform: scale(1.05); }
  }
  
  /* キラキラ粒子（Sparkles） */
  .sparkle {
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background-color: white;
    box-shadow: 0 0 10px 2px rgba(255, 255, 210, 0.8);
    opacity: 0;
    animation: float-sparkle 3s infinite ease-in-out;
    will-change: transform, opacity;
  }
  
  .s1 { top: 10%; left: 20%; animation-delay: 0s; }
  .s2 { top: 80%; left: 85%; animation-delay: 1.5s; }
  .s3 { top: 40%; left: 60%; animation-delay: 2.3s; }
  
  @keyframes float-sparkle {
    0% { transform: translateY(0) scale(0); opacity: 0; }
    50% { transform: translateY(-20px) scale(1); opacity: 1; }
    100% { transform: translateY(-40px) scale(0); opacity: 0; }
  }
  
  /* タッチデバイス対応: ホバーエフェクトを無効化 */
  @media (hover: none) and (pointer: coarse) {
    .group:hover img {
      transform: scale(1.1) !important;
    }
  }
  
  /* ホバー可能なデバイスのみにホバーエフェクトを適用 */
  @media (hover: hover) and (pointer: fine) {
    .group:hover img {
      transform: scale(1.25) !important;
    }
  }
  
  /* アクセシビリティ: アニメーションを好まないユーザー向け */
  @media (prefers-reduced-motion: reduce) {
    .shine-effect {
      animation: none;
    }
    
    .animate-pulse-slow {
      animation: none;
    }
    
    .sparkle {
      animation: none;
      opacity: 0;
    }
    
    .group:hover img {
      transform: scale(1.1) !important;
    }
  }
  
/* 放射状グラデーション（Tailwind標準にないので追加） */
.bg-gradient-radial {
  background-image: radial-gradient(circle at center, var(--tw-gradient-from), var(--tw-gradient-to));
}

/* =============================================
   UR Custom Frame Mode
   Python config.py の座標を CSS 百分率に変換:
     Canvas: 600×840, Art: 520×680 @ (40, 70)
     Title: (140, 652), Desc: (135, 735)
   ============================================= */

.ur-frame-container {
  container-type: inline-size;
  background-color: transparent;
}

/* Art image: offset (40, 70) on 600×840 canvas */
.ur-art {
  top: 8.333%;     /* 70 / 840 */
  left: 6.667%;    /* 40 / 600 */
  width: 86.667%;  /* 520 / 600 */
  height: 80.952%; /* 680 / 840 */
}

/* Title: position (140, 652) on 600×840 canvas, font-size 36px */
.ur-title {
  top: 77.619%;    /* 652 / 840 */
  left: 23.333%;   /* 140 / 600 */
  right: 6.667%;   /* 右端マージン: 40 / 600 */
  font-size: 6cqi; /* 36 / 600 × 100 */
  line-height: 1.2;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

/* Description: position (135, 735) on 600×840 canvas, font-size 22px */
.ur-desc {
  top: 87.5%;         /* 735 / 840 */
  left: 22.5%;        /* 135 / 600 */
  right: 6.667%;      /* 右端マージン: 40 / 600 */
  font-size: 3.667cqi; /* 22 / 600 × 100 */
  line-height: 1.3;
}
</style>

