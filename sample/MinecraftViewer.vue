<script setup lang="ts">
  import '@google/model-viewer';
  
  defineProps<{
    src: string; // .glbファイルのURL
    alt: string;
  }>();
  </script>
  
  <template>
    <div class="viewer-container">
      <model-viewer
        :src="src"
        :alt="alt"
        auto-rotate
        camera-controls
        shadow-intensity="1"
        background-color="#f0f0f0"
        style="width: 100%; height: 400px;"
      ></model-viewer>
    </div>
  </template>