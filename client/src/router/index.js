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
    component: Home,
    meta: {
      title: 'Ma France: état des lieux',
      description: 'Application d\'analyse des données françaises par département et commune',
      image: 'https://mafrance.app/twitter-1200x630.png'
    }
  },
  {
    path: '/classements',
    name: 'Rankings',
    component: Rankings,
    meta: {
      title: 'Classements - MaFrance.app',
      description: 'Classements des départements et communes par indice et métrique',
      image: 'https://mafrance.app/classements-1200x630.png'
    }
  },
  {
    path: '/methodologie',
    name: 'Methodology',
    component: Methodology,
    meta: {
      title: 'Méthodologie - MaFrance.app',
      description: 'Découvrez la méthodologie et les sources de données utilisées',
      image: 'https://mafrance.app/twitter-1200x630.png'
    }
  },
  {
    path: '/correlations',
    name: 'Correlations',
    component: Correlations,
    meta: {
      title: 'Corrélations - MaFrance.app',
      description: 'Analysez les corrélations entre différents indicateurs démographiques',
      image: 'https://mafrance.app/twitter-1200x630.png'
    }
  },
  {
    path: '/localisation',
    name: 'Localisation',
    component: Localisation,
    meta: {
      title: 'Localisation - MaFrance.app',
      description: 'Emplacement des centres de migrants, des "quartiers", des mosquées et prix de l\immobilier',
      image: 'https://mafrance.app/localisation-1200x630.png'
    }
  },
  {
    path: '/demography',
    name: 'Demography',
    component: Demography,
    meta: {
      title: 'Démographie - MaFrance.app',
      description: 'Historique et projections démographiques françaises',
      image: 'https://mafrance.app/demography-1200x630.png'
    }
  },
  {
    path: '/politique',
    name: 'Politique',
    component: Politique,
    meta: {
      title: 'Politique - MaFrance.app',
      description: 'Données moyennes par famille politique',
      image: 'https://mafrance.app/twitter-1200x630.png'
    }
  },
  {
    path: '/support',
    name: 'Support',
    component: () => import('../views/Support.vue'),
    meta: {
      title: 'Support - MaFrance.app',
      description: 'Soutenez le projet et contribuez au développement',
      image: 'https://mafrance.app/twitter-1200x630.png'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Function to update meta tags
function updateMetaTags(meta) {
  if (!meta) return

  // Update document title
  document.title = meta.title

  // Update or create meta tags for both Twitter and Open Graph
  const updateMetaTag = (property, content) => {
    let element = document.querySelector(`meta[property="${property}"]`)
    if (!element) {
      element = document.createElement('meta')
      element.setAttribute('property', property)
      document.getElementsByTagName('head')[0].appendChild(element)
    }
    element.setAttribute('content', content)
  }

  // Update both Twitter and Open Graph tags
  updateMetaTag('twitter:title', meta.title)
  updateMetaTag('twitter:description', meta.description)
  updateMetaTag('twitter:image', meta.image)
  updateMetaTag('og:title', meta.title)
  updateMetaTag('og:description', meta.description)
  updateMetaTag('og:image', meta.image)
}

// beforeEach guard to update meta tags on route change
router.beforeEach((to, from, next) => {
  if (to.meta) {
    // Use nextTick to ensure DOM is updated after route change
    next()
    setTimeout(() => {
      updateMetaTags(to.meta)
    }, 0)
  } else {
    next()
  }
})

export default router