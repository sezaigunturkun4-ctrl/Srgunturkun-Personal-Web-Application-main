<template>
  <nav> 
  <NavbarComponent />
  </nav>
  <router-view />
 
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
</style>
