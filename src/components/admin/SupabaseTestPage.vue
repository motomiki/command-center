<script setup lang="ts">
import { ref, computed } from 'vue';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

interface TestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  detail?: string;
  hint?: string;
}

interface DiagnosticItem {
  label: string;
  status: 'pass' | 'fail' | 'pending' | 'skip';
  detail: string;
  hint?: string;
  latencyMs?: number;
}

// ---------------------------------------------------------------------------
// リアクティブ状態
// ---------------------------------------------------------------------------

const isTesting = ref(false);
const isRunningDiagnostics = ref(false);
const lastResult = ref<TestResult | null>(null);
const diagnosticResults = ref<DiagnosticItem[]>([]);

// ---------------------------------------------------------------------------
// 環境変数の表示
// ---------------------------------------------------------------------------

const supabaseUrl = computed(() => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) return null;
  try {
    const u = new URL(url);
    return `${u.origin}`;
  } catch {
    return '(形式不正)';
  }
});

const anonKeyStatus = computed(() => {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!key) return '未設定';
  return `${key.slice(0, 12)}...${key.slice(-4)}`;
});

const envReady = computed(
  () =>
    !!import.meta.env.VITE_SUPABASE_URL &&
    !!import.meta.env.VITE_SUPABASE_ANON_KEY,
);

// ---------------------------------------------------------------------------
// 接続テスト（シンプル版）
// ---------------------------------------------------------------------------

async function runConnectionTest() {
  if (!envReady.value) {
    lastResult.value = {
      success: false,
      message: '環境変数が未設定です',
      detail: '.env に VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定してください。',
      hint: '.env.example を参考にしてください。',
    };
    return;
  }

  isTesting.value = true;
  lastResult.value = null;

  const start = performance.now();
  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    const latencyMs = Math.round(performance.now() - start);

    if (error) {
      lastResult.value = {
        success: false,
        message: '接続エラー',
        latencyMs,
        detail: error.message,
        hint: resolveErrorHint(error.message),
      };
      return;
    }

    lastResult.value = {
      success: true,
      message: '接続成功',
      latencyMs,
      detail: `profiles テーブル: ${count ?? 0} 件`,
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    const message = err instanceof Error ? err.message : String(err);
    lastResult.value = {
      success: false,
      message: '接続失敗',
      latencyMs,
      detail: message,
      hint: resolveErrorHint(message),
    };
  } finally {
    isTesting.value = false;
  }
}

// ---------------------------------------------------------------------------
// 包括診断テスト
// ---------------------------------------------------------------------------

async function runFullDiagnostics() {
  if (!envReady.value) {
    lastResult.value = {
      success: false,
      message: '環境変数が未設定です',
      detail: '診断を実行するには .env の設定が必要です。',
    };
    return;
  }

  isRunningDiagnostics.value = true;
  diagnosticResults.value = [];

  // 1. DB 接続テスト
  diagnosticResults.value.push({
    label: 'データベース接続',
    status: 'pending',
    detail: 'テスト中...',
  });
  await runDiagnosticDbConnection();

  // 2. profiles テーブル
  diagnosticResults.value.push({
    label: 'profiles テーブル',
    status: 'pending',
    detail: 'テスト中...',
  });
  await runDiagnosticTable('profiles', 1);

  // 3. cards テーブル
  diagnosticResults.value.push({
    label: 'cards テーブル',
    status: 'pending',
    detail: 'テスト中...',
  });
  await runDiagnosticTable('cards', 2);

  // 4. minecraft_works テーブル
  diagnosticResults.value.push({
    label: 'minecraft_works テーブル',
    status: 'pending',
    detail: 'テスト中...',
  });
  await runDiagnosticTable('minecraft_works', 3);

  // 5. Storage バケット
  diagnosticResults.value.push({
    label: 'Storage バケット (assets)',
    status: 'pending',
    detail: 'テスト中...',
  });
  await runDiagnosticStorage();

  isRunningDiagnostics.value = false;
}

