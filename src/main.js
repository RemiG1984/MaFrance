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
app.config.globalProperties.$api = api

app.use(router)
app.use(pinia)
app.use(vuetify)
app.mount('#app')
