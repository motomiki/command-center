<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import DropZone from '@/components/common/DropZone.vue';
import MinecraftViewer from '@/components/MinecraftViewer.vue';
import SsrCard from '@/components/SsrCard.vue';
import { useRepository } from '@/composables/useRepository';
import { resolveAssetForSave, buildAssetPath } from '@/services/StorageService';
import { saveAsset, getAssetUrl } from '@/utils/assetStore';
import { useToast } from '@/composables/useToast';
import { getNextIssueNumber } from '@/utils/issueNumber';
import { placeholders } from '@/utils/placeholder';
import { withTimeout } from '@/utils/timeout';
import { getRarityDisplayName } from '@/utils/rarity';
import type { Rarity } from '@/types/card';

interface Props {
  studentId: string;
}

const props = defineProps<Props>();
const { addToast } = useToast();
const { works, cards } = useRepository();

const DRAFT_KEY = 'minecraft_form_draft';

// ---------------------------------------------------------------------------
// Step management: 1=入力フォーム, 2=確認画面, 3=カードプレビュー
// ---------------------------------------------------------------------------
const currentStep = ref<1 | 2 | 3>(1);

const formData = ref({
  title: '',
  description: '',
  createdAt: new Date().toISOString().split('T')[0],
  modelAssetId: '',
  screenshotAssetId: '',
  makeCodeUrl: '',
});

// ---------------------------------------------------------------------------
// Card customization data (Step 3)
// ---------------------------------------------------------------------------
const RARITY_OPTIONS: Rarity[] = ['C', 'U', 'R', 'RR', 'SR', 'UR'];

const cardFormData = ref({
  title: '',
  description: '',
  rarity: 'R' as Rarity,
});

const modelFile = ref<File | null>(null);
const screenshotFile = ref<File | null>(null);
const modelPreviewUrl = ref<string | null>(null);
const screenshotPreviewUrl = ref<string | null>(null);

const isSubmitting = ref(false);

// URL for confirmation / card preview (blob or idb://)
const confirmModelUrl = computed(() =>
  modelPreviewUrl.value || (formData.value.modelAssetId ? `idb://${formData.value.modelAssetId}` : undefined)
);
const confirmScreenshotUrl = computed(() =>
  screenshotPreviewUrl.value || (formData.value.screenshotAssetId ? `idb://${formData.value.screenshotAssetId}` : undefined)
);

// ---------------------------------------------------------------------------
// Card preview computed (Step 3) — SsrCard に渡すデータ
// ---------------------------------------------------------------------------
const previewCardData = computed(() => ({
  id: `preview-${Date.now()}`,
  studentId: props.studentId,
  date: formData.value.createdAt,
  title: cardFormData.value.title,
  description: cardFormData.value.description || 'Minecraft作品',
  imageUrl: confirmScreenshotUrl.value || placeholders.minecraftScreenshot('Minecraft'),
  rarity: cardFormData.value.rarity,
  isOpened: true,
  type: 'minecraft' as const,
}));

// レアリティごとのカラーマップ（ボタンスタイル用）
const rarityColorMap: Record<Rarity, { bg: string; ring: string; text: string; label: string }> = {
  C: { bg: 'bg-gray-100', ring: 'ring-gray-400', text: 'text-gray-700', label: 'コモン' },
  U: { bg: 'bg-yellow-50', ring: 'ring-yellow-400', text: 'text-yellow-700', label: 'アンコモン' },
  R: { bg: 'bg-green-50', ring: 'ring-green-500', text: 'text-green-700', label: 'レア' },
  RR: { bg: 'bg-blue-50', ring: 'ring-blue-500', text: 'text-blue-700', label: 'ダブルレア' },
  SR: { bg: 'bg-orange-50', ring: 'ring-orange-500', text: 'text-orange-700', label: 'スーパーレア' },
  UR: { bg: 'bg-purple-50', ring: 'ring-purple-500', text: 'text-purple-700', label: 'ウルトラレア' },
};

