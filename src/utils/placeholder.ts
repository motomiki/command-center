/**
 * Local Placeholder Image Generator
 * Generates high-quality SVG data URIs for placeholder images
 * Eliminates dependency on external placeholder services
 */

interface PlaceholderOptions {
  width?: number;
  height?: number;
  text?: string;
  bgColor?: string;
  textColor?: string;
}

/**
 * Generates a placeholder image as a data URI
 * @param options Configuration options for the placeholder
 * @returns Data URI string for the SVG placeholder
 */
export function generatePlaceholder(options: PlaceholderOptions = {}): string {
  const {
    width = 320,
    height = 480,
    text = 'Image',
    bgColor = '#808080',
    textColor = '#FFFFFF',
  } = options;

  // Calculate font size based on image dimensions
  const fontSize = Math.min(width, height) * 0.15;

  // Create SVG with proper encoding
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${bgColor}"/>
      <text
        x="50%"
        y="50%"
        dominant-baseline="middle"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="${fontSize}"
        font-weight="bold"
        fill="${textColor}"
      >${escapeXml(text)}</text>
    </svg>
  `.trim();

  // Convert to base64 data URI
  const base64 = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Preset placeholder generators for common use cases
 */
export const placeholders = {
  // Card placeholders
  cardUR: (text = 'UR Card') => generatePlaceholder({ width: 320, height: 480, text, bgColor: '#9333EA', textColor: '#FFFFFF' }),
  cardSR: (text = 'SR Card') => generatePlaceholder({ width: 320, height: 480, text, bgColor: '#FF8C00', textColor: '#000000' }),
  cardRR: (text = 'RR Card') => generatePlaceholder({ width: 320, height: 480, text, bgColor: '#0066FF', textColor: '#FFFFFF' }),
  cardR: (text = 'R Card') => generatePlaceholder({ width: 320, height: 480, text, bgColor: '#00AA00', textColor: '#FFFFFF' }),
  cardU: (text = 'U Card') => generatePlaceholder({ width: 320, height: 480, text, bgColor: '#808080', textColor: '#FFFFFF' }),
  cardC: (text = 'C Card') => generatePlaceholder({ width: 320, height: 480, text, bgColor: '#A0A0A0', textColor: '#FFFFFF' }),

  // Minecraft screenshot placeholders
  minecraftScreenshot: (text = 'Minecraft', bgColor = '#10b981') =>
    generatePlaceholder({ width: 800, height: 600, text, bgColor, textColor: '#FFFFFF' }),

  // Avatar placeholders
  avatar: (text: string, bgColor = '#667eea') =>
    generatePlaceholder({ width: 100, height: 100, text, bgColor, textColor: '#FFFFFF' }),
};
