import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Rankings from '../views/Rankings.vue'
import Methodology from '../views/Methodology.vue'
import Memorial from '../views/Memorial.vue'
import Correlations from '../views/Correlations.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/classements',
    name: 'Rankings',
    component: Rankings
  },
  {
    path: '/methodologie',
    name: 'Methodology',
    component: Methodology
  },
  {
    path: '/memorial',
    name: 'Memorial',
    component: Memorial
  },
  {
    path: '/correlations',
    name: 'Correlations',
    component: Correlations
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router 