// ステップインジケータ用
const steps = [
  { num: 1, label: '入力' },
  { num: 2, label: '確認' },
  { num: 3, label: 'カード' },
];

// Draft Saving
watch(formData, (newVal) => {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(newVal));
}, { deep: true });

onMounted(async () => {
  const savedDraft = localStorage.getItem(DRAFT_KEY);
  if (savedDraft) {
    try {
      const parsed = JSON.parse(savedDraft);
      formData.value = {
        ...formData.value,
        ...parsed,
      };

      if (formData.value.modelAssetId) {
        modelPreviewUrl.value = await getAssetUrl(formData.value.modelAssetId) || null;
      }
      if (formData.value.screenshotAssetId) {
        screenshotPreviewUrl.value = await getAssetUrl(formData.value.screenshotAssetId) || null;
      }

      addToast('下書きを復元しました', '前回の入力内容を復元しました。', 'info', 3000);
    } catch (e) {
      console.error('Draft restore failed', e);
    }
  }
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
const validateForm = (): string | null => {
  if (!formData.value.title.trim()) {
    return '作品名を入力してください';
  }
  if (!formData.value.createdAt) {
    return '作成日を入力してください';
  }
  return null;
};

// ---------------------------------------------------------------------------
// File Handling
// ---------------------------------------------------------------------------
const handleModelFilesDropped = async (files: File[]) => {
  if (files.length === 0) return;
  const file = files[0];
  modelFile.value = file;
  modelPreviewUrl.value = URL.createObjectURL(file);

  try {
    const assetId = await saveAsset(file);
    formData.value.modelAssetId = assetId;
    addToast('3Dモデルを読み込みました', file.name, 'success', 2000);
  } catch (e) {
    addToast('保存エラー', '3Dモデルの一時保存に失敗しました', 'error');
  }
};

const handleScreenshotFilesDropped = async (files: File[]) => {
  if (files.length === 0) return;
  const file = files[0];
  screenshotFile.value = file;
  screenshotPreviewUrl.value = URL.createObjectURL(file);

  try {
    const assetId = await saveAsset(file);
    formData.value.screenshotAssetId = assetId;
    addToast('画像を読み込みました', file.name, 'success', 2000);
  } catch (e) {
    addToast('保存エラー', '画像の一時保存に失敗しました', 'error');
  }
};

const handleError = (msg: string) => {
  addToast('エラー', msg, 'error');
};

// ---------------------------------------------------------------------------
// Navigation: Step 1 → 2 → 3, with Back support
// ---------------------------------------------------------------------------

/** Step 1 → Step 2: バリデーション通過後、確認画面へ */
const handleSubmit = () => {
  const validationError = validateForm();
  if (validationError) {
    addToast('入力エラー', validationError, 'warning');
    return;
  }
  currentStep.value = 2;
};

/** Step 2 → Step 1: 確認画面から入力フォームへ戻る */
const handleBackToEdit = () => {
  currentStep.value = 1;
};

/** Step 2 → Step 3: カードプレビューへ遷移（formData → cardFormData 転記） */
const handleToCardPreview = () => {
  cardFormData.value = {
    title: formData.value.title.trim(),
    description: formData.value.description.trim(),
    rarity: 'R',
  };
  currentStep.value = 3;
};

/** Step 3 → Step 2: カードプレビューから確認画面へ戻る */
const handleBackToConfirm = () => {
  currentStep.value = 2;
};

// ---------------------------------------------------------------------------
// Save (Step 3 → 完了)
// ---------------------------------------------------------------------------
const executeSave = async () => {
  isSubmitting.value = true;
  try {
    const workId = crypto.randomUUID();

    // ファイルを Storage にアップロード（Supabase 設定時）または idb:// URL を使用
    const finalModelUrl = await resolveAssetForSave(
      modelFile.value,
      formData.value.modelAssetId,
      buildAssetPath(props.studentId, workId, 'model.glb'),
    );

    const screenshotExt = screenshotFile.value?.name.split('.').pop() || 'png';
    const finalScreenshotUrl = await resolveAssetForSave(
      screenshotFile.value,
      formData.value.screenshotAssetId,
      buildAssetPath(props.studentId, workId, `screenshot.${screenshotExt}`),
    );

    // Minecraft 作品を保存
    await works.save({
      id: workId,
      studentId: props.studentId,
      title: formData.value.title.trim(),
      description: formData.value.description.trim(),
      modelUrl: finalModelUrl,
      screenshotUrl: finalScreenshotUrl,
      makeCodeUrl: formData.value.makeCodeUrl.trim() || undefined,
      createdAt: formData.value.createdAt,
    });

    // 通し番号を付与するため全カードを取得して次番号を算出
    const allCards = await withTimeout(
      cards.getAll(),
      10_000,
      'データの読み込みがタイムアウトしました。もう一度お試しください。',
    );
    const nextIssueNumber = getNextIssueNumber(allCards);

    // cardFormData のカスタマイズ値を使用してカードを作成
    await cards.save({
      id: crypto.randomUUID(),
      studentId: props.studentId,
      date: formData.value.createdAt,
      title: cardFormData.value.title.trim(),
      description: cardFormData.value.description.trim() || 'Minecraft作品',
      imageUrl: finalScreenshotUrl || placeholders.minecraftScreenshot('Minecraft'),
      rarity: cardFormData.value.rarity,
      isOpened: false,
      type: 'minecraft',
      minecraftData: {
        modelUrl: finalModelUrl,
        screenshotUrl: finalScreenshotUrl,
        makeCodeUrl: formData.value.makeCodeUrl.trim() || undefined,
      },
      issueNumber: nextIssueNumber,
    });

    addToast('保存完了', 'Minecraft作品とカードを登録しました！', 'success');
    currentStep.value = 1;

    formData.value = {
      title: '',
      description: '',
      createdAt: new Date().toISOString().split('T')[0],
      modelAssetId: '',
      screenshotAssetId: '',
      makeCodeUrl: '',
    };
    cardFormData.value = { title: '', description: '', rarity: 'R' };
    modelFile.value = null;
    screenshotFile.value = null;
    modelPreviewUrl.value = null;
    screenshotPreviewUrl.value = null;
    localStorage.removeItem(DRAFT_KEY);
  } catch (error) {
    addToast('保存失敗', error instanceof Error ? error.message : '保存に失敗しました', 'error');
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="minecraft-form-container">
    <!-- ステップインジケータ -->
    <div class="step-indicator">
      <div
        v-for="step in steps"
        :key="step.num"
        class="step-item"
        :class="{
          'step-active': currentStep === step.num,
          'step-completed': currentStep > step.num,
        }"
      >
        <div class="step-circle">
          <span v-if="currentStep > step.num" class="material-symbols-outlined step-check-icon">check</span>
          <span v-else>{{ step.num }}</span>
        </div>
        <span class="step-label">{{ step.label }}</span>
      </div>
      <div class="step-connector" :style="{ '--progress': `${((currentStep - 1) / (steps.length - 1)) * 100}%` }"></div>
    </div>

    <div class="form-card">
      <Transition name="form-slide" mode="out-in">
        <!-- ============================== -->
        <!-- Step 1: 入力フォーム            -->
        <!-- ============================== -->
        <div v-if="currentStep === 1" key="form" class="form-view">
          <h3 class="form-title">🎮 Minecraft成果物登録</h3>
          <p class="form-description">生徒のMinecraft作品を登録してください</p>

          <form @submit.prevent="handleSubmit" class="form">
            <div class="form-grid">
              <div class="input-section">
                <div class="form-group">
                  <label for="minecraft-title" class="form-label">作品名 <span class="required">*</span></label>
                  <input
                    id="minecraft-title"
                    v-model="formData.title"
                    type="text"
                    class="form-input"
                    placeholder="例: むらさきのせかい"
                    required
                  />
                </div>

                <div class="form-group">
                  <label for="minecraft-date" class="form-label">作成日 <span class="required">*</span></label>
                  <input
                    id="minecraft-date"
                    v-model="formData.createdAt"
                    type="date"
                    class="form-input"
                    required
                  />
                </div>

                <div class="form-group">
                  <label for="minecraft-makecode" class="form-label">MakeCode URL</label>
                  <input
                    id="minecraft-makecode"
                    v-model="formData.makeCodeUrl"
                    type="url"
                    class="form-input"
                    placeholder="https://..."
                  />
                </div>

                <div class="form-group">
                  <label for="minecraft-description" class="form-label">作品の説明</label>
                  <textarea
                    id="minecraft-description"
                    v-model="formData.description"
                    class="form-textarea"
                    rows="4"
                    placeholder="作品のポイントやがんばったところ..."
                  ></textarea>
                </div>
              </div>

              <div class="upload-section">
                <div class="form-group">
                  <label class="form-label">3Dモデル (.glb)</label>
                  <DropZone
                    accept=".glb,model/gltf-binary"
                    :max-size-m-b="50"
                    @files-dropped="handleModelFilesDropped"
                    @error="handleError"
                  >
                    <div v-if="modelPreviewUrl" class="file-preview">
                      <span class="file-icon">📦</span>
                      <span class="file-status">アップロード完了</span>
                    </div>
                    <div v-else>
                      <p class="primary-text">3Dモデルをドロップ</p>
                      <p class="secondary-text">またはクリック (.glb)</p>
                    </div>
                  </DropZone>
                </div>

                <div class="form-group">
                  <label class="form-label">スクリーンショット</label>
                  <DropZone
                    accept="image/*"
                    :max-size-m-b="10"
                    @files-dropped="handleScreenshotFilesDropped"
                    @error="handleError"
                  >
                    <div v-if="screenshotPreviewUrl" class="image-preview-wrapper">
                      <img :src="screenshotPreviewUrl" class="preview-img" alt="" />
                    </div>
                    <div v-else>
                      <p class="primary-text">画像をドロップ</p>
                    </div>
                  </DropZone>
                </div>
              </div>
            </div>

            <button
              type="submit"
              :disabled="isSubmitting"
              class="submit-button"
              :class="{ submitting: isSubmitting }"
            >
              <span v-if="!isSubmitting">確認画面へ</span>
              <span v-else>保存中...</span>
            </button>
          </form>
        </div>

        <!-- ============================== -->
        <!-- Step 2: 確認画面                -->
        <!-- ============================== -->
        <div v-else-if="currentStep === 2" key="confirm" class="confirm-view">
          <h3 class="form-title">📋 登録内容の確認</h3>
          <p class="form-description">以下の内容で登録しますか？</p>

          <div class="confirm-layout">
            <div class="confirm-preview">
              <MinecraftViewer
                v-if="confirmModelUrl || confirmScreenshotUrl"
                :model-url="confirmModelUrl"
                :screenshot-url="confirmScreenshotUrl"
                :make-code-url="formData.makeCodeUrl.trim() || undefined"
                :title="formData.title.trim()"
                alt="登録する作品のプレビュー"
              />
              <div v-else class="confirm-no-assets">
                <span class="confirm-no-assets-icon">📦</span>
                <p>3Dモデル・スクリーンショットは未登録です</p>
              </div>
            </div>

            <dl class="confirm-meta">
              <div class="confirm-meta-row">
                <dt class="confirm-meta-label">作品名</dt>
                <dd class="confirm-meta-value">{{ formData.title.trim() || '—' }}</dd>
              </div>
              <div class="confirm-meta-row">
                <dt class="confirm-meta-label">作成日</dt>
                <dd class="confirm-meta-value">{{ formData.createdAt || '—' }}</dd>
              </div>
              <div class="confirm-meta-row">
                <dt class="confirm-meta-label">MakeCode URL</dt>
                <dd class="confirm-meta-value">
                  <a
                    v-if="formData.makeCodeUrl.trim()"
                    :href="formData.makeCodeUrl.trim()"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="confirm-link"
                  >{{ formData.makeCodeUrl.trim() }}</a>
                  <span v-else>—</span>
                </dd>
              </div>
              <div class="confirm-meta-row">
                <dt class="confirm-meta-label">スクリーンショット</dt>
                <dd class="confirm-meta-value">
                  <img
                    v-if="screenshotPreviewUrl"
                    :src="screenshotPreviewUrl"
                    alt="登録するスクリーンショット"
                    class="confirm-screenshot-thumb"
                    @error="($event.target as HTMLImageElement).style.display = 'none'"
                  />
                  <span v-else>—</span>
                </dd>
              </div>
              <div v-if="formData.description.trim()" class="confirm-meta-row">
                <dt class="confirm-meta-label">作品の説明</dt>
                <dd class="confirm-meta-value confirm-description">{{ formData.description.trim() }}</dd>
              </div>
            </dl>
          </div>

          <div class="confirm-actions">
            <button
              type="button"
              class="button-secondary"
              :disabled="isSubmitting"
              @click="handleBackToEdit"
            >
              戻って修正する
            </button>
            <button
              type="button"
              class="submit-button"
              :disabled="isSubmitting"
              @click="handleToCardPreview"
            >
              カードを作成する
            </button>
          </div>
        </div>

        <!-- ============================== -->
        <!-- Step 3: カードプレビュー        -->
        <!-- ============================== -->
        <div v-else key="card-preview" class="card-preview-view">
          <h3 class="form-title">🃏 トレーディングカード プレビュー</h3>
          <p class="form-description">カードのレアリティや内容をカスタマイズできます</p>

          <div class="card-preview-layout">
            <!-- 左: カードプレビュー -->
            <div class="card-preview-left">
              <div class="card-preview-wrapper">
                <SsrCard
                  :title="previewCardData.title"
                  :image-url="previewCardData.imageUrl"
                  :description="previewCardData.description"
                  :rarity="previewCardData.rarity"
                  :date="previewCardData.date"
                  :id="previewCardData.id"
                />
              </div>
              <p class="card-preview-hint">カードにマウスを乗せると光沢エフェクトが見られます</p>
            </div>

            <!-- 右: カスタマイズコントロール -->
            <div class="card-preview-right">
              <!-- レアリティ選択 -->
              <div class="card-control-section">
                <label class="card-control-label">
                  <span class="material-symbols-outlined card-control-icon">stars</span>
                  レアリティ
                </label>
                <div class="rarity-grid">
                  <button
                    v-for="r in RARITY_OPTIONS"
                    :key="r"
                    type="button"
                    class="rarity-btn"
                    :class="[
                      rarityColorMap[r].bg,
                      rarityColorMap[r].text,
                      cardFormData.rarity === r
                        ? `ring-2 ${rarityColorMap[r].ring} rarity-btn-active`
                        : 'ring-1 ring-gray-200',
                    ]"
                    @click="cardFormData.rarity = r"
                  >
                    <span class="rarity-btn-code">{{ r }}</span>
                    <span class="rarity-btn-name">{{ rarityColorMap[r].label }}</span>
                  </button>
                </div>
              </div>

              <!-- カードタイトル -->
              <div class="card-control-section">
                <label for="card-title" class="card-control-label">
                  <span class="material-symbols-outlined card-control-icon">title</span>
                  カードタイトル
                </label>
                <input
                  id="card-title"
                  v-model="cardFormData.title"
                  type="text"
                  class="form-input"
                  placeholder="カードに表示するタイトル"
                />
              </div>

              <!-- カード説明 -->
              <div class="card-control-section">
                <label for="card-description" class="card-control-label">
                  <span class="material-symbols-outlined card-control-icon">description</span>
                  カードの説明
                </label>
                <textarea
                  id="card-description"
                  v-model="cardFormData.description"
                  class="form-textarea"
                  rows="3"
                  placeholder="カードに表示する説明文..."
                ></textarea>
              </div>

              <!-- カード情報サマリー -->
              <div class="card-info-summary">
                <div class="card-info-row">
                  <span class="card-info-label">レアリティ</span>
                  <span
                    class="card-info-value card-info-rarity"
                    :class="rarityColorMap[cardFormData.rarity].text"
                  >
                    {{ cardFormData.rarity }} {{ getRarityDisplayName(cardFormData.rarity) }}
                  </span>
                </div>
                <div class="card-info-row">
                  <span class="card-info-label">作成日</span>
                  <span class="card-info-value">{{ formData.createdAt }}</span>
                </div>
                <div class="card-info-row">
                  <span class="card-info-label">画像</span>
                  <span class="card-info-value">{{ confirmScreenshotUrl ? 'スクリーンショット使用' : 'デフォルト画像' }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="confirm-actions">
            <button
              type="button"
              class="button-secondary"
              :disabled="isSubmitting"
              @click="handleBackToConfirm"
            >
              確認画面に戻る
            </button>
            <button
              type="button"
              class="submit-button submit-button-save"
              :disabled="isSubmitting"
              :class="{ submitting: isSubmitting }"
              @click="executeSave"
            >
              <span v-if="!isSubmitting">
                <span class="material-symbols-outlined btn-icon">save</span>
                作品とカードを保存する
              </span>
              <span v-else>保存中...</span>
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.minecraft-form-container {
  width: 100%;
}

/* =========================================
   Step Indicator
   ========================================= */
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2.5rem;
  margin-bottom: 1.5rem;
  position: relative;
  padding: 0 1rem;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  z-index: 1;
}

.step-circle {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 700;
  background: #e2e8f0;
  color: #94a3b8;
  border: 2px solid #e2e8f0;
  transition: all 0.3s ease;
}

.step-active .step-circle {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
}

.step-completed .step-circle {
  background: #10b981;
  color: white;
  border-color: #10b981;
}

.step-check-icon {
  font-size: 1rem;
}

.step-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
  transition: color 0.3s ease;
}

.step-active .step-label {
  color: #3b82f6;
}

.step-completed .step-label {
  color: #10b981;
}

.step-connector {
  position: absolute;
  top: 1.125rem;
  left: calc(50% - 4.5rem);
  right: calc(50% - 4.5rem);
  height: 2px;
  background: #e2e8f0;
  z-index: 0;
}

.step-connector::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: var(--progress, 0%);
  background: linear-gradient(90deg, #10b981, #3b82f6);
  transition: width 0.4s ease;
}

/* =========================================
   Form Card
   ========================================= */
.form-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
}

