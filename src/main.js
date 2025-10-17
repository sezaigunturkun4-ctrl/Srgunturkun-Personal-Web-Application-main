import 'regenerator-runtime/runtime';
import 'core-js/stable';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { createApp } from 'vue';
import App from './App.vue';
import router from './router/index.js';
import './shared/styles/style.css'

createApp(App).use(router).mount('#app');
