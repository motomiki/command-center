<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import * as THREE from 'three';
import type { Rarity } from '@/types/card';

const HIGH_RARITIES: Rarity[] = ['RR', 'SR', 'UR'];

interface Props {
  isActive: boolean;
  rarity?: Rarity;
}

const props = withDefaults(defineProps<Props>(), {
  rarity: 'C' as Rarity,
});

const containerRef = ref<HTMLDivElement | null>(null);

let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let frameId: number = 0;

// Particle systems (only created for RR, SR, UR)
let backgroundStars: THREE.Points | null = null;
let foregroundSparkles: THREE.Points | null = null;
let glowPlane: THREE.Mesh | null = null;

// Counts used only when high rarity (reduced for quality)
const BG_COUNT = 150;
const FG_COUNT = 50;

/** Soft round radial gradient texture for round stars */
function createGlowStarTexture(size = 64): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const cx = size / 2;
  const r = cx - 2;
  const gradient = ctx.createRadialGradient(cx, cx, 0, cx, cx, r);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.25, 'rgba(255, 255, 240, 0.9)');
  gradient.addColorStop(0.5, 'rgba(255, 255, 200, 0.5)');
  gradient.addColorStop(0.75, 'rgba(255, 255, 180, 0.2)');
  gradient.addColorStop(1, 'rgba(255, 255, 200, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/** Cross shape with soft glow core for sparkle stars */
function createCrossStarTexture(size = 64): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const cx = size / 2;
  const armLen = cx - 2;
  const armWidth = Math.max(2, size / 16);
  const coreR = size / 8;

  // Soft glow core (round)
  const coreGrad = ctx.createRadialGradient(cx, cx, 0, cx, cx, coreR);
  coreGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  coreGrad.addColorStop(0.6, 'rgba(255, 255, 240, 0.8)');
  coreGrad.addColorStop(1, 'rgba(255, 255, 200, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(cx, cx, coreR, 0, Math.PI * 2);
  ctx.fill();

  // Cross arms with fade
  const armGrad = ctx.createLinearGradient(0, cx, size, cx);
  armGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  armGrad.addColorStop(0.35, 'rgba(255, 255, 240, 0.6)');
  armGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.9)');
  armGrad.addColorStop(0.65, 'rgba(255, 255, 240, 0.6)');
  armGrad.addColorStop(1, 'rgba(255, 255, 200, 0)');
  ctx.fillStyle = armGrad;
  ctx.fillRect(0, cx - armWidth / 2, size, armWidth);

  const vGrad = ctx.createLinearGradient(cx, 0, cx, size);
  vGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  vGrad.addColorStop(0.35, 'rgba(255, 255, 240, 0.6)');
  vGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.9)');
  vGrad.addColorStop(0.65, 'rgba(255, 255, 240, 0.6)');
  vGrad.addColorStop(1, 'rgba(255, 255, 200, 0)');
  ctx.fillStyle = vGrad;
  ctx.fillRect(cx - armWidth / 2, 0, armWidth, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function getRarityParams(rarity: Rarity): { color: number; intensity: number } {
  const params: Record<Rarity, { color: number; intensity: number }> = {
    UR: { color: 0x9333ea, intensity: 0.95 },
    SR: { color: 0xff8c00, intensity: 0.85 },
    RR: { color: 0x0066ff, intensity: 0.65 },
    R: { color: 0x00aa00, intensity: 0.5 },
    U: { color: 0x808080, intensity: 0.3 },
    C: { color: 0xa0a0a0, intensity: 0.2 },
  };
  return params[rarity] ?? params.C;
}

function isHighRarity(rarity: Rarity): boolean {
  return HIGH_RARITIES.includes(rarity);
}

const initThree = () => {
  if (!containerRef.value) return;

  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;
  const rarity = props.rarity;
  const useParticles = isHighRarity(rarity);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.z = 5;

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  containerRef.value.appendChild(renderer.domElement);

  if (!useParticles) {
    animate();
    return;
  }

  // --- Background stars: floating + twinkling (no falling) ---
  const bgPositions = new Float32Array(BG_COUNT * 3);
  const bgPhaseScale = new Float32Array(BG_COUNT * 2); // phase, scale
  for (let i = 0; i < BG_COUNT; i++) {
    bgPositions[i * 3] = (Math.random() - 0.5) * 12;
    bgPositions[i * 3 + 1] = (Math.random() - 0.5) * 12;
    bgPositions[i * 3 + 2] = (Math.random() - 0.5) * 4 - 1;
    bgPhaseScale[i * 2] = Math.random() * Math.PI * 2;
    bgPhaseScale[i * 2 + 1] = 0.4 + Math.random() * 0.8;
  }
  const bgGeo = new THREE.BufferGeometry();
  bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
  bgGeo.setAttribute('aPhaseScale', new THREE.BufferAttribute(bgPhaseScale, 2));

  const bgTex = createGlowStarTexture(48);
  const bgMat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      size: { value: 0.28 },
      map: { value: bgTex },
    },
    vertexShader: `
      attribute vec2 aPhaseScale;
      uniform float time;
      uniform float size;
      varying float vAlpha;
      void main() {
        vec3 pos = position;
        pos.y += sin(time * 0.5 + aPhaseScale.x) * 0.2;
        pos.x += cos(time * 0.3 + aPhaseScale.x) * 0.1;
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float twinkle = 0.5 + 0.5 * sin(time * 2.0 + aPhaseScale.x);
        vAlpha = twinkle * aPhaseScale.y;
        gl_PointSize = size * (300.0 / -mvPosition.z) * aPhaseScale.y;
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      varying float vAlpha;
      void main() {
        vec4 tex = texture2D(map, gl_PointCoord);
        gl_FragColor = vec4(tex.rgb, tex.a * vAlpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  backgroundStars = new THREE.Points(bgGeo, bgMat);
  scene.add(backgroundStars);

  // --- Foreground sparkles (cross, twinkle) ---
  const fgPositions = new Float32Array(FG_COUNT * 3);
  const fgRandoms = new Float32Array(FG_COUNT * 2);
  for (let i = 0; i < FG_COUNT; i++) {
    fgPositions[i * 3] = (Math.random() - 0.5) * 10;
    fgPositions[i * 3 + 1] = (Math.random() - 0.5) * 10;
    fgPositions[i * 3 + 2] = (Math.random() - 0.5) * 2;
    fgRandoms[i * 2] = Math.random() * Math.PI * 2;
    fgRandoms[i * 2 + 1] = 0.6 + Math.random() * 0.8;
  }
  const fgGeo = new THREE.BufferGeometry();
  fgGeo.setAttribute('position', new THREE.BufferAttribute(fgPositions, 3));
  fgGeo.setAttribute('aPhaseScale', new THREE.BufferAttribute(fgRandoms, 2));

  const fgTex = createCrossStarTexture(64);
  const fgMat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      size: { value: 0.5 },
      map: { value: fgTex },
    },
    vertexShader: `
      attribute vec2 aPhaseScale;
      uniform float time;
      uniform float size;
      varying float vAlpha;
      void main() {
        vec3 pos = position;
        pos.y += sin(time * 0.4 + aPhaseScale.x) * 0.15;
        pos.x += cos(time * 0.25 + aPhaseScale.x) * 0.08;
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float twinkle = 0.6 + 0.4 * sin(time * 2.5 + aPhaseScale.x);
        vAlpha = twinkle * aPhaseScale.y;
        gl_PointSize = size * (300.0 / -mvPosition.z) * twinkle;
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      varying float vAlpha;
      void main() {
        vec4 tex = texture2D(map, gl_PointCoord);
        gl_FragColor = vec4(tex.rgb, tex.a * vAlpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  foregroundSparkles = new THREE.Points(fgGeo, fgMat);
  scene.add(foregroundSparkles);

  // --- Glow plane (rarity-colored aura) ---
  const glowGeo = new THREE.PlaneGeometry(12, 12);
  const glowMat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      color: { value: new THREE.Color(0xffd700) },
      intensity: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 color;
      uniform float intensity;
      varying vec2 vUv;
      void main() {
        float dist = distance(vUv, vec2(0.5));
        float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * intensity;
        float pulse = 0.8 + 0.2 * sin(time * 2.0);
        gl_FragColor = vec4(color * pulse, alpha * 0.45);
      }
    `,
    transparent: true,
    depthWrite: false,
  });
  glowPlane = new THREE.Mesh(glowGeo, glowMat);
  glowPlane.position.z = -2;
  scene.add(glowPlane);

  updateRarityColors(rarity);
  animate();
};

const updateRarityColors = (rarity: Rarity) => {
  if (!glowPlane) return;
  const mat = glowPlane.material as THREE.ShaderMaterial;
  const { color, intensity } = getRarityParams(rarity);
  mat.uniforms.color.value.set(color);
  mat.uniforms.intensity.value = intensity;
};

const animate = () => {
  if (!props.isActive || !scene || !camera || !renderer) return;
  frameId = requestAnimationFrame(animate);

  const time = performance.now() * 0.001;

  if (backgroundStars) {
    const bgMat = backgroundStars.material as THREE.ShaderMaterial;
    if (bgMat.uniforms?.time) bgMat.uniforms.time.value = time;
  }
  if (foregroundSparkles) {
    const fgMat = foregroundSparkles.material as THREE.ShaderMaterial;
    if (fgMat.uniforms?.time) fgMat.uniforms.time.value = time;
  }
  if (glowPlane) {
    const mat = glowPlane.material as THREE.ShaderMaterial;
    mat.uniforms.time.value = time;
  }

  renderer.render(scene, camera);
};

const handleResize = () => {
  if (!containerRef.value || !camera || !renderer) return;
  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
};

function disposeScene() {
  if (frameId) {
    cancelAnimationFrame(frameId);
    frameId = 0;
  }
  if (backgroundStars) {
    backgroundStars.geometry.dispose();
    (backgroundStars.material as THREE.Material).dispose();
    backgroundStars = null;
  }
  if (foregroundSparkles) {
    foregroundSparkles.geometry.dispose();
    (foregroundSparkles.material as THREE.Material).dispose();
    foregroundSparkles = null;
  }
  if (glowPlane) {
    glowPlane.geometry.dispose();
    (glowPlane.material as THREE.Material).dispose();
    glowPlane = null;
  }
  if (renderer && containerRef.value?.contains(renderer.domElement)) {
    containerRef.value.removeChild(renderer.domElement);
    renderer.dispose();
  }
  renderer = null;
  camera = null;
  scene = null;
}

watch(() => props.isActive, (active) => {
  if (active) {
    if (!scene) initThree();
    else animate();
  } else {
    if (frameId) cancelAnimationFrame(frameId);
  }
});

watch(() => props.rarity, () => {
  if (!props.isActive) return;
  disposeScene();
  initThree();
});

onMounted(() => {
  if (props.isActive) initThree();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (frameId) cancelAnimationFrame(frameId);
  disposeScene();
});
</script>

<template>
  <div ref="containerRef" class="three-container"></div>
</template>

<style scoped>
.three-container {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
  overflow: hidden;
}
</style>