.form-title {
  font-size: 1.5rem;
  font-weight: bold;
  color: #1e3a8a;
  margin: 0 0 0.5rem 0;
}

.form-description {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0 0 2rem 0;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

@media (min-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e3a8a;
}

.required {
  color: #ef4444;
}

.form-input, .form-textarea {
  padding: 0.875rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
  width: 100%;
}

.form-input:focus, .form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.file-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: #10b981;
}

.file-icon {
  font-size: 2rem;
}

.image-preview-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  border-radius: 8px;
}

.preview-img {
  max-width: 100%;
  max-height: 150px;
  object-fit: contain;
}

.submit-button {
  width: 100%;
  padding: 1rem;
  margin-top: 1rem;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.125rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 12px rgba(59, 130, 246, 0.4);
}

.submit-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.submit-button-save {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.submit-button-save:hover:not(:disabled) {
  box-shadow: 0 8px 12px rgba(16, 185, 129, 0.4);
}

.btn-icon {
  font-size: 1.25rem;
  vertical-align: middle;
}

.primary-text {
  font-weight: 600;
  color: #334155;
}
.secondary-text {
  font-size: 0.875rem;
  color: #64748b;
}

/* =========================================
   Confirm View (Step 2)
   ========================================= */
.form-view,
.confirm-view,
.card-preview-view {
  width: 100%;
}

.confirm-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

@media (min-width: 768px) {
  .confirm-layout {
    grid-template-columns: 1fr 1fr;
  }
}

.confirm-preview {
  min-height: 280px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.confirm-no-assets {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  background: #f8fafc;
  color: #64748b;
  font-size: 0.875rem;
}

.confirm-no-assets-icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.confirm-meta {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 0;
}

.confirm-meta-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 0.5rem;
  align-items: start;
  margin: 0;
}

.confirm-meta-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #64748b;
  margin: 0;
}

