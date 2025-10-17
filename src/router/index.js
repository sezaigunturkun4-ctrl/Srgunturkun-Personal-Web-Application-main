import { createRouter, createWebHistory } from 'vue-router';
import AppInfo from '../apps/AppInfo.vue';
import AppSocial from '../apps/AppSocial.vue';
import SignupComponent from '../shared/components/SignupComponent.vue';
import LoginComponent from '../shared/components/LoginComponent.vue';
import ProfileComponent from '../shared/components/ProfileComponent.vue';
import PublicProfileComponent from '../shared/components/PublicProfileComponent.vue';

// Function to get the appropriate component based on subdomain
function getSubdomainComponent() {
  const hostname = window.location.hostname;
  const productionDomain = import.meta.env?.VITE_PRODUCTION_DOMAIN || process.env.VUE_APP_PRODUCTION_DOMAIN || 'srgunturkun.com';
  
  // Check if we're on the production domain
  if (!hostname.includes(productionDomain)) {
    return AppInfo; // Default for localhost/development
  }
  
  const subdomain = hostname.split('.')[0];
  
  switch (subdomain) {
    case 'social':
      return AppSocial;
    case 'signup':
      return SignupComponent;
    case 'login':
      return LoginComponent;
    case 'profile':
      return ProfileComponent;
    case 'www':
    default:
      return AppInfo;
  }
}

const routes = [
  {
    path: '/',
    name: 'Root',
    component: getSubdomainComponent()
  },
  // Fallback routes for development and direct navigation
  {
    path: '/info',
    name: 'AppInfo',
    component: AppInfo
  },
  {
    path: '/social',
    name: 'AppSocial',
    component: AppSocial
  },
  {
    path: '/signup',
    name: 'Signup',
    component: SignupComponent
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginComponent
  },
  {
    path: '/profile',
    name: 'Profile',
    component: ProfileComponent
  },
  {
    path: '/user/:userId',
    name: 'PublicProfile',
    component: PublicProfileComponent,
    props: true
  },
  // Redirect any other paths to root on subdomains
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Optional: Add navigation guard for additional subdomain handling
router.beforeEach((to, from, next) => {
  const hostname = window.location.hostname;
  const productionDomain = import.meta.env?.VITE_PRODUCTION_DOMAIN || process.env.VUE_APP_PRODUCTION_DOMAIN || 'srgunturkun.com';
  
  // If we're on production domain and not on root path, redirect to root
  // This ensures subdomain routing takes precedence
  if (hostname.includes(productionDomain) && to.path !== '/') {
    next('/');
    return;
  }
  
  next();
});

export default router;