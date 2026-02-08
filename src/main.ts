import { createApp } from 'vue';
import { createPinia } from 'pinia';
import './style.css';
import './styles/responsive.css';
import App from './App.vue';
import router from './router';

const app = createApp(App);
const pinia = createPinia();

// Pinia を先に登録（ルーターガードから useAuthStore を使うため）
app.use(pinia);
app.use(router);

app.mount('#app');

