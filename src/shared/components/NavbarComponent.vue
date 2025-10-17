<template>
  <nav class="navbar navbar-expand-lg">
    <div class="container-fluid">
      <div class="brand">
        <img src="../assets/houseicon.png" alt="logo" class="logo" />
        <router-link to="/" class="brand-text">Home</router-link>
      </div>

      <div class="route-display">
        <h2>You are in the <span style="color: orange;">{{ locationText }}</span> right now!</h2>
      </div>
      
        <ul :class="['nav-links', { 'open': open }]">
          <li>
            <router-link to="/social" class="btn btn-outline-warning" @click="close">Social</router-link>
          </li>
          <li>
            <router-link to="/signup" class="btn btn-outline-primary" @click="close">Signup</router-link>
          </li>
          <li>
            <router-link to="/login" class="btn btn-outline-success" @click="close">Login</router-link>
          </li>
          <li v-if="isLoggedIn">
            <router-link to="/profile" class="btn btn-outline-info" @click="close">Profile</router-link>
          </li>
        </ul>
    </div>
  </nav>
</template>

<script>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { auth } from '../../firebase/config'
import { onAuthStateChanged } from 'firebase/auth'

export default {
  name: 'NavbarComponent',
  setup() {
    const route = useRoute()
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
    
    return {
      locationText,
      isLoggedIn
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
}
.nav-link {
  color: #e5e7eb; /* gray-200 */
  text-decoration: none;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
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
  }
  .nav-links.open {
    transform: translateY(0);
    opacity: 1;
    pointer-events: auto;
  }
  .container { position: relative; }
}

</style>
