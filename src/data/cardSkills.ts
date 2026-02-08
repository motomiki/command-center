export interface Skill {
  name: string;
  value: string;
  icon: string; // Material Symbols name
}

export interface CardSkillSet {
  slot1: Skill; // タイピング・集中系
  slot2: Skill; // マイクラ・創造系
  footer: { label: string; icon: string }[];
}

// Slot 1: Typing / Focus / Learning (Lightning/Colorless Energy)
const SLOT1_PATTERNS: Skill[] = [
  { name: 'しゅうちゅう', value: '100%', icon: 'bolt' },
  { name: 'スピードスター', value: '200点', icon: 'timer' },
  { name: 'れんぞく入力', value: '50コンボ', icon: 'keyboard' },
  { name: 'ブラインド', value: 'かんぺき', icon: 'visibility_off' },
  { name: 'きあいの連打', value: '∞', icon: 'ads_click' },
  { name: 'せいかくさ', value: '99%', icon: 'check_circle' },
  { name: 'リズム感', value: 'ノリノリ', icon: 'music_note' },
  { name: '早打ち', value: 'マッハ', icon: 'speed' },
  { name: '集中モード', value: '全開', icon: 'psychology' },
  { name: 'キーボード', value: 'マスター', icon: 'keyboard_alt' },
  { name: 'ゆびのたいそう', value: 'じゅんびOK', icon: 'back_hand' },
  { name: 'ホームポジション', value: '基本', icon: 'home' },
  { name: 'ローマ字入力', value: 'とくい', icon: 'language' },
  { name: '日本語入力', value: 'たつじん', icon: 'translate' },
  { name: 'エンターキー', value: 'ターン！', icon: 'keyboard_return' },
  { name: 'スペースキー', value: 'ジャンプ', icon: 'space_bar' },
  { name: 'バックスペース', value: 'しゅうせい', icon: 'backspace' },
  { name: 'シフトキー', value: 'きりかえ', icon: 'keyboard_capslock' },
  { name: 'ショートカット', value: 'べんり', icon: 'content_cut' },
  { name: 'コピペの術', value: 'ふくせい', icon: 'content_copy' },
  { name: '全集中', value: 'こきゅう', icon: 'air' },
  { name: 'ゾーン突入', value: '無敵', icon: 'stars' },
  { name: '電光石火', value: 'ピカッ', icon: 'flash_on' },
  { name: '神速', value: '見えない', icon: 'blur_on' },
  { name: '正確無比', value: 'ミスなし', icon: 'done_all' },
  { name: '継続は力', value: 'レベルUP', icon: 'trending_up' },
  { name: '毎日の積み重ね', value: 'コツコツ', icon: 'calendar_today' },
  { name: 'チャレンジ', value: 'せいこう', icon: 'emoji_events' },
  { name: 'ハイスコア', value: 'こうしん', icon: 'military_tech' },
  { name: 'タイピング王', value: '降臨', icon: 'crown' },
  { name: '指先の魔術師', value: 'マジック', icon: 'auto_fix_high' },
  { name: '光の速さ', value: '30万km/s', icon: 'flare' },
];

// Slot 2: Minecraft / Creativity / Exploration (Fighting/Psychic Energy)
const SLOT2_PATTERNS: Skill[] = [
  { name: 'ワールド建築', value: '匠の技', icon: 'view_in_ar' },
  { name: 'レッドストーン', value: 'じどう化', icon: 'cable' },
  { name: 'サバイバル', value: 'いきのこる', icon: 'terrain' },
  { name: '無限のアイデア', value: '★★★', icon: 'lightbulb' },
  { name: 'コマンドブロック', value: 'じっこう', icon: 'terminal' },
  { name: 'そうぞうりょく', value: '無限大', icon: 'palette' },
  { name: 'ぼうけん', value: 'わくわく', icon: 'explore' },
  { name: 'たんけん', value: 'はっけん', icon: 'map' },
  { name: 'クラフト', value: 'つくる', icon: 'construction' },
  { name: '採掘', value: 'ダイヤ', icon: 'diamond' },
  { name: '農業', value: 'ほうさく', icon: 'agriculture' },
  { name: '牧場', value: 'にぎやか', icon: 'pets' },
  { name: '釣り', value: '大物', icon: 'fishing' },
  { name: 'エンチャント', value: 'きょうか', icon: 'auto_awesome' },
  { name: 'ポーション', value: '調合', icon: 'science' },
  { name: 'ネザー探索', value: 'ドキドキ', icon: 'local_fire_department' },
  { name: 'エンドラ討伐', value: 'ゆうしゃ', icon: 'swords' },
  { name: '建築センス', value: 'バツグン', icon: 'foundation' },
  { name: '回路設計', value: 'てんさい', icon: 'memory' },
  { name: 'トロッコ鉄道', value: '開通', icon: 'train' },
  { name: '秘密基地', value: 'かんせい', icon: 'fort' },
  { name: '天空の城', value: 'ふゆう', icon: 'cloud' },
  { name: '海底神殿', value: 'しんぴ', icon: 'water_drop' },
  { name: '村の英雄', value: 'かんしゃ', icon: 'volunteer_activism' },
  { name: '交易', value: 'しょうばい', icon: 'storefront' },
  { name: '植林', value: 'エコ', icon: 'forest' },
  { name: '整地', value: 'スッキリ', icon: 'landscape' },
  { name: '湧き潰し', value: 'あんぜん', icon: 'light_mode' },
  { name: 'トラップタワー', value: 'こうりつ', icon: 'factory' },
  { name: 'ピクセルアート', value: 'げいじゅつ', icon: 'brush' },
  { name: 'Mod導入', value: 'かくちょう', icon: 'extension' },
  { name: 'マルチプレイ', value: 'きょうりょく', icon: 'groups' },
];

// Footer Stats Patterns
const FOOTER_LABELS = {
  tech: ['プログラミング', 'ぎじゅつ', 'コード', 'ロジック', 'PCスキル'],
  art: ['デザイン', 'センス', 'アート', '色彩', 'そうぞう'],
  logic: ['ひらめき', 'くふう', 'ちのう', 'けいさん', 'はっそう'],
};

/**
 * Generates a deterministic random skill set based on the card ID.
 * @param cardId The unique ID of the card.
 * @returns A CardSkillSet object.
 */
export function getCardSkills(cardId: string): CardSkillSet {
  // Simple hash function to generate a seed from the string ID
  let hash = 0;
  for (let i = 0; i < cardId.length; i++) {
    const char = cardId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const seed = Math.abs(hash);

  // Use the seed to pick indices
  const slot1Index = seed % SLOT1_PATTERNS.length;
  // Use a different offset for slot 2 to avoid correlation
  const slot2Index = (seed + 13) % SLOT2_PATTERNS.length;
  
  // Footer labels
  const techIndex = (seed + 7) % FOOTER_LABELS.tech.length;
  const artIndex = (seed + 19) % FOOTER_LABELS.art.length;
  const logicIndex = (seed + 23) % FOOTER_LABELS.logic.length;

  return {
    slot1: SLOT1_PATTERNS[slot1Index],
    slot2: SLOT2_PATTERNS[slot2Index],
    footer: [
      { label: FOOTER_LABELS.tech[techIndex], icon: 'code' },
      { label: FOOTER_LABELS.art[artIndex], icon: 'palette' },
      { label: FOOTER_LABELS.logic[logicIndex], icon: 'psychology' },
    ],
  };
}
