import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Rankings from '../views/Rankings.vue'
import Methodology from '../views/Methodology.vue'
import Correlations from '../views/Correlations.vue'
import Localisation from '../views/Localisation.vue'
import Demography from '../views/Demography.vue'
import Politique from '../views/Politique.vue'

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
    path: '/correlations',
    name: 'Correlations',
    component: Correlations
  },
  {
    path: '/localisation',
    name: 'Localisation',
    component: Localisation
  },
  {
    path: '/demography',
    name: 'Demography',
    component: Demography
  },
  {
    path: '/politique',
    name: 'Politique',
    component: Politique
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router 