.confirm-meta-value {
  font-size: 0.9375rem;
  color: #1e293b;
  margin: 0;
  word-break: break-all;
}

.confirm-meta-value.confirm-description {
  white-space: pre-wrap;
}

.confirm-screenshot-thumb {
  display: block;
  max-width: 100%;
  width: 200px;
  max-height: 120px;
  object-fit: contain;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.confirm-link {
  color: #3b82f6;
  text-decoration: underline;
}

.confirm-link:hover {
  color: #2563eb;
}

.confirm-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.confirm-actions .submit-button {
  flex: 1;
  min-width: 140px;
  margin-top: 0;
}

.button-secondary {
  padding: 1rem 1.5rem;
  background: #f1f5f9;
  color: #475569;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.button-secondary:hover:not(:disabled) {
  background: #e2e8f0;
  border-color: #cbd5e1;
  color: #334155;
}

.button-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* =========================================
   Card Preview View (Step 3)
   ========================================= */
.card-preview-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  margin-bottom: 1rem;
}

@media (min-width: 768px) {
  .card-preview-layout {
    grid-template-columns: 300px 1fr;
    align-items: start;
  }
}

@media (min-width: 1024px) {
  .card-preview-layout {
    grid-template-columns: 340px 1fr;
  }
}

/* カードプレビュー（左） */
.card-preview-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

