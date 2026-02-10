/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  safelist: [
    // レアリティ別グラデーション（パルスエフェクト用）
    // UR (ウルトラレア) - 紫/ピンク系
    'from-purple-600', 'via-pink-500', 'to-purple-600',
    // SR (スーパーレア) - オレンジ系
    'from-orange-600', 'via-orange-200', 'to-orange-600',
    // RR (ダブルレア) - 青系
    'from-blue-600', 'via-blue-200', 'to-blue-600',
    // R (レア) - 緑系
    'from-green-600', 'via-green-200', 'to-green-600',
    // U (アンコモン) - グレー系
    'from-gray-500', 'via-gray-300', 'to-gray-500',
    // C (コモン) - グレー系
    'from-gray-400', 'via-gray-200', 'to-gray-400',
    // レアリティ別背景グラデーション
    'from-purple-700', 'from-orange-700', 'from-blue-700',
    'from-green-700', 'from-gray-600', 'from-gray-500',
    // レアリティ別ボーダー
    'border-purple-400/50', 'border-orange-400/50',
    'border-blue-400/50', 'border-green-400/50',
    'border-gray-400/50', 'border-gray-300/50',
    'border-purple-500/50', 'border-orange-500/50',
    'border-blue-500/50', 'border-green-500/50',
    // レアリティ別バッジスタイル
    'via-purple-300', 'via-pink-300', 'text-purple-900',
    'via-orange-300', 'text-orange-900',
    'via-blue-300', 'text-blue-900',
    'via-green-300', 'text-green-900',
    'via-gray-300', 'text-gray-900',
    'via-gray-200',
    // レアリティ別タイトルグラデーション
    'from-purple-200', 'to-purple-600',
    'from-orange-200', 'to-orange-600',
    'from-blue-200', 'to-blue-600',
    'from-green-200', 'to-green-600',
    'from-gray-200', 'to-gray-500', 'to-gray-400',
    // レアリティ別テキスト色
    'text-purple-100/80', 'text-orange-100/80',
    'text-blue-100/80', 'text-green-100/80',
    'text-gray-100/80',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        secondary: '#ec4899',
        accent: '#f59e0b',
        'background-light': '#f0f9ff',
        'background-dark': '#0f172a',
        'card-light': '#ffffff',
        'card-dark': '#1e293b',
        'soft-blue': '#e0f2fe',
        'soft-purple': '#f3e8ff',
        'soft-green': '#dcfce7',
        'soft-rose': '#ffe4e6',
      },
      borderRadius: {
        DEFAULT: '1rem',
        xl: '1.5rem',
        '2xl': '2rem',
      },
      boxShadow: {
        soft: '0 10px 40px -10px rgba(0,0,0,0.08)',
        glow: '0 0 20px rgba(99, 102, 241, 0.5)',
        'glow-gold': '0 0 25px rgba(245, 158, 11, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse-glow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}

