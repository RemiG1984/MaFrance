import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import vuetify from './plugins/vuetify'
import api from './services/api'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

// Configuration globale
// app.config.globalProperties.$api = api

// Only log in development
if (import.meta.env.DEV) {
  console.log('import.meta.env:', import.meta.env);
  console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
}

app.use(router)
app.use(pinia)
// Only expose Pinia globally for debugging in development
if (import.meta.env.DEV) {
  window.__pinia = pinia;
}
//window.__pinia = pinia;
app.use(vuetify)
app.mount('#app')
