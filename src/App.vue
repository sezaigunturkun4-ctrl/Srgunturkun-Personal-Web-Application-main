<template>
  <nav> 
    <NavbarComponent />
  </nav>
  
  <!-- Add loading and error handling for lazy-loaded components -->
  <main class="app-content">
    <Suspense suspensible>
      <template #default>
        <router-view v-slot="{ Component, route }">
          <transition name="fade" mode="out-in" appear>
            <div :key="route.path" class="route-wrapper">
              <component :is="Component" />
            </div>
          </transition>
        </router-view>
      </template>
      <template #fallback>
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <p class="loading-text">Loading application...</p>
        </div>
      </template>
    </Suspense>
  </main>
</template>

<script>
import NavbarComponent from './shared/components/NavbarComponent.vue'
export default {
  name: 'App',
  components: {
    NavbarComponent
  }
   
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

/* Main content area - account for fixed navbar */
.app-content {
  min-height: 100vh;
}

/* Route wrapper for smooth transitions */
.route-wrapper {
  width: 100%;
  min-height: calc(100vh - 80px);
}

/* Loading styles for lazy-loaded components */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  padding: 2rem;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #dd7724ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.loading-text {
  color: #666;
  font-size: 1.1rem;
  margin: 0;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Smooth transition for route changes */
.router-link-active {
  color: #dd7724ff;
}

/* Improve performance for lazy loading */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
