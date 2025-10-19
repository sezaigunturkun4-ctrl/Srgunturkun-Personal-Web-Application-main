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
      
        <ul :class="['nav-links', { 'open': open }]">
          <li class="btn btn-outline-warning" @click="navigateAndClose('/social')">
            <img src="../assets/SocialIcon.png" alt="logo" class="logo" />
            <span>Social</span>
          </li>
          <li class="btn btn-outline-primary" @click="navigateAndClose('/signup')">
            <img src="../assets/PaperIcon.png" alt="logo" class="logo" />
            <span>Signup</span>
          </li>
          <li class="btn btn-outline-success" @click="navigateAndClose('/login')">
            <img src="../assets/KeyIcon.png" alt="logo" class="logo" />
            <span>Login</span>
          </li>
          <li v-if="isLoggedIn" class="btn btn-outline-info" @click="navigateAndClose('/profile')">
            <img src="../assets/default-avatar.png" alt="logo" class="logo" />
            <span>Profile</span>
          </li>
        </ul>
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
    let unsubscribe

    onMounted(() => {
      unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        user.value = currentUser
      })
    })

    onUnmounted(() => {
      if (unsubscribe) unsubscribe()
    })

    const locationText = computed(() => {
      const path = route.path || '/'
      return `"${path}"`
    })
    
    const isLoggedIn = computed(() => !!user.value)
    
    const navigateTo = (path) => {
      router.push(path)
    }
    
    return {
      locationText,
      isLoggedIn,
      navigateTo
    }
  },
  data() {
    return {
      open: false
    };
  },
  methods: {
    close() {
      this.open = false;
    },
    navigateAndClose(path) {
      this.navigateTo(path);
      this.close();
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
.burger {
  display: none;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
}
.burger .line {
  display: block;
  width: 22px;
  height: 2px;
  background: #fff;
  margin: 4px 0;
  transition: transform 200ms ease, opacity 200ms ease;
}
.burger .line.open:nth-child(1) { transform: translateY(6px) rotate(45deg); }
.burger .line.open:nth-child(2) { opacity: 0; }
.burger .line.open:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }

.nav-links {
  display: flex;
  list-style: none;
  gap: 1rem;
  margin: 0;
  padding: 0;
  pointer-events: auto;
}

.nav-links li {
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  transition: all 0.2s ease;
  user-select: none;
}

.nav-links li:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.nav-links li span {
  margin-left: 0.5rem;
  color: #ffffff;
  font-weight: 500;
}
.nav-link {
  color: #e5e7eb; /* gray-200 */
  text-decoration: none;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  opacity: 1;
  pointer-events: auto;
}

.nav-links li {
  pointer-events: auto;
}

.nav-links a {
  color: #ffffff;
  text-decoration: none;
  opacity: 1;
  pointer-events: auto;
  transition: color 0.2s ease;
}

.nav-links a:hover {
  color: #f59e0b;
}


/* Responsive */
@media (max-width: 720px) {
  .burger { display: block; }
  .nav-links {
    position: absolute;
    top: 60px;
    left: 0;
    right: 0;
    background: #111827;
    flex-direction: column;
    padding: 1rem;
    transform: translateY(-10px);
    opacity: 0;
    pointer-events: none;
    transition: opacity 160ms ease, transform 160ms ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    border-top: 1px solid #374151;
  }
  .nav-links.open {
    transform: translateY(0);
    opacity: 1;
    pointer-events: auto;
  }
  .container { position: relative; }
}

</style>
