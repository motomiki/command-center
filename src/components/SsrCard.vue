<script setup lang="ts">
  import { ref, computed, watch } from 'vue';
  import type { Rarity, CardData } from '@/types/card';
  import { getRarityBadgeName, getRarityDisplayName } from '@/utils/rarity';
  import { getAssetUrl } from '@/utils/assetStore';
  import { getCardSkills } from '@/data/cardSkills';
  
  // Propsの定義: CardDataを直接受け取るか、個別プロパティを受け取る
  interface Props {
    // パターン1: CardDataを直接受け取る
    card?: CardData;
    // パターン2: 個別プロパティ（後方互換性のため）
    title?: string;
    imageUrl?: string;
    description?: string;
    rarity?: Rarity;
    date?: string;
    id?: string; // IDを追加（スキル生成用）
  }
  
  const props = withDefaults(defineProps<Props>(), {
    rarity: 'C' as Rarity,
  });
  
  // CardDataから値を取得するか、個別プロパティから取得する
  const cardTitle = computed(() => props.card?.title ?? props.title ?? '');
  const rawImageUrl = computed(() => props.card?.imageUrl ?? props.imageUrl ?? '');
  const cardDescription = computed(() => props.card?.description ?? props.description);
  const cardRarity = computed(() => props.card?.rarity ?? props.rarity ?? 'UR');
  const cardDate = computed(() => props.card?.date ?? props.date);
  const cardId = computed(() => props.card?.id ?? props.id ?? 'default-id'); // ID取得
  const cardIssueNumber = computed(() => props.card?.issueNumber ?? undefined);

  // 通し番号を3桁にフォーマット（例: 1 → "001", 42 → "042"）
  // 番号が未設定の場合は "???" を返す（プレビュー時など）
  const formattedIssueNumber = computed(() => {
    const num = cardIssueNumber.value;
    if (num == null) return '???';
    return String(num).padStart(3, '0');
  });

  // スキルデータの取得（IDに基づく決定的ランダム）
  const cardSkills = computed(() => getCardSkills(cardId.value));

  // 日付を「YYYY年M月D日」形式にフォーマット
  const formattedDate = computed(() => {
    if (!cardDate.value) return '';
    const d = new Date(cardDate.value);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  // レアリティ表示名＋獲得日を結合したメタテキスト
  const metaText = computed(() => {
    const rarityName = getRarityDisplayName(cardRarity.value);
    if (!formattedDate.value) return rarityName;
    return `${rarityName}：${formattedDate.value}`;
  });

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
  const rarityClasses = computed(() => {
    const r = cardRarity.value;
    // Helper to get color key (UR/SR/RR use custom frame, so this is mainly for R/U/C)
    const c = ['R', 'U', 'C'].includes(r) ? r : 'R'; 
    
    const map: Record<string, any> = {
      R: { 
        border: 'border-green-200', 
        bg: 'bg-green-50', 
        text: 'text-green-800', 
        mainBg: 'bg-green-500', 
        mainBorder: 'border-green-500', 
        from: 'from-green-50' 
      },
      U: { 
        border: 'border-yellow-200', 
        bg: 'bg-yellow-50', 
        text: 'text-yellow-800', 
        mainBg: 'bg-yellow-500', 
        mainBorder: 'border-yellow-500', 
        from: 'from-yellow-50' 
      },
      C: { 
        border: 'border-gray-200', 
        bg: 'bg-gray-50', 
        text: 'text-gray-700', 
        mainBg: 'bg-gray-500', 
        mainBorder: 'border-gray-500', 
        from: 'from-gray-50' 
      },
    };
    return map[c];
  });

  const rarityPulseGlow = computed(() => {
    const classes = {
      UR: 'absolute -inset-4 bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 rounded-xl opacity-0 group-hover:opacity-70 blur-xl transition-opacity duration-500 animate-pulse-slow',
      SR: 'absolute -inset-4 bg-gradient-to-r from-orange-600 via-orange-200 to-orange-600 rounded-xl opacity-0 group-hover:opacity-70 blur-xl transition-opacity duration-500 animate-pulse-slow',
      RR: 'absolute -inset-4 bg-gradient-to-r from-blue-600 via-blue-200 to-blue-600 rounded-xl opacity-0 group-hover:opacity-70 blur-xl transition-opacity duration-500 animate-pulse-slow',
      R: 'absolute -inset-4 bg-gradient-to-r from-green-600 via-green-200 to-green-600 rounded-xl opacity-0 group-hover:opacity-70 blur-xl transition-opacity duration-500 animate-pulse-slow',
      U: 'absolute -inset-4 bg-gradient-to-r from-yellow-500 via-yellow-200 to-yellow-500 rounded-xl opacity-0 group-hover:opacity-70 blur-xl transition-opacity duration-500',
      C: 'absolute -inset-4 bg-gradient-to-r from-gray-500 via-gray-300 to-gray-500 rounded-xl opacity-0 group-hover:opacity-70 blur-xl transition-opacity duration-500',
    };
    return classes[cardRarity.value];
  });

  // パルスアニメーションを表示するかどうか（UR/SR/RR/Rのみ）
  const showPulseAnimation = computed(() => {
    return ['UR', 'SR', 'RR', 'R'].includes(cardRarity.value);
  });
  
  // RR/SR/UR はカスタム画像フレーム（RR.png, SR.png, UR.png）を使用する
  const CUSTOM_FRAME_RARITIES = ['RR', 'SR', 'UR'] as const;
  const isCustomFrame = computed(() => CUSTOM_FRAME_RARITIES.includes(cardRarity.value as typeof CUSTOM_FRAME_RARITIES[number]));
  const customFrameSrc = computed(() => `/images/frames/${cardRarity.value}.png`);

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
        class="relative w-full h-full rounded-xl shadow-2xl overflow-hidden"
        :style="cardStyle"
        style="will-change: transform;"
      >
      <!-- RR/SR/UR Custom Frame Mode: 画像フレーム（RR.png, SR.png, UR.png）を使用 -->
      <template v-if="isCustomFrame">
        <div class="ur-content-wrapper absolute inset-0 rounded-lg overflow-hidden">
          <div class="ur-frame-container absolute inset-0 rounded-lg overflow-hidden">
            <!-- Art Image (Z=0) -->
            <img 
              :src="cardImageUrl" 
              :alt="cardTitle" 
              class="ur-art ur-layer-art absolute object-cover"
              loading="lazy"
            />
            <!-- Frame Overlay (Z=20px) -->
            <img
              :src="customFrameSrc"
              alt=""
              class="ur-layer-frame absolute inset-0 w-full h-full object-fill pointer-events-none z-10"
            />
            <!-- Title (Z=30px) -->
            <h3 class="ur-title ur-layer-text absolute z-20 font-bold text-white">
              {{ cardTitle }}
            </h3>
            <!-- Description (Z=30px) -->
            <p v-if="cardDescription" class="ur-desc ur-layer-text absolute z-20 text-black line-clamp-2">
              {{ cardDescription }}
            </p>
            <!-- Meta: レアリティ：獲得日 (Z=30px) -->
            <span class="ur-meta ur-layer-text absolute z-20">
              {{ metaText }}
            </span>
            <!-- 通し番号: 説明欄左下 (Z=30px) -->
            <span class="ur-issue-number ur-layer-text absolute z-20">
              No.{{ formattedIssueNumber }}
            </span>
          </div>
        </div>
      </template>

      <!-- Standard Card Mode (UR以外のレアリティはすべて従来表示) -->
      <template v-else>
        <div 
          class="relative w-full h-full rounded-2xl overflow-hidden flex flex-col bg-white border-[10px] transition-colors duration-300"
          :class="rarityClasses.border"
        >
          <!-- Header -->
          <div 
            class="relative z-10 flex items-center justify-between gap-2 px-3 pt-3 pb-1 bg-gradient-to-b to-white"
            :class="rarityClasses.from"
          >
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <div 
                class="size-5 flex-shrink-0 rounded-full flex items-center justify-center shadow-sm text-white border border-white/50"
                :class="rarityClasses.mainBg"
              >
                <span class="material-symbols-outlined filled text-[12px]">star</span>
              </div>
              <h2 class="text-sm font-black tracking-tight uppercase italic text-slate-900 leading-tight line-clamp-2 min-w-0">
                {{ cardTitle }}
              </h2>
            </div>
            <div class="flex items-center flex-shrink-0">
              <span 
                class="text-lg font-black leading-none"
                :class="rarityClasses.text"
              >
                {{ getRarityBadgeName(cardRarity) }}
              </span>
            </div>
          </div>

          <!-- Image Area -->
          <div 
            class="relative mx-3 h-[45%] rounded-lg overflow-hidden border-4 shadow-inner bg-slate-200 group-hover:shadow-md transition-shadow duration-500"
            :class="rarityClasses.mainBorder"
          >
            <img 
              :src="cardImageUrl" 
              :alt="cardTitle"
              class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
            />
            <div 
              class="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-bold border shadow-sm bg-white/90 backdrop-blur-sm"
              :class="[rarityClasses.text, rarityClasses.border]"
            >
              {{ formattedDate }}
            </div>
          </div>

          <!-- Body: 説明文（上）→ 余白 → スキルステータス（下） -->
          <div class="flex-1 px-3 py-2 flex flex-col min-h-0 relative overflow-hidden">
            <div class="absolute inset-0 pattern-bg opacity-30 pointer-events-none"></div>
            <!-- Description（上部詰め） -->
            <div class="relative z-10 mb-2 flex-shrink-0">
              <p class="text-[15px] text-slate-700 leading-snug font-medium whitespace-pre-wrap line-clamp-4">
                {{ cardDescription }}
              </p>
            </div>
            <!-- Spacer（可変） -->
            <div class="flex-1 min-h-2"></div>
            <!-- Skill Stats（下部固定・ポケモン風ワザ欄） -->
            <div
              class="relative z-10 pt-2 flex-shrink-0 border-t border-slate-200/80 skill-stats-section"
              :class="rarityClasses.border"
            >
              <!-- Skill 1: Dynamic Slot 1 -->
              <div class="skill-row flex items-center gap-1.5 py-1">
                <span
                  class="skill-cost flex items-center justify-center size-6 rounded-full border-2 shadow-sm text-white"
                  :class="[rarityClasses.mainBg, rarityClasses.mainBorder]"
                  aria-hidden="true"
                >
                  <span class="material-symbols-outlined filled text-[14px]">{{ cardSkills.slot1.icon }}</span>
                </span>
                <span class="skill-name text-sm font-bold text-slate-800 uppercase tracking-tight flex-1">
                  {{ cardSkills.slot1.name }}
                </span>
                <span
                  class="skill-value text-sm font-black tabular-nums"
                  :class="rarityClasses.text"
                >
                  {{ cardSkills.slot1.value }}
                </span>
              </div>
              <!-- Skill 2: Dynamic Slot 2 -->
              <div class="skill-row flex items-center gap-1.5 py-1 border-t border-slate-200/60">
                <span
                  class="skill-cost flex items-center justify-center size-6 rounded-full border-2 shadow-sm text-white"
                  :class="[rarityClasses.mainBg, rarityClasses.mainBorder]"
                  aria-hidden="true"
                >
                  <span class="material-symbols-outlined filled text-[14px]">{{ cardSkills.slot2.icon }}</span>
                </span>
                <span class="skill-name text-sm font-bold text-slate-800 uppercase tracking-tight flex-1">
                  {{ cardSkills.slot2.name }}
                </span>
                <span
                  class="skill-value text-sm font-black tabular-nums"
                  :class="rarityClasses.text"
                >
                  {{ cardSkills.slot2.value }}
                </span>
              </div>
            </div>
          </div>

          <!-- Weakness/Resistance 風ミニアイコン列（Footer直上） -->
          <div
            class="relative z-10 px-3 py-1 flex items-center justify-center gap-3 border-t border-slate-200/60 mini-stats-row"
            :class="rarityClasses.border"
          >
            <span 
              v-for="(stat, index) in cardSkills.footer" 
              :key="index"
              class="mini-stat flex items-center gap-0.5 text-[12px] font-bold text-slate-500" 
              :title="stat.label"
            >
              <span class="material-symbols-outlined filled text-[15px]">{{ stat.icon }}</span>
              <span>{{ stat.label }}</span>
            </span>
          </div>

          <!-- Footer -->
          <div 
            class="relative z-10 px-3 py-1.5 border-t"
            :class="[rarityClasses.bg, rarityClasses.border]"
          >
            <div class="flex justify-between items-end">
              <p class="text-[8px] text-slate-400 font-medium italic w-2/3 leading-tight">
                放課後キャンパスクラブの、ひとつの思い出
              </p>
              <div class="text-right">
                <div 
                  class="flex items-center justify-end gap-1 mb-0.5"
                  :class="rarityClasses.text"
                >
                  <span class="font-black text-[9px]">No.{{ formattedIssueNumber }}</span>
                  <span class="material-symbols-outlined text-[10px] filled">star</span>
                </div>
              </div>
            </div>
          </div>

          <div class="absolute inset-0 foil-overlay z-20 opacity-50"></div>
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
          v-if="['UR', 'SR', 'RR'].includes(cardRarity)" 
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
  
  /* Standard card: ホバーでイラストのみ拡大（テキストは下部で固定） */
  @media (hover: hover) and (pointer: fine) {
    .group:hover .standard-card-art {
      transform: scale(1.25);
    }
  }
  @media (hover: none) and (pointer: coarse) {
    .group:hover .standard-card-art {
      transform: scale(1.1);
    }
  }

  /* UR/SR/RR Custom Frame: コンテナごと拡大してテキストずれを防ぐ + 3D奥行き */
  .ur-content-wrapper {
    transform-style: preserve-3d;
    transition: transform 0.3s ease-out;
    will-change: transform;
  }
  @media (hover: hover) and (pointer: fine) {
    .group:hover .ur-content-wrapper {
      transform: scale(1.25);
    }
  }
  @media (hover: none) and (pointer: coarse) {
    .group:hover .ur-content-wrapper {
      transform: scale(1.1);
    }
  }
  .ur-layer-art {
    transform: translateZ(0);
  }
  .ur-layer-frame {
    transform: translateZ(20px);
  }
  .ur-layer-text {
    transform: translateZ(30px);
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

    .group:hover .ur-content-wrapper {
      transform: scale(1.1);
    }

    .group:hover .standard-card-art {
      transform: scale(1.1);
    }
  }
  
/* 放射状グラデーション（Tailwind標準にないので追加） */
.bg-gradient-radial {
  background-image: radial-gradient(circle at center, var(--tw-gradient-from), var(--tw-gradient-to));
}

/* =============================================
   UR Custom Frame Mode
   image_service.py の座標を CSS 百分率に変換:
     Canvas: 600×840, Art: 520×680 @ (40, 70)
     Title: (190, 635), Desc: (108, 718)
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

/* Title: position (190, 635) on 600×840 canvas, font-size 36px */
.ur-title {
  top: 75.595%;    /* 635 / 840 */
  left: 31.667%;   /* 190 / 600 */
  right: 6.667%;   /* 右端マージン: 40 / 600 */
  font-size: 6cqi; /* 36 / 600 × 100 */
  line-height: 1.2;
  text-align: left; /* 親の text-center 継承を上書き（Python 側と同じ左寄せ） */
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

/* Description: position (108, 718), config.py DESC_MAX_WIDTH=400 に合わせた幅（右マージン 92px） */
.ur-desc {
  top: 85.476%;       /* 718 / 840 */
  left: 18%;          /* 108 / 600 */
  right: 15.333%;     /* 92 / 600 … DESC_MAX_WIDTH=400 と同期 */
  font-size: 3.667cqi; /* 22 / 600 × 100 */
  line-height: 1.3;
  text-align: left; /* 親の text-center 継承を上書き（Python 側と同じ左寄せ） */
}

  /* Meta (レアリティ：獲得日): 説明枠の右下に配置 */
  .ur-meta {
    /* bottom: 2.4%;          下端から約 20px / 840 */
    /* right: 10%;            右端マージン: 60 / 600 */
    bottom: 3.5%;          /* 下端から約 20px / 840 */
    right: 18%;            /* 右端マージン: 60 / 600 */
    font-size: 2.5cqi;   /* 14 / 600 × 100 — 説明より小さく */
    line-height: 1;
    text-align: right;
    color: rgba(0, 0, 0, 0.55);
    white-space: nowrap;
    pointer-events: none;
  }

  /* 通し番号: 説明枠の左下に配置（UR/SR/RR カスタムフレーム） */
  .ur-issue-number {
    bottom: 3.5%;
    left: 18%;
    font-size: 2.5cqi;
    line-height: 1;
    text-align: left;
    font-weight: 900;
    color: rgba(0, 0, 0, 0.55);
    white-space: nowrap;
    pointer-events: none;
  }

  /* ポケモン風スキルステータス欄 */
  .skill-stats-section .skill-row:last-child {
    border-bottom: none;
  }
  .skill-stats-section .skill-cost {
    flex-shrink: 0;
  }
  .mini-stats-row .mini-stat {
    flex-shrink: 0;
  }

  .pattern-bg {
    background-color: transparent;
    background-image: repeating-linear-gradient(45deg, currentColor 25%, transparent 25%, transparent 75%, currentColor 75%, currentColor), repeating-linear-gradient(45deg, currentColor 25%, transparent 25%, transparent 75%, currentColor 75%, currentColor);
    background-position: 0 0, 10px 10px;
    background-size: 20px 20px;
    color: rgba(0,0,0,0.03);
  }
  .foil-overlay {
    background: linear-gradient(125deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0) 60%);
    mix-blend-mode: color-dodge;
    pointer-events: none;
  }
  </style>