/* カードプレビューに幅を渡し、aspect-ratio が正しく効くようにする（CardGenerationForm の .preview-wrapper に合わせる） */
.card-preview-wrapper {
  display: block;
  width: 100%;
  max-width: 320px;
  min-width: 0;
  margin-bottom: 1rem;
}

.card-preview-hint {
  font-size: 0.75rem;
  color: #94a3b8;
  text-align: center;
  margin: 0;
}

/* カスタマイズコントロール（右） */
.card-preview-right {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.card-control-section {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.card-control-label {
  font-size: 0.875rem;
  font-weight: 700;
  color: #1e3a8a;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.card-control-icon {
  font-size: 1.125rem;
  color: #3b82f6;
}

/* レアリティボタングリッド */
.rarity-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

@media (min-width: 480px) {
  .rarity-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

@media (min-width: 768px) {
  .rarity-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1024px) {
  .rarity-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.rarity-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
  padding: 0.625rem 0.375rem;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.rarity-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.5) 0%, transparent 60%);
  transition: opacity 0.2s ease;
}

.rarity-btn:hover::before {
  opacity: 1;
}

.rarity-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.rarity-btn-active {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.rarity-btn-code {
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: 0.05em;
}

.rarity-btn-name {
  font-size: 0.625rem;
  font-weight: 600;
  opacity: 0.8;
}

/* カード情報サマリー */
.card-info-summary {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.card-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-info-label {
  font-size: 0.8125rem;
  color: #64748b;
  font-weight: 500;
}

.card-info-value {
  font-size: 0.875rem;
  color: #1e293b;
  font-weight: 600;
}

.card-info-rarity {
  font-weight: 800;
}

/* =========================================
   Transition
   ========================================= */
.form-slide-enter-active,
.form-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.25s ease;
}

.form-slide-enter-from {
  opacity: 0;
  transform: translateX(12px);
}

.form-slide-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}
</style>

