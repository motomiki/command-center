<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import type { Student } from '@/types/student';
import type { CardData } from '@/types/card';
import StudentNavigation, { type DashboardSection } from './StudentNavigation.vue';
import StudentHome from './StudentHome.vue';
import GachaMachine from './GachaMachine.vue';
import CardGallery from './CardGallery.vue';
import MinecraftViewer from './MinecraftViewer.vue';
import { useRepository } from '@/composables/useRepository';

interface Props {
  studentId: string; // 現在の生徒ID
}

const props = defineProps<Props>();
const { students, cards: cardsRepo, sync, isSyncing } = useRepository();

// ---------------------------------------------------------------------------
// 同期ステータス
// ---------------------------------------------------------------------------
const syncMessage = ref('');
/** ガチャ開封の保存に失敗したときのメッセージ（子ども向け） */
const gachaOpenError = ref('');

// ---------------------------------------------------------------------------
// データ取得（非同期）
// ---------------------------------------------------------------------------
const student = ref<Student | null>(null);
const studentCards = ref<CardData[]>([]);
/** 初回 fetch 完了したか（未取得の場合は「見つかりません」表示に使う） */
const dataFetched = ref(false);

const fetchData = async () => {
  dataFetched.value = false;
  const s = await students.getById(props.studentId);
  if (!s) {
    student.value = null;
    studentCards.value = [];
    dataFetched.value = true;
    return;
  }
  student.value = s;
  // カード・作品は内部キー（UUID）で取得
  studentCards.value = await cardsRepo.getByStudentId(s.id);
  dataFetched.value = true;
};

/**
 * アプリ起動時に Supabase からデータを同期し、その後ローカルデータを再取得する。
 * 同期に失敗してもキャッシュデータで動作を継続する。
 */
const initializeWithSync = async () => {
  // まずキャッシュからデータを表示（高速）
  await fetchData();

  // バックグラウンドで同期を実行
  try {
    const result = await sync((msg) => {
      syncMessage.value = msg;
    });

    if (result && result.success) {
      // 同期成功: 最新データで画面を更新
      await fetchData();
      syncMessage.value = '';
    } else if (result) {
      console.warn('[Sync] 一部エラーあり:', result.errors);
      syncMessage.value = '';
    }
    // result が null の場合は Supabase 未設定なので何もしない
  } catch (e) {
    console.warn('[Sync] 同期に失敗しましたが、キャッシュデータで動作を続行します', e);
    syncMessage.value = '';
  }
};

onMounted(initializeWithSync);
watch(() => props.studentId, fetchData);

// 現在のセクション
const currentSection = ref<DashboardSection>('home');

