<template>
  <div class="profile-app-container">
    <div class="profile-section">
      <ProfileComponent />
    </div> 
    <div class="user-search">
      <UserSearchComponent />
    </div>
  </div>
</template>

<script>
import ProfileComponent from '../shared/components/ProfileComponent.vue'
import UserSearchComponent from '../shared/components/UserSearchComponent.vue'

export default {
  name: 'AppProfile',
  components: {
    ProfileComponent,
    UserSearchComponent
  }
}
</script>

<style scoped>
.profile-app-container {
  padding: 20px;
  min-height: 100vh;
  background: #f8f9fa;
}

.profile-section {
  margin-bottom: 30px;
}

.user-search {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}
</style>