<template>
  <div class="public-profile-container">
    <div class="public-profile-overlay"></div>
    
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <p>Loading user profile...</p>
    </div>
    
    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="$router.push('/social')" class="back-btn">
        ← Back to Social
      </button>
    </div>
    
    <!-- Profile Content -->
    <div v-else class="profile-content">
      <div class="profile-header">
        <div class="profile-photo-section">
          <img 
            :src="userProfile.ppUrl || defaultAvatar" 
            :alt="userProfile.displayName + ' profile photo'"
            class="profile-photo"
          />
        </div>
        
        <div class="profile-info">
          <h1 class="profile-name">{{ userProfile.displayName || 'Anonymous User' }}</h1>
          <p v-if="userProfile.userBio" class="profile-bio">{{ userProfile.userBio }}</p>
          <p v-else class="no-bio">This user hasn't added a bio yet.</p>
          
          <div class="profile-stats">
            <div class="stat">
              <span class="stat-number">{{ userPosts.length }}</span>
              <span class="stat-label">Posts</span>
            </div>
            <div class="stat">
              <span class="stat-number">{{ totalReactions }}</span>
              <span class="stat-label">Reactions</span>
            </div>
            <div class="stat">
              <span class="stat-number">{{ totalComments }}</span>
              <span class="stat-label">Comments</span>
            </div>
          </div>
          
          <div class="profile-actions">
            <button @click="$router.push('/social')" class="back-btn">
              ← Back to Social
            </button>
            <button 
              v-if="isCurrentUser" 
              @click="$router.push('/profile')" 
              class="edit-profile-btn"
            >
              Edit Profile
            </button>
          </div>
        </div>
      </div>
      
      <!-- User Posts Section -->
      <div class="user-posts-section">
        <h2>Posts by {{ userProfile.displayName || 'Anonymous User' }}</h2>
        
        <div v-if="postsLoading" class="loading-posts">
          <p>Loading posts...</p>
        </div>
        
        <div v-else-if="userPosts.length === 0" class="no-posts">
          <p>This user hasn't posted anything yet.</p>
        </div>
        
        <div v-else class="posts-grid">
          <div v-for="post in userPosts" :key="post.id" class="post-card">
            <div class="post-header">
              <h3>{{ post.title }}</h3>
              <span class="post-date">{{ formatDate(post.timestamp) }}</span>
            </div>
            
            <div class="post-media">
              <video v-if="post.type === 'video'" controls>
                <source :src="post.url" :type="post.mimeType">
              </video>
              <img v-else :src="post.url" :alt="post.title">
            </div>
            
            <p v-if="post.description" class="post-description">{{ post.description }}</p>
            
            <div class="post-stats">
              <span class="post-reactions">{{ getTotalReactions(post) }} reactions</span>
              <span class="post-comments">{{ getCommentsCount(post.id) }} comments</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { auth, profilesCollection, postsCollection, commentsCollection } from '../../firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import defaultAvatar from '../assets/default-avatar.png'
import {
  doc,
  query,
  where,
  onSnapshot,
  getDocs
} from 'firebase/firestore'

