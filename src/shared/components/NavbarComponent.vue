<template>
  <nav class="navbar navbar-expand-lg">
    <div class="container-fluid">
      <div class="brand btn btn-outline-light" @click="navigateAndClose('/')">
        <img src="../assets/houseicon.png" alt="logo" class="logo" />
        <router-link to="/" class="brand-text">Home</router-link>
      </div>

      <div class="route-display">
        <h2>Current location <span style="color: orange;">{{ locationText }}</span></h2>
      </div>
      
      <!-- Dropdown Container -->
      <div class="dropdown-container">
        <!-- Dropdown Toggle Button -->
        <button 
          class="dropdown-toggle btn btn-outline-light" 
          @click="toggleDropdown"
          aria-label="Navigation Menu"
        >
          <span class="hamburger-icon">
            <span class="line" :class="{ 'open': open }"></span>
            <span class="line" :class="{ 'open': open }"></span>
            <span class="line" :class="{ 'open': open }"></span>
          </span>
          <span class="dropdown-text">Menu</span>
        </button>

        <!-- Dropdown Menu -->
        <ul :class="['dropdown-menu', { 'show': open }]">
          <li class="dropdown-item btn btn-outline-warning" @click="navigateAndClose('/social')">
            <img src="../assets/SocialIcon.png" alt="logo" class="logo" />
            <span>Social</span>
          </li>
          <li class="dropdown-item btn btn-outline-info" @click="navigateAndClose('/profiles')">
            <img src="../assets/default-avatar.png" alt="logo" class="logo" />
            <span>User Profiles</span>
          </li>
          <li class="dropdown-item btn btn-outline-secondary" @click="navigateAndClose('/account')">
            <img src="../assets/KeyIcon.png" alt="logo" class="logo" />
            <span>Account Management</span>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<script>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { auth } from '../../firebase/config'
import { onAuthStateChanged } from 'firebase/auth'

export default {
  name: 'NavbarComponent',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const user = ref(null)
    const open = ref(false)
    let unsubscribe
    let clickOutsideHandler

    const handleClickOutside = (event) => {
      // Check if click is outside the dropdown container
      const dropdownContainer = document.querySelector('.dropdown-container')
      if (dropdownContainer && !dropdownContainer.contains(event.target)) {
        open.value = false
      }
    }

    onMounted(() => {
      unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        user.value = currentUser
      })
      
      // Add click outside listener for dropdown
      clickOutsideHandler = handleClickOutside
      document.addEventListener('click', clickOutsideHandler)
    })

    onUnmounted(() => {
      if (unsubscribe) unsubscribe()
      // Remove click outside listener
      if (clickOutsideHandler) {
        document.removeEventListener('click', clickOutsideHandler)
      }
    })

    const locationText = computed(() => {
      const path = route.path || '/'
      return `"${path}"`
    })
    
    const isLoggedIn = computed(() => !!user.value)
    
    const navigateTo = (path) => {
      router.push(path)
    }

    const close = () => {
      open.value = false
    }

    const toggleDropdown = () => {
      open.value = !open.value
    }

    const navigateAndClose = (path) => {
      navigateTo(path)
      close()
    }
    
    return {
      locationText,
      isLoggedIn,
      navigateTo,
      open,
      close,
      toggleDropdown,
      navigateAndClose
    }
  }
}
</script>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: #1f2937;
  opacity: 1;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  backdrop-filter: none;
}

.container-fluid {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

.route-display {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
}

.route-display h2 {
  color: #ffffff;  /* White text color */
  margin: 0;      /* Remove default margins */
  font-size: 2.4rem; /* Adjust size as needed */
}

.container {
  margin:0px;
  padding: 0;
}

.brand {
  display: flex;
  align-items: center;
  margin-right: auto;
}

.brand:hover {
  background-color: #000;
}
.logo {
  width: 36px;
  height: 36px;
  object-fit: contain;
  margin-right: 0.5rem;
}
.brand-text {
  color: #fff;
  font-weight: 600;
  text-decoration: none;
  padding-left: 10px;
  padding-right: 10px;
  display: flex;
  align-items: center;
}

/* Dropdown Styles */
.dropdown-container {
  position: relative;
  display: inline-block;
}

.dropdown-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dropdown-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.5);
}

.hamburger-icon {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.hamburger-icon .line {
  width: 18px;
  height: 2px;
  background: #fff;
  transition: all 0.3s ease;
  transform-origin: center;
}

.hamburger-icon .line.open:nth-child(1) { 
  transform: translateY(5px) rotate(45deg); 
}
.hamburger-icon .line.open:nth-child(2) { 
  opacity: 0; 
}
.hamburger-icon .line.open:nth-child(3) { 
  transform: translateY(-5px) rotate(-45deg); 
}

.dropdown-text {
  font-weight: 500;
  font-size: 0.9rem;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 8px;
  min-width: 220px;
  max-width: 280px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  list-style: none;
  margin: 0;
  padding: 0.75rem 0;
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px);
  transition: all 0.2s ease;
  overflow: hidden;
}

.dropdown-menu.show {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.dropdown-item {
  display: flex;
  align-items: center;
  width: calc(100% - 1rem);
  padding: 0.75rem 1rem;
  margin: 0.125rem 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  box-sizing: border-box;
  white-space: nowrap;
}

.dropdown-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateX(2px);
}

.dropdown-item .logo {
  width: 18px;
  height: 18px;
  margin-right: 0.5rem;
  flex-shrink: 0;
}

.dropdown-item span {
  color: #ffffff;
  font-weight: 500;
  font-size: 0.875rem;
  flex-grow: 1;
  text-align: left;
}
/* Additional dropdown button styling */
.dropdown-item.btn-outline-warning {
  border-color: rgba(245, 158, 11, 0.3);
}

.dropdown-item.btn-outline-warning:hover {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.15);
}

.dropdown-item.btn-outline-primary {
  border-color: rgba(59, 130, 246, 0.3);
}

.dropdown-item.btn-outline-primary:hover {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.15);
}

.dropdown-item.btn-outline-success {
  border-color: rgba(16, 185, 129, 0.3);
}

.dropdown-item.btn-outline-success:hover {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.15);
}

.dropdown-item.btn-outline-info {
  border-color: rgba(6, 182, 212, 0.3);
}

.dropdown-item.btn-outline-info:hover {
  border-color: #06b6d4;
  background: rgba(6, 182, 212, 0.15);
}

/* Responsive */
@media (max-width: 768px) {
  .route-display {
    display: none; /* Hide route display on mobile for space */
  }
  
  .dropdown-menu {
    right: 0;
    min-width: 180px;
  }
  
  .container-fluid {
    padding: 0 1rem;
  }
}

@media (max-width: 480px) {
  .dropdown-toggle .dropdown-text {
    display: none; /* Hide "Menu" text on very small screens */
  }
  
  .dropdown-menu {
    min-width: 160px;
  }
}

/* Click outside to close dropdown */
.dropdown-container.open {
  z-index: 1001;
}

</style>
