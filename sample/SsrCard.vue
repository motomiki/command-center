<script setup lang="ts">
  import { ref, computed } from 'vue';
  
  interface Props {
    title: string;
    imageUrl: string;
    description?: string;
  }
  
  const props = defineProps<Props>();
  
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
  </script>
  
  <template>
    <div 
      class="relative w-[320px] h-[480px] group select-none"
      @mousemove="handleMouseMove"
      @mouseleave="handleMouseLeave"
    >
      <div class="absolute -inset-4 bg-gradient-to-r from-yellow-600 via-yellow-200 to-yellow-600 rounded-xl opacity-0 group-hover:opacity-70 blur-xl transition-opacity duration-500 animate-pulse-slow"></div>
  
      <div 
        ref="cardRef"
        class="relative w-full h-full rounded-xl shadow-2xl overflow-hidden bg-gray-900 border-[6px] border-transparent"
        :style="cardStyle"
      >
        <div class="absolute inset-0 rounded-lg border-4 border-yellow-400/50 z-20 pointer-events-none mix-blend-overlay"></div>
        
        <div class="absolute inset-0 bg-gradient-to-br from-yellow-700 via-yellow-200 to-yellow-600 p-1">
          
          <div class="relative h-full w-full bg-slate-900 rounded-lg overflow-hidden flex flex-col">
            
            <div class="relative h-[65%] w-full overflow-hidden">
              <img 
                :src="props.imageUrl" 
                :alt="props.title" 
                class="w-full h-full object-cover transform scale-110 group-hover:scale-125 transition-transform duration-700"
              />
              <div class="absolute inset-0 bg-noise opacity-30 mix-blend-overlay"></div>
            </div>
  
            <div class="relative flex-1 bg-gradient-to-b from-gray-900 via-gray-800 to-black p-4 border-t-2 border-yellow-500/50 flex flex-col items-center justify-center text-center z-10">
              <div class="absolute -top-6 bg-gradient-to-r from-yellow-600 via-yellow-300 to-yellow-600 text-yellow-900 font-black px-6 py-1 rounded-full shadow-lg border-2 border-white/50 tracking-widest text-xl transform">
                SSR
              </div>
  
              <h3 class="mt-4 text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-600 font-bold text-2xl drop-shadow-sm font-serif">
                {{ props.title }}
              </h3>
              <p v-if="props.description" class="text-yellow-100/80 text-xs mt-2 font-medium leading-relaxed">
                {{ props.description }}
              </p>
            </div>
          </div>
        </div>
  
        <div class="absolute inset-0 pointer-events-none z-30 shine-effect"></div>
        
        <div 
          class="absolute inset-0 pointer-events-none z-40 bg-gradient-radial from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 mix-blend-soft-light"
          :style="sheenStyle"
        ></div>
        
        <div class="absolute inset-0 z-50 pointer-events-none sparkle-container">
          <div class="sparkle s1"></div>
          <div class="sparkle s2"></div>
          <div class="sparkle s3"></div>
        </div>
      </div>
    </div>
  </template>
  
  <style scoped>
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
  }
  
  .s1 { top: 10%; left: 20%; animation-delay: 0s; }
  .s2 { top: 80%; left: 85%; animation-delay: 1.5s; }
  .s3 { top: 40%; left: 60%; animation-delay: 2.3s; }
  
  @keyframes float-sparkle {
    0% { transform: translateY(0) scale(0); opacity: 0; }
    50% { transform: translateY(-20px) scale(1); opacity: 1; }
    100% { transform: translateY(-40px) scale(0); opacity: 0; }
  }
  
  /* 放射状グラデーション（Tailwind標準にないので追加） */
  .bg-gradient-radial {
    background-image: radial-gradient(circle at center, var(--tw-gradient-from), var(--tw-gradient-to));
  }
  </style>