async function runDiagnosticDbConnection() {
  const idx = 0;
  const start = performance.now();
  try {
    const { error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    const latencyMs = Math.round(performance.now() - start);

    if (error) {
      diagnosticResults.value[idx] = {
        label: 'データベース接続',
        status: 'fail',
        detail: error.message,
        hint: resolveErrorHint(error.message),
        latencyMs,
      };
    } else {
      diagnosticResults.value[idx] = {
        label: 'データベース接続',
        status: 'pass',
        detail: `応答 OK (${latencyMs}ms)`,
        latencyMs,
      };
    }
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    const msg = err instanceof Error ? err.message : String(err);
    diagnosticResults.value[idx] = {
      label: 'データベース接続',
      status: 'fail',
      detail: msg,
      hint: 'ネットワーク接続と Supabase プロジェクト URL を確認してください。',
      latencyMs,
    };
  }
}

async function runDiagnosticTable(
  tableName: 'profiles' | 'cards' | 'minecraft_works',
  idx: number,
) {
  const start = performance.now();
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('id', { count: 'exact', head: true });

    const latencyMs = Math.round(performance.now() - start);

    if (error) {
      diagnosticResults.value[idx] = {
        label: `${tableName} テーブル`,
        status: 'fail',
        detail: error.message,
        hint: error.message.includes('does not exist')
          ? `テーブルが存在しません。supabase/schema.sql を SQL Editor で実行してください。`
          : resolveErrorHint(error.message),
        latencyMs,
      };
    } else {
      diagnosticResults.value[idx] = {
        label: `${tableName} テーブル`,
        status: 'pass',
        detail: `${count ?? 0} 件のレコード`,
        latencyMs,
      };
    }
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    const msg = err instanceof Error ? err.message : String(err);
    diagnosticResults.value[idx] = {
      label: `${tableName} テーブル`,
      status: 'fail',
      detail: msg,
      latencyMs,
    };
  }
}