// セクション変更ハンドラー
const handleSectionChange = (section: DashboardSection) => {
  currentSection.value = section;
  // セクション変更時にスクロール位置をリセット
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ガチャセクションへの移動（ホーム画面の通知バッジから）
const handleNavigateToGacha = () => {
  currentSection.value = 'gacha';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ガチャ用の未開封カード
const gachaTestCards = computed(() =>
  studentCards.value.filter((c) => !c.isOpened)
);

// ナビゲーションの通知バッジ（未開封＝ガチャで回せる回数）
const navBadges = computed(() => ({
  gacha: gachaTestCards.value.length,
}));

// ガチャ結果のハンドラー
const handleCardOpened = async (card: CardData) => {
  gachaOpenError.value = '';
  try {
    await cardsRepo.markAsOpened(card.id);
    // ローカルの状態も更新（Supabase に反映されたときのみ）
    const target = studentCards.value.find((c) => c.id === card.id);
    if (target) target.isOpened = true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    gachaOpenError.value =
      msg.includes('保存できませんでした') || msg.includes('失敗')
        ? '開封の保存にしっぱいしました。もういちどためしてね。'
        : msg;
    // 5秒後にメッセージを自動で消す
    setTimeout(() => {
      gachaOpenError.value = '';
    }, 5000);
  }
};

const handleGachaComplete = (card: CardData) => {
  console.log('ガチャが完了しました:', card);
};

// MinecraftViewer用のカード（minecraftDataを持つカードから取得）
const minecraftCards = computed(() => {
  return studentCards.value
    .filter((card) => card.minecraftData && card.isOpened)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
});
</script>

<template>
  <div class="student-dashboard-container">
    <!-- ナビゲーション -->
    <StudentNavigation
      :current-section="currentSection"
      :badges="navBadges"
      @section-change="handleSectionChange"
    />

    <!-- 同期インジケータ -->
    <Transition name="sync-fade">
      <div v-if="isSyncing" class="sync-indicator">
        <div class="sync-spinner"></div>
        <span class="sync-text">{{ syncMessage || 'データを更新中...' }}</span>
      </div>
    </Transition>

    <!-- ガチャ開封エラー表示 -->
    <Transition name="sync-fade">
      <div v-if="gachaOpenError" class="gacha-open-error">
        <span class="gacha-open-error-text">{{ gachaOpenError }}</span>
      </div>
    </Transition>

    <!-- メインコンテンツ -->
    <div class="dashboard-content">
      <!-- ローディング表示 -->
      <div v-if="!dataFetched" class="loading-container">
        <div class="loading-spinner"></div>
        <p>データを読み込んでいます...</p>
      </div>

      <!-- 生徒が見つからない場合 -->
      <div v-else-if="!student" class="loading-container">
        <p class="text-lg font-medium">このページは見つかりませんでした</p>
        <p class="mt-2 text-sm opacity-80">ログインし直すか、URLをたしかめてね。</p>
      </div>

      <!-- ホームセクション -->
      <Transition v-else name="section-fade" mode="out-in">
        <div v-if="currentSection === 'home'" key="home" class="section-content">
          <StudentHome
            :student="student"
            :on-navigate-to-gacha="handleNavigateToGacha"
          />
        </div>

        <!-- ガチャセクション -->
        <div v-else-if="currentSection === 'gacha'" key="gacha" class="section-content">
          <div class="gacha-section">
            <div class="gacha-machine-wrapper">
              <GachaMachine
                :unopened-cards="gachaTestCards"
                @card-opened="handleCardOpened"
                @gacha-complete="handleGachaComplete"
              />
            </div>
            <div class="section-hint">
              <p>💡 レバーを回してガチャを回そう！レアリティによって演出が変わるよ！</p>
              <p class="mt-2">キーボード: Enterキーでガチャ実行</p>
            </div>
          </div>
        </div>

        <!-- カードギャラリーセクション -->
        <div v-else-if="currentSection === 'gallery'" key="gallery" class="section-content">
          <div class="gallery-section">
            <h2 class="section-header">📚 マイデッキ</h2>
            <CardGallery
              v-if="student"
              :student-id="student.id"
              :student-context="true"
            />
          </div>
        </div>

        <!-- Minecraftセクション -->
        <div v-else-if="currentSection === 'minecraft'" key="minecraft" class="section-content">
          <div class="minecraft-section">
            <h2 class="section-header">🎮 まいんくらふと</h2>
            <div v-if="minecraftCards.length > 0" class="minecraft-grid">
              <MinecraftViewer
                v-for="card in minecraftCards"
                :key="card.id"
                :card="card"
              />
            </div>
            <div v-else class="no-minecraft-message">
              <p>まだMinecraft作品がありません</p>
              <p class="sub-message">がんばって作品をつくろう！</p>
            </div>
            <div class="section-hint">
              <p>💡 スクロールすると3Dモデルが順番に読み込まれます。マウスでドラッグしてかいてんさせたり、ホイールでズームできるよ！</p>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.student-dashboard-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
}

/* タブレット 1280x800: 縦方向を有効活用しファーストビューでカードが見えるように */
@media (max-height: 900px) {
  .dashboard-content {
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
  }

  .section-header {
    margin-bottom: 1rem;
  }

  .section-hint {
    margin-top: 1rem;
  }

  .minecraft-grid {
    margin-bottom: 1rem;
  }
}

/* 横画面（ランドスケープ）極端に低い場合 */
@media (orientation: landscape) and (max-height: 500px) {
  .dashboard-content {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }

  .section-header {
    font-size: 1.5rem;
    margin-bottom: 0.75rem;
  }
}

/* 大画面（4Kなど）対応 */
@media (min-width: 1536px) {
  .dashboard-content {
    max-width: 1600px;
  }
}

.dashboard-content {
  padding: 1rem;
  max-width: 1400px;
  margin: 0 auto;
}

@media (min-width: 640px) {
  .dashboard-content {
    padding: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .dashboard-content {
    padding: 2rem;
  }
}

.section-content {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.section-header {
  font-size: 1.75rem;
  font-weight: bold;
  color: white;
  text-align: center;
  margin-bottom: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

@media (min-width: 640px) {
  .section-header {
    font-size: 2rem;
    margin-bottom: 1.75rem;
  }
}

@media (min-width: 1024px) {
  .section-header {
    font-size: 2.5rem;
    margin-bottom: 2rem;
  }
}

/* ガチャセクション */
.gacha-section {
  width: 100%;
}

.gacha-machine-wrapper {
  max-width: 800px;
  margin: 0 auto;
}

.section-hint {
  margin-top: 2rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
}

/* カードギャラリーセクション */
.gallery-section {
  width: 100%;
}

/* Minecraftセクション */
.minecraft-section {
  width: 100%;
}

.minecraft-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
  justify-items: center;
}

@media (min-width: 640px) {
  .minecraft-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.75rem;
  }
}

@media (min-width: 768px) {
  .minecraft-grid {
    gap: 2rem;
  }
}

@media (min-width: 1024px) {
  .minecraft-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1280px) {
  .minecraft-grid {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
}

.no-minecraft-message {
  text-align: center;
  padding: 4rem 2rem;
  color: rgba(255, 255, 255, 0.7);
}

.no-minecraft-message p {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}

.sub-message {
  font-size: 1rem;
  opacity: 0.8;
}

/* セクション切り替えアニメーション */
.section-fade-enter-active,
.section-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.section-fade-enter-from,
.section-fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* レスポンシブ対応: 追加の微調整 */
@media (max-width: 639.98px) {
  .gacha-machine-wrapper {
    padding: 0 0.5rem;
  }
  
  .section-hint {
    font-size: 0.75rem;
    padding: 0 1rem;
  }
}

/* アクセシビリティ: アニメーションを好まないユーザー向け */
@media (prefers-reduced-motion: reduce) {
  .section-content,
  .section-fade-enter-active,
  .section-fade-leave-active {
    animation: none;
    transition: none;
  }
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  color: white;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid rgba(255, 255, 255, 0.1);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 同期インジケータ */
.sync-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.2) 100%);
  border-bottom: 1px solid rgba(59, 130, 246, 0.3);
  backdrop-filter: blur(10px);
}

.sync-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: #60a5fa;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.sync-text {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.9);
}

.sync-fade-enter-active,
.sync-fade-leave-active {
  transition: opacity 0.3s ease, max-height 0.3s ease;
}

.sync-fade-enter-from,
.sync-fade-leave-to {
  opacity: 0;
}

/* ガチャ開封エラー表示 */
.gacha-open-error {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(185, 28, 28, 0.2) 100%);
  border-bottom: 1px solid rgba(239, 68, 68, 0.3);
  backdrop-filter: blur(10px);
}

.gacha-open-error-text {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.95);
}
</style>

