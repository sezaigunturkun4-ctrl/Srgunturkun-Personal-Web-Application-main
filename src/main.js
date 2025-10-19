import 'regenerator-runtime/runtime';
import 'core-js/stable';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { createApp } from 'vue';
import App from './App.vue';
import router from './router/index.js';
import './shared/styles/style.css'

// Create Vue app with reduced console warnings in development
const app = createApp(App);

// Configure Vue to reduce experimental feature warnings
if (process.env.NODE_ENV === 'development') {
  app.config.warnHandler = (msg, instance, trace) => {
    // Filter out known experimental warnings that are safe to ignore
    if (msg.includes('Suspense') && msg.includes('experimental')) {
      return; // Suppress Suspense experimental warnings
    }
    // Log other warnings normally
    console.warn(`[Vue warn]: ${msg}`, trace);
  };
}

app.use(router).mount('#app');