export default {
  name: 'PublicProfileComponent',
  props: {
    userId: {
      type: String,
      required: true
    }
  },
  setup(props) {
    
    // State
    const loading = ref(true)
    const postsLoading = ref(true)
    const error = ref('')
    const userProfile = ref({})
    const userPosts = ref([])
    const postComments = ref({})
    const currentUser = ref(null)
    
    let unsubscribePosts = null
    let unsubscribeAuth = null
    let unsubscribeProfile = null
    
    // Computed
    const isCurrentUser = computed(() => {
      return currentUser.value && currentUser.value.uid === props.userId
    })
    
    const totalReactions = computed(() => {
      return userPosts.value.reduce((total, post) => {
        return total + getTotalReactions(post)
      }, 0)
    })
    
    const totalComments = computed(() => {
      return userPosts.value.reduce((total, post) => {
        return total + getCommentsCount(post.id)
      }, 0)
    })
    
    // Methods
    function loadUserProfile() {
      try {
        loading.value = true
        error.value = ''
        
        // Set up real-time listener for profile changes
        const profileDocRef = doc(profilesCollection, props.userId)
        
        unsubscribeProfile = onSnapshot(profileDocRef, (profileDoc) => {
          if (!profileDoc.exists()) {
            error.value = 'User profile not found.'
            loading.value = false
            return
          }
          
          userProfile.value = {
            displayName: 'Anonymous User',
            ppUrl: defaultAvatar,
            userBio: '',
            ...profileDoc.data()
          }
          
          loading.value = false
        }, (err) => {
          console.error('Error loading user profile:', err)
          error.value = 'Failed to load user profile. Please try again.'
          loading.value = false
        })
        
      } catch (err) {
        console.error('Error setting up profile listener:', err)
        error.value = 'Failed to load user profile. Please try again.'
        loading.value = false
      }
    }
    
    function loadUserPosts() {
      if (unsubscribePosts) {
        unsubscribePosts()
      }
      
      postsLoading.value = true
      const q = query(
        postsCollection,
        where('userId', '==', props.userId)
      )
      
      unsubscribePosts = onSnapshot(q, (snapshot) => {
        const posts = []
        snapshot.forEach((doc) => {
          posts.push({ id: doc.id, ...doc.data() })
        })
        
        // Sort posts by timestamp in JavaScript (newest first)
        posts.sort((a, b) => {
          const aTime = a.timestamp?.seconds || 0
          const bTime = b.timestamp?.seconds || 0
          return bTime - aTime
        })
        
        userPosts.value = posts
        postsLoading.value = false
        
        // Load comments for these posts
        loadPostComments()
      }, (err) => {
        console.error('Error loading user posts:', err)
        postsLoading.value = false
      })
    }
    
    async function loadPostComments() {
      try {
        const postIds = userPosts.value.map(post => post.id)
        if (postIds.length === 0) return
        
        // Get all comments for this user's posts
        const q = query(commentsCollection)
        const snapshot = await getDocs(q)
        
        const comments = {}
        snapshot.forEach((doc) => {
          const comment = { id: doc.id, ...doc.data() }
          const postId = comment.postId
          
          // Only include comments for this user's posts
          if (postIds.includes(postId)) {
            if (!comments[postId]) {
              comments[postId] = []
            }
            comments[postId].push(comment)
          }
        })
        
        postComments.value = comments
      } catch (err) {
        console.error('Error loading comments:', err)
      }
    }
    
    function getTotalReactions(post) {
      if (!post.reactions) return 0
      return Object.values(post.reactions)
        .reduce((total, reactions) => total + reactions.length, 0)
    }
    
    function getCommentsCount(postId) {
      return postComments.value[postId]?.length || 0
    }
    
    function formatDate(timestamp) {
      if (!timestamp) return 'Unknown date'
      
      const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }
    
    // Lifecycle
    onMounted(() => {
      // Set up auth listener
      unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        currentUser.value = user
      })
      
      // Load profile and posts
      loadUserProfile()
      loadUserPosts()
    })
    
    onUnmounted(() => {
      if (unsubscribePosts) {
        unsubscribePosts()
      }
      if (unsubscribeAuth) {
        unsubscribeAuth()
      }
      if (unsubscribeProfile) {
        unsubscribeProfile()
      }
    })
    
    return {
      loading,
      postsLoading,
      error,
      userProfile,
      userPosts,
      isCurrentUser,
      totalReactions,
      totalComments,
      defaultAvatar,
      getTotalReactions,
      getCommentsCount,
      formatDate
    }
  }
}
</script>

<style scoped>
.public-profile-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
}

.public-profile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: url('../assets/InfoSocialBackground.png') center/cover;
  opacity: 0.7;
  z-index: -1;
  filter: brightness(0.7);
}

.loading-state,
.error-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.loading-state p {
  color: #666;
  font-size: 1.2em;
}

.error-state p {
  color: #dc3545;
  font-size: 1.1em;
  margin-bottom: 20px;
}

.profile-content {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.profile-header {
  display: flex;
  gap: 30px;
  padding: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.profile-photo-section {
  flex-shrink: 0;
}

.profile-photo {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid white;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.profile-info {
  flex: 1;
}

.profile-name {
  margin: 0 0 15px 0;
  font-size: 2.2em;
  font-weight: 600;
}

.profile-bio {
  font-size: 1.1em;
  line-height: 1.5;
  margin-bottom: 25px;
  opacity: 0.9;
}

.no-bio {
  font-size: 1em;
  margin-bottom: 25px;
  opacity: 0.7;
  font-style: italic;
}

.profile-stats {
  display: flex;
  gap: 30px;
  margin-bottom: 25px;
}

.stat {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 1.8em;
  font-weight: bold;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 0.9em;
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.profile-actions {
  display: flex;
  gap: 15px;
}

.back-btn,
.edit-profile-btn {
  padding: 10px 20px;
  border: 2px solid white;
  background: transparent;
  color: white;
  border-radius: 25px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-block;
}

.back-btn:hover,
.edit-profile-btn:hover {
  background: white;
  color: #667eea;
}

.edit-profile-btn {
  background: rgba(255,255,255,0.2);
}

.user-posts-section {
  padding: 40px;
}

.user-posts-section h2 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
  font-size: 1.8em;
}

.loading-posts,
.no-posts {
  text-align: center;
  padding: 40px;
  color: #666;
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 25px;
}

.post-card {
  background: #f8f9fa;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.post-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

.post-header {
  padding: 15px;
  background: white;
  border-bottom: 1px solid #e9ecef;
}

.post-header h3 {
  margin: 0 0 5px 0;
  color: #333;
  font-size: 1.1em;
}

.post-date {
  font-size: 0.8em;
  color: #666;
}

.post-media {
  width: 100%;
}

.post-media img,
.post-media video {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.post-description {
  padding: 15px;
  margin: 0;
  color: #555;
  line-height: 1.4;
  background: white;
}

.post-stats {
  padding: 10px 15px;
  background: white;
  border-top: 1px solid #e9ecef;
  display: flex;
  gap: 15px;
  font-size: 0.9em;
  color: #666;
}

/* Responsive Design */
@media (max-width: 768px) {
  .profile-header {
    flex-direction: column;
    text-align: center;
    padding: 30px 20px;
  }
  
  .profile-stats {
    justify-content: center;
  }
  
  .posts-grid {
    grid-template-columns: 1fr;
  }
  
  .profile-actions {
    justify-content: center;
  }
}
</style>