async function runDiagnosticStorage() {
  const idx = 4;
  const start = performance.now();
  try {
    // listBuckets() は anon キーでは RLS により空配列を返すため、
    // 代わりに「assets バケット内の list」で存在・アクセス可否を確認する。
    const { data, error } = await supabase.storage
      .from('assets')
      .list('', { limit: 1 });

    const latencyMs = Math.round(performance.now() - start);

    if (error) {
      const isNotFound =
        /not found|bucket.*not exist|resource was not found/i.test(error.message);
      diagnosticResults.value[idx] = {
        label: 'Storage バケット (assets)',
        status: 'fail',
        detail: error.message,
        hint: isNotFound
          ? 'ダッシュボードの Storage → New bucket で "assets" を作成（Public をオン）し、その後 supabase/storage.sql でポリシーを適用してください。'
          : 'バケットは存在するがアクセス拒否の可能性があります。supabase/storage.sql のポリシーを適用してください。',
        latencyMs,
      };
      return;
    }

    // バケットにアクセスできた（data は配列。空でも成功）
    diagnosticResults.value[idx] = {
      label: 'Storage バケット (assets)',
      status: 'pass',
      detail: 'バケット検出・アクセス可能',
      latencyMs,
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    const msg = err instanceof Error ? err.message : String(err);
    diagnosticResults.value[idx] = {
      label: 'Storage バケット (assets)',
      status: 'fail',
      detail: msg,
      hint: 'ネットワーク接続を確認するか、ダッシュボードで "assets" バケットを作成し、storage.sql でポリシーを適用してください。',
      latencyMs,
    };
  }
}

// ---------------------------------------------------------------------------
// エラーヒント解決
// ---------------------------------------------------------------------------

function resolveErrorHint(errorMessage: string): string {
  const lower = errorMessage.toLowerCase();

  if (lower.includes('fetch') || lower.includes('network') || lower.includes('failed to fetch')) {
    return 'ネットワーク接続を確認してください。プロキシやファイアウォールがブロックしている可能性があります。';
  }
  if (lower.includes('invalid api key') || lower.includes('apikey')) {
    return 'VITE_SUPABASE_ANON_KEY が正しいか確認してください。Supabase ダッシュボード > Settings > API からコピーできます。';
  }
  if (lower.includes('jwt') || lower.includes('token')) {
    return 'Anon Key の形式が不正です。キーが途中で切れていないか確認してください。';
  }
  if (lower.includes('does not exist') || lower.includes('relation')) {
    return 'テーブルが存在しません。supabase/schema.sql を SQL Editor で実行してください。';
  }
  if (lower.includes('permission denied') || lower.includes('rls')) {
    return 'RLS ポリシーによりアクセスが拒否されました。開発中は supabase/dev_helper.sql で一時的に緩和できます。';
  }
  if (lower.includes('cors')) {
    return 'CORS エラーです。Supabase プロジェクトの URL が正しいか確認してください。';
  }

  return 'エラーの詳細を確認し、Supabase ダッシュボードの設定と照合してください。';
}

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

function statusIcon(status: DiagnosticItem['status']): string {
  switch (status) {
    case 'pass': return '✅';
    case 'fail': return '❌';
    case 'pending': return '⏳';
    case 'skip': return '⏭️';
  }
}
</script>

<template>
  <div class="supabase-test-page">
    <!-- ヘッダー -->
    <div class="page-header">
      <h2 class="page-title">Supabase 接続テスト</h2>
      <p class="page-description">
        データベースと Storage への接続を確認するためのページです
      </p>
    </div>

    <!-- 環境設定 -->
    <div class="config-section card">
      <h3 class="section-title">環境設定</h3>
      <dl class="config-list">
        <div class="config-item">
          <dt>VITE_SUPABASE_URL</dt>
          <dd :class="{ 'status-ok': supabaseUrl, 'status-ng': !supabaseUrl }">
            {{ supabaseUrl ?? '未設定' }}
          </dd>
        </div>
        <div class="config-item">
          <dt>VITE_SUPABASE_ANON_KEY</dt>
          <dd :class="{ 'status-ok': envReady, 'status-ng': !envReady }">
            {{ envReady ? anonKeyStatus : '未設定' }}
          </dd>
        </div>
      </dl>
      <p v-if="!envReady" class="env-hint">
        .env.example を参考に .env ファイルを作成してください
      </p>
    </div>

    <!-- アクション -->
    <div class="action-section card">
      <div class="action-buttons">
        <button
          type="button"
          class="test-button"
          :disabled="isTesting || isRunningDiagnostics || !envReady"
          @click="runConnectionTest"
        >
          {{ isTesting ? 'テスト中...' : '簡易テスト' }}
        </button>
        <button
          type="button"
          class="test-button test-button--full"
          :disabled="isTesting || isRunningDiagnostics || !envReady"
          @click="runFullDiagnostics"
        >
          {{ isRunningDiagnostics ? '診断中...' : '包括診断' }}
        </button>
      </div>
      <p v-if="!envReady" class="hint">
        .env に Supabase の URL と Anon Key を設定するとテストできます
      </p>
    </div>

    <!-- 簡易テスト結果 -->
    <div
      v-if="lastResult && diagnosticResults.length === 0"
      class="result-section card"
      :class="lastResult.success ? 'result-success' : 'result-error'"
    >
      <h3 class="section-title">
        {{ lastResult.success ? '✅ 結果' : '❌ 結果' }}
      </h3>
      <p class="result-message">{{ lastResult.message }}</p>
      <p v-if="lastResult.latencyMs != null" class="result-latency">
        応答時間: {{ lastResult.latencyMs }} ms
      </p>
      <p v-if="lastResult.detail" class="result-detail">
        {{ lastResult.detail }}
      </p>
      <p v-if="lastResult.hint" class="result-hint">
        💡 {{ lastResult.hint }}
      </p>
    </div>

    <!-- 包括診断結果 -->
    <div v-if="diagnosticResults.length > 0" class="diagnostics-section card">
      <h3 class="section-title">包括診断結果</h3>
      <ul class="diagnostic-list">
        <li
          v-for="(item, i) in diagnosticResults"
          :key="i"
          class="diagnostic-item"
          :class="`diagnostic-item--${item.status}`"
        >
          <div class="diagnostic-header">
            <span class="diagnostic-icon">{{ statusIcon(item.status) }}</span>
            <span class="diagnostic-label">{{ item.label }}</span>
            <span v-if="item.latencyMs != null" class="diagnostic-latency">
              {{ item.latencyMs }}ms
            </span>
          </div>
          <p class="diagnostic-detail">{{ item.detail }}</p>
          <p v-if="item.hint" class="diagnostic-hint">
            💡 {{ item.hint }}
          </p>
        </li>
      </ul>

      <!-- サマリー -->
      <div
        v-if="!isRunningDiagnostics"
        class="diagnostic-summary"
        :class="diagnosticResults.every(r => r.status === 'pass')
          ? 'diagnostic-summary--pass'
          : 'diagnostic-summary--fail'"
      >
        <template v-if="diagnosticResults.every(r => r.status === 'pass')">
          全チェック合格 — Supabase の準備は完了です!
        </template>
        <template v-else>
          {{ diagnosticResults.filter(r => r.status === 'fail').length }} 件の問題が見つかりました。
          上記のヒントを参考に修正してください。
        </template>
      </div>
    </div>

    <!-- セットアップ手順のリマインダー -->
    <div class="setup-reminder card">
      <h3 class="section-title">セットアップ手順</h3>
      <ol class="setup-steps">
        <li>
          <strong>schema.sql</strong> を SQL Editor で実行
          <span class="step-detail">テーブルと RLS ポリシーの作成</span>
        </li>
        <li>
          <strong>Storage</strong> で「New bucket」→ name: assets, Public: オン
          <span class="step-detail">その後 storage.sql でポリシーを適用</span>
        </li>
        <li>
          <strong>seeds.sql</strong> を SQL Editor で実行
          <span class="step-detail">テスト用データの投入</span>
        </li>
        <li>
          <strong>.env</strong> を設定
          <span class="step-detail">URL と Anon Key を記入</span>
        </li>
        <li>
          このページで <strong>包括診断</strong> を実行
          <span class="step-detail">全チェック合格を確認</span>
        </li>
      </ol>
      <p class="setup-note">
        詳細は docs/SETUP_GUIDE.md を参照してください
      </p>
    </div>
  </div>
</template>

<style scoped>
.supabase-test-page {
  max-width: 640px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page-header {
  margin-bottom: 0.25rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.25rem 0;
}

.page-description {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
}

/* ---- Card ---- */
.card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
  margin: 0 0 0.75rem 0;
}

/* ---- Config ---- */
.config-list {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  font-size: 0.875rem;
}

.config-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.config-list dt {
  color: #64748b;
  font-weight: 500;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.8125rem;
}

.config-list dd {
  margin: 0;
  color: #1e293b;
  word-break: break-all;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.8125rem;
}

.status-ok {
  color: #15803d;
}

.status-ng {
  color: #b91c1c;
  font-weight: 600;
}

.env-hint {
  margin: 0.75rem 0 0 0;
  font-size: 0.8125rem;
  color: #92400e;
  background: #fef3c7;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
}

/* ---- Actions ---- */
.action-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.test-button {
  padding: 0.75rem 1.5rem;
  min-height: 44px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.test-button--full {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
}

.test-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.test-button--full:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
}

.test-button:active:not(:disabled) {
  transform: translateY(0);
}

.test-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.hint {
  font-size: 0.8125rem;
  color: #64748b;
  margin: 0;
}

/* ---- 簡易テスト結果 ---- */
.result-section {
  border-left: 4px solid #22c55e;
}

.result-section.result-error {
  border-left-color: #ef4444;
}

.result-message {
  font-weight: 600;
  margin: 0 0 0.25rem 0;
  color: #1e293b;
}

.result-success .result-message {
  color: #15803d;
}

.result-error .result-message {
  color: #b91c1c;
}

.result-latency {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0 0 0.25rem 0;
}

.result-detail {
  font-size: 0.8125rem;
  color: #475569;
  margin: 0.5rem 0 0 0;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 6px;
  word-break: break-word;
}

.result-hint {
  font-size: 0.8125rem;
  color: #92400e;
  margin: 0.5rem 0 0 0;
  padding: 0.5rem 0.75rem;
  background: #fef3c7;
  border-radius: 6px;
}

/* ---- 包括診断 ---- */
.diagnostics-section {
  border-left: 4px solid #8b5cf6;
}

.diagnostic-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.diagnostic-item {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.diagnostic-item--pass {
  border-color: #bbf7d0;
  background: rgba(34, 197, 94, 0.04);
}

.diagnostic-item--fail {
  border-color: #fecaca;
  background: rgba(239, 68, 68, 0.04);
}

.diagnostic-item--pending {
  border-color: #e5e7eb;
  background: rgba(0, 0, 0, 0.02);
}

.diagnostic-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.diagnostic-icon {
  font-size: 1rem;
}

.diagnostic-label {
  font-weight: 600;
  font-size: 0.875rem;
  color: #334155;
}

.diagnostic-latency {
  margin-left: auto;
  font-size: 0.75rem;
  color: #94a3b8;
  font-family: 'Consolas', 'Monaco', monospace;
}

.diagnostic-detail {
  margin: 0;
  font-size: 0.8125rem;
  color: #475569;
}

.diagnostic-hint {
  margin: 0.375rem 0 0 0;
  font-size: 0.8125rem;
  color: #92400e;
  background: #fef3c7;
  padding: 0.375rem 0.625rem;
  border-radius: 4px;
}

.diagnostic-summary {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  text-align: center;
}

.diagnostic-summary--pass {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  color: #15803d;
}

.diagnostic-summary--fail {
  background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%);
  color: #b91c1c;
}

/* ---- セットアップ手順 ---- */
.setup-reminder {
  border-left: 4px solid #f59e0b;
}

.setup-steps {
  margin: 0;
  padding-left: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  font-size: 0.875rem;
  color: #334155;
}

.setup-steps li {
  line-height: 1.5;
}

.setup-steps strong {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.8125rem;
  background: rgba(0, 0, 0, 0.06);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
}

.step-detail {
  display: block;
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 0.125rem;
}

.setup-note {
  margin: 0.75rem 0 0 0;
  font-size: 0.75rem;
  color: #94a3b8;
  font-style: italic;
}
</style>
