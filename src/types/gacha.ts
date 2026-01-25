import type { CardData } from './card';

export type GachaState = 'idle' | 'spinning' | 'revealing' | 'opened';

export interface GachaResult {
  card: CardData;
  timestamp: number;
}

