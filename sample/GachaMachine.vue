<script setup lang="ts">
  import { ref } from 'vue';
  import confetti from 'canvas-confetti';
  
  // 親コンポーネントから「今日の結果データ（レアリティ含む）」を受け取る
  const props = defineProps<{
    dailyResult: {
      rarity: 'C' | 'B' | 'A' | 'S' | 'SR' | 'SSR';
      imageUrl: string;
      message: string;
    } | null
  }>();
  
  const isSpinning = ref(false);
  const showResult = ref(false);
  
  const spinGacha = () => {
    if (!props.dailyResult) return;
    
    isSpinning.value = true;
    
    // 3秒間ガチャ演出（CSSアニメーション）を見せる
    setTimeout(() => {
      isSpinning.value = false;
      showResult.value = true;
      
      // SSRかSRなら紙吹雪を舞わせる
      if (['SSR', 'SR'].includes(props.dailyResult.rarity)) {
        fireConfetti();
      }
    }, 3000);
  };
  
  const fireConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF4500'] // 金・オレンジ系
    });
  };
  </script>
  
  <template>
    <div class="gacha-container">
      <div v-if="!showResult" class="machine-wrapper">
        <div class="machine" :class="{ 'shake-anim': isSpinning }">
          <img src="/assets/nano-banaan-machine.png" alt="Gacha Machine" />
        </div>
        <button 
          @click="spinGacha" 
          :disabled="isSpinning"
          class="spin-btn"
        >
          {{ isSpinning ? '抽出中...' : '本日の結果をスキャン！' }}
        </button>
      </div>
  
      <div v-else class="result-overlay">
        <div class="card-reveal" :data-rarity="dailyResult?.rarity">
          <div class="glow-effect"></div>
          <img :src="dailyResult?.imageUrl" class="result-image" />
          <h2 class="rarity-text">{{ dailyResult?.rarity }} RANK GET!!</h2>
          <p class="teacher-comment">{{ dailyResult?.message }}</p>
        </div>
      </div>
    </div>
  </template>
  
  <style scoped>
  /* ガタガタ揺れるアニメーション */
  .shake-anim {
    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both infinite;
  }
  
  @keyframes shake {
    10%, 90% { transform: translate3d(-1px, 0, 0); }
    20%, 80% { transform: translate3d(2px, 0, 0); }
    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
    40%, 60% { transform: translate3d(4px, 0, 0); }
  }
  
  /* SSRの時の後光エフェクト */
  [data-rarity="SSR"] .glow-effect {
    box-shadow: 0 0 50px 20px rgba(255, 215, 0, 0.8);
    /* さらに回転アニメーションなどを追加 */
  }
  </style>