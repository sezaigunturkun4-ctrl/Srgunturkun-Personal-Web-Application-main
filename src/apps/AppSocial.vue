<template>
  <div class="social-container">
    <div class="social-overlay"></div>
    
    <!-- Main Content Grid -->
    <div class="main-content">
      <!-- Upload Section (Left Column) -->
      <UploadPosts
        :gameCategories="gameCategories"
        :gamesLoading="gamesLoading"
        :isLoggedIn="isLoggedIn"
        :isAdmin="isAdmin"
        @reloadGames="loadGameCategories"
        @createDefaultGames="createDefaultGameCategories"
        @postUploaded="handlePostUploaded"
      />

      <!-- Posts Viewing Section (Right Column) -->
      <div class="posts-section">
        <div class="posts-header">
          <h3>🌟 Community Posts</h3>
          <div v-if="!isLoggedIn && showLoginPrompt" class="guest-prompt">
            <p>👋 Enjoying the posts? <router-link to="/signup">Join us</router-link> to interact and share!</p>
          </div>
        </div>

        <!-- Filter Controls -->
        <div class="filter-controls">
          <ChooseGameView />
        </div>

        <!-- Game View with Posts -->
        <GameView
          v-if="selectedGame && selectedVideoType"
          :selectedGame="selectedGame"
          :selectedVideoType="selectedVideoType"
          :posts="mediaItems"
          :comments="postComments"
          :userProfiles="userProfiles"
          :isLoggedIn="isLoggedIn"
          :isAdmin="isAdmin"
          :postsLoading="postsLoading"
          :hasPostsAccess="hasPostsAccess"
          :error="error"
          :hiddenPosts="hiddenPosts"
          :sortBy="sortBy"
          :showOnlyUserPosts="showOnlyUserPosts"
          @addReaction="addReaction"
          @addComment="handleAddComment"
          @deletePost="deletePost"
          @hidePost="hidePost"
          @navigateToProfile="navigateToUserProfile"
          @promptLogin="promptLogin"
          @sortChanged="handleSortChanged"
          @toggleUserPosts="toggleUserPosts"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { auth, postsCollection, commentsCollection, profilesCollection, gamesCollection, db } from '../firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import defaultAvatar from '../shared/assets/default-avatar.png'
import UploadPosts from '../shared/components/UploadPosts.vue'
import ChooseGameView from '../shared/components/ChooseGameView.vue'
import GameView from '../shared/components/GameView.vue'
import {
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  collection,
  getDoc,
  getDocs
} from 'firebase/firestore'

export default {
  name: 'AppSocial',
  components: {
    UploadPosts,
    ChooseGameView,
    GameView
  },
  setup() {
    // Router setup
    const router = useRouter()
    
    // State
    const mediaItems = ref([])
    const postComments = ref({}) // Store comments for each post
    const unsubscribe = ref(null) // Store Firestore listener
    const commentsUnsubscribe = ref(null) // Store comments listener
    const error = ref('')
    const isAdmin = ref(false)
    const hiddenPosts = ref(new Set())
    const postsLoading = ref(true)
    const canAccessPosts = ref(false)
    const userProfiles = ref({}) // Cache for user profile data
    const user = ref(null)
    const isLoggedIn = computed(() => !!user.value)
    const hasPostsAccess = computed(() => canAccessPosts.value && !postsLoading.value)
    
    // Game filtering system
    const selectedGame = ref('')
    const selectedVideoType = ref('')
    const gameCategories = ref([]) // Will be loaded from Firestore
    const gamesLoading = ref(true)
    
    // View control
    const sortBy = ref('date')
    const showOnlyUserPosts = ref(false)
    const showLoginPrompt = ref(false)

    // Event Handlers for child components
    const handleGameSelected = (game) => {
      selectedGame.value = game
      selectedVideoType.value = '' // Reset video type when game changes
    }

    const handleVideoTypeSelected = (type) => {
      selectedVideoType.value = type
    }

    const handleFiltersCleared = () => {
      selectedGame.value = ''
      selectedVideoType.value = ''
    }

    const handlePostUploaded = (newPost) => {
      // Post will be automatically added via Firestore listener
      console.log('Post uploaded successfully:', newPost.title)
    }

    const handleAddComment = (postId, commentText) => {
      addComment(postId, commentText)
    }

    const handleSortChanged = (newSort) => {
      sortBy.value = newSort
    }

    const toggleUserPosts = () => {
      showOnlyUserPosts.value = !showOnlyUserPosts.value
    }

    // Comments function - used by GameView component
    async function addComment(mediaId, commentText) {
      if (!auth.currentUser) {
        error.value = 'Please log in to add comments'
        return
      }
      
      // Check if post exists
      const post = mediaItems.value.find(item => item.id === mediaId)
      if (!post) {
        error.value = 'Post not found'
        return
      }
      
      try {
        error.value = '' // Clear any previous errors
        
        const newComment = {
          postId: mediaId, // Reference to the post
          userId: auth.currentUser.uid,
          username: auth.currentUser.displayName || auth.currentUser.email,
          text: commentText,
          timestamp: serverTimestamp()
        }
        
        // Add comment to separate comments collection
        await addDoc(commentsCollection, newComment)
      } catch (error) {
        console.error('Error adding comment:', error)
        error.value = 'Failed to add comment. Please check your permissions.'
      }
    }

    async function addReaction(mediaId, emoji) {
      if (!auth.currentUser) {
        error.value = 'Please log in to react to posts'
        return
      }
      
      const postRef = doc(postsCollection, mediaId)
      const post = mediaItems.value.find(item => item.id === mediaId)
      
      if (!post) {
        error.value = 'Post not found'
        return
      }
      
      const userId = auth.currentUser.uid
      
      try {
        error.value = '' // Clear any previous errors
        
        const updatedReactions = { ...post.reactions }
        if (!updatedReactions[emoji]) {
          updatedReactions[emoji] = []
        }
        
        const userIndex = updatedReactions[emoji].indexOf(userId)
        if (userIndex === -1) {
          updatedReactions[emoji].push(userId)
        } else {
          updatedReactions[emoji].splice(userIndex, 1)
        }
        
        await updateDoc(postRef, { reactions: updatedReactions })
      } catch (error) {
        console.error('Error updating reaction:', error)
        error.value = 'Failed to update reaction. Please check your permissions.'
      }
    }

    async function deletePost(postId) {
      if (!confirm('Are you sure you want to delete this post?')) return

      const isOwnPost = (postId) => {
        const post = mediaItems.value.find(item => item.id === postId)
        return auth.currentUser && post && post.userId === auth.currentUser.uid
      }
      
      const isAdminDeletion = isAdmin.value && !isOwnPost(postId)
      if (isAdminDeletion && !confirm('Delete this post as admin?')) return
      
      try {
        const postRef = doc(postsCollection, postId)
        await deleteDoc(postRef)
        if (isAdminDeletion) {
          // Log admin action
          await addDoc(collection(db, 'admin_logs'), {
            action: 'delete_post',
            postId,
            adminId: auth.currentUser.uid,
            timestamp: serverTimestamp()
          })
        }
      } catch (error) {
        console.error('Error deleting post:', error)
        alert('Failed to delete post. Please try again.')
      }
    }

    async function hidePost(postId) {
      hiddenPosts.value.add(postId)
      try {
        const postRef = doc(postsCollection, postId)
        await updateDoc(postRef, { hidden: true })
      } catch (err) {
        hiddenPosts.value.delete(postId)
        error.value = 'Failed to hide post'
        console.error('Error hiding post:', err)
      }
    }

    // Navigate to user profile
    function navigateToUserProfile(userId) {
      if (!userId) {
        console.warn('No user ID provided for navigation')
        return
      }
      
      // Check if it's the current user - go to their own profile
      if (auth.currentUser && userId === auth.currentUser.uid) {
        router.push('/profile')
      } else {
        // Navigate to public profile view
        router.push(`/user/${userId}`)
      }
    }

    // Load user profile data
    async function loadUserProfile(userId) {
      if (!userId || userProfiles.value[userId]) return userProfiles.value[userId]
      
      try {
        const profileDoc = await getDoc(doc(profilesCollection, userId))
        const profileData = profileDoc.exists() ? profileDoc.data() : {}
        
        const profile = {
          ppUrl: profileData.ppUrl || defaultAvatar,
          displayName: profileData.displayName || 'Anonymous User',
          userBio: profileData.userBio || '',
          ...profileData
        }
        
        userProfiles.value[userId] = profile
        return profile
      } catch (error) {
        console.error('Error loading user profile:', error)
        const fallbackProfile = {
          ppUrl: defaultAvatar,
          displayName: 'Anonymous User',
          userBio: ''
        }
        userProfiles.value[userId] = fallbackProfile
        return fallbackProfile
      }
    }

    // Load profiles for all visible users
    async function loadVisibleUserProfiles() {
      const userIds = new Set()
      
      // Collect user IDs from posts
      mediaItems.value.forEach(post => {
        if (post.userId) userIds.add(post.userId)
      })
      
      // Collect user IDs from comments
      Object.values(postComments.value).forEach(comments => {
        comments.forEach(comment => {
          if (comment.userId) userIds.add(comment.userId)
        })
      })
      
      // Load profiles for all unique user IDs
      const promises = Array.from(userIds).map(userId => loadUserProfile(userId))
      await Promise.all(promises)
    }

    // Load comments from separate comments collection
    function loadComments() {
      if (commentsUnsubscribe.value) {
        commentsUnsubscribe.value()
      }
      
      const q = query(commentsCollection, orderBy('timestamp', 'asc'))
      commentsUnsubscribe.value = onSnapshot(q, async (snapshot) => {
        const comments = {}
        snapshot.forEach((doc) => {
          const comment = { id: doc.id, ...doc.data() }
          const postId = comment.postId
          if (!comments[postId]) {
            comments[postId] = []
          }
          comments[postId].push(comment)
        })
        postComments.value = comments
        
        // Load user profiles for comments
        await loadVisibleUserProfiles()
      }, (error) => {
        console.error('Error fetching comments:', error)
      })
    }

    // Load game categories from Firestore
    async function loadGameCategories() {
      try {
        gamesLoading.value = true
        error.value = '' // Clear any previous errors
        console.log('Loading game categories from Firestore games collection...')
        
        const gamesQuery = query(gamesCollection, orderBy('name', 'asc'))
        const snapshot = await getDocs(gamesQuery)
        
        const games = []
        const gameObjects = [] // Store full game objects for future use
        
        snapshot.forEach((doc) => {
          const gameData = doc.data()
          const gameObject = {
            docId: doc.id, // Firestore document ID
            id: gameData.id || doc.id, // Use custom ID or fallback to doc ID
            name: gameData.name || '',
            description: gameData.description || '',
            developer: gameData.developer || '',
            genre: gameData.genre || '',
            icon: gameData.icon || '',
            rating: gameData.rating || '',
            releaseDate: gameData.releaseDate || '',
            // Legacy fields for compatibility
            displayName: gameData.displayName || gameData.name || '',
            category: gameData.category || 'gaming',
            isActive: gameData.isActive !== undefined ? gameData.isActive : true,
            createdAt: gameData.createdAt,
            createdBy: gameData.createdBy
          }
          
          // Add to full objects array
          gameObjects.push(gameObject)
          
          // Add name to simple array for UI compatibility
          if (gameObject.name && gameObject.isActive !== false) {
            games.push(gameObject.name)
          }
        })
        
        // Store both the simple names array and full objects
        gameCategories.value = games
        // Store full game objects for future use
        window.gameObjectsCache = gameObjects // Optional: store for debugging
        
        // Always ensure at least 'Other' is available if no games in Firestore
        if (games.length === 0) {
          games.push('Other')
          gameCategories.value = games
          console.warn('⚠️ No games found in games collection, added default "Other" category')
        } else if (!games.includes('Other')) {
          games.push('Other')
          gameCategories.value = games
        }
        
        gamesLoading.value = false
        
        console.log(`✅ Loaded ${games.length} game categories from games collection:`, games)
        console.log('📋 Full game objects available in cache:', gameObjects.length, 'items')
        
      } catch (error) {
        console.error('❌ Error loading games from games collection:', error)
        gamesLoading.value = false
        error.value = 'Failed to load games from database. Please check your connection and try again.'
        
        // Only use minimal fallback - just 'Other' category
        gameCategories.value = ['Other']
        
        console.log('🚨 Using minimal fallback: Only "Other" category available due to games collection error')
      }
    }

    // Helper function to create default games in Firestore (for admin use)
    async function createDefaultGameCategories() {
      if (!auth.currentUser || !isAdmin.value) {
        console.warn('Only admins can create default game categories')
        return
      }
      
      const defaultGames = [
        { name: 'Minecraft', genre: 'Sandbox', description: 'Build and explore infinite worlds' },
        { name: 'Fortnite', genre: 'Battle Royale', description: 'Competitive battle royale game' },
        { name: 'Call of Duty', genre: 'FPS', description: 'First-person shooter franchise' },
        { name: 'League of Legends', genre: 'MOBA', description: 'Multiplayer online battle arena' },
        { name: 'Valorant', genre: 'FPS', description: 'Tactical first-person shooter' },
        { name: 'Genshin Impact', genre: 'RPG', description: 'Open-world action RPG' },
        { name: 'Rocket League', genre: 'Sports', description: 'Soccer with rocket-powered cars' },
        { name: 'Overwatch 2', genre: 'FPS', description: 'Team-based shooter' },
        { name: 'Other', genre: 'Various', description: 'Other games not listed' }
      ]
      
      try {
        console.log('Creating default game categories in games collection...')
        const promises = defaultGames.map(game => 
          addDoc(gamesCollection, {
            ...game,
            developer: '',
            icon: '',
            rating: '',
            releaseDate: '',
            isActive: true,
            createdAt: serverTimestamp(),
            createdBy: auth.currentUser.uid
          })
        )
        
        await Promise.all(promises)
        console.log('✅ Default games created successfully')
        
        // Reload games after creation
        await loadGameCategories()
      } catch (error) {
        console.error('❌ Error creating default games:', error)
        error.value = 'Failed to create default games in database'
      }
    }

    // Prompt login function
    const promptLogin = () => {
      showLoginPrompt.value = true
      router.push('/login')
    }

    // Auth state observer
    onMounted(() => {
      // Load game categories from Firestore
      loadGameCategories()
      
      const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
        user.value = currentUser
        
        if (currentUser) {
          try {
            const token = await currentUser.getIdTokenResult()
            isAdmin.value = !!token.claims.admin
            
            // Start Firestore listener only after authentication
            if (!unsubscribe.value) {
              postsLoading.value = true
              canAccessPosts.value = false
              
              const q = query(postsCollection, orderBy('timestamp', 'desc'))
              unsubscribe.value = onSnapshot(q, async (snapshot) => {
                try {
                  const posts = []
                  snapshot.forEach((doc) => {
                    posts.push({ id: doc.id, ...doc.data() })
                  })
                  mediaItems.value = posts
                  canAccessPosts.value = true
                  postsLoading.value = false
                  error.value = '' // Clear any previous errors
                  
                  // Load comments for all posts
                  loadComments()
                  
                  // Load user profiles for posts
                  await loadVisibleUserProfiles()
                } catch (err) {
                  console.error('Error processing posts:', err)
                  canAccessPosts.value = false
                  postsLoading.value = false
                  error.value = 'Failed to process posts data.'
                }
              }, (error) => {
                console.error('Error fetching posts:', error)
                canAccessPosts.value = false
                postsLoading.value = false
                error.value = 'Failed to load posts. Please check your permissions and connection.'
              })
            }
          } catch (err) {
            console.error('Error checking admin status:', err)
            isAdmin.value = false
          }
        } else {
          isAdmin.value = false
          canAccessPosts.value = false
          postsLoading.value = true
          // Clear data when user logs out
          mediaItems.value = []
          postComments.value = {}
          if (unsubscribe.value) {
            unsubscribe.value()
            unsubscribe.value = null
          }
          if (commentsUnsubscribe.value) {
            commentsUnsubscribe.value()
            commentsUnsubscribe.value = null
          }
        }
      })

      // Cleanup auth observer on unmount
      onUnmounted(() => {
        unsubscribeAuth()
      })
    })

    // Cleanup listener on component unmount
    onUnmounted(() => {
      if (unsubscribe.value) {
        unsubscribe.value()
      }
      if (commentsUnsubscribe.value) {
        commentsUnsubscribe.value()
      }
    })

    return {
      // State
      gameCategories,
      gamesLoading,
      isLoggedIn,
      isAdmin,
      selectedGame,
      selectedVideoType,
      mediaItems,
      postComments,
      userProfiles,
      postsLoading,
      hasPostsAccess,
      error,
      hiddenPosts,
      sortBy,
      showOnlyUserPosts,
      showLoginPrompt,
      
      // Event handlers
      handleGameSelected,
      handleVideoTypeSelected,
      handleFiltersCleared,
      handlePostUploaded,
      handleAddComment,
      handleSortChanged,
      toggleUserPosts,
      
      // Functions
      loadGameCategories,
      createDefaultGameCategories,
      addReaction,
      deletePost,
      hidePost,
      navigateToUserProfile,
      promptLogin
    }
  }
}
</script>

<style scoped>
/* Social Container */
.social-container {
  min-height: 100vh;
  position: relative;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  overflow-x: hidden;
}

.social-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: 
    radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 40% 40%, rgba(120, 119, 198, 0.2) 0%, transparent 50%);
  pointer-events: none;
  z-index: 1;
}

/* Main Content Layout */
.main-content {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  position: relative;
  z-index: 2;
  min-height: 100vh;
}

/* Posts Section */
.posts-section {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 1.5rem;
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.1),
    0 8px 16px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  min-height: calc(100vh - 4rem);
}

.posts-header {
  margin-bottom: 1.5rem;
}

.posts-header h3 {
  font-size: 1.8rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 1rem 0;
  font-weight: 700;
}

.guest-prompt {
  background: linear-gradient(135deg, #ff7eb3, #ff758c);
  color: white;
  padding: 1rem;
  border-radius: 15px;
  text-align: center;
  margin-bottom: 1rem;
  box-shadow: 0 4px 15px rgba(255, 117, 140, 0.3);
}

.guest-prompt a {
  color: white;
  text-decoration: none;
  font-weight: 600;
  border-bottom: 2px solid rgba(255, 255, 255, 0.5);
  padding-bottom: 2px;
  transition: all 0.3s ease;
}

.guest-prompt a:hover {
  border-bottom-color: white;
  transform: translateY(-1px);
}

.filter-controls {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: rgba(103, 126, 234, 0.05);
  border-radius: 15px;
  border: 1px solid rgba(103, 126, 234, 0.1);
}

/* Responsive Design */
@media (max-width: 1200px) {
  .main-content {
    grid-template-columns: 1fr;
    gap: 1.5rem;
    padding: 1rem;
  }
  
  .posts-section {
    min-height: auto;
  }
}

@media (max-width: 768px) {
  .main-content {
    padding: 1rem 0.5rem;
    gap: 1rem;
  }
  
  .posts-section {
    padding: 1rem;
    border-radius: 15px;
  }
  
  .posts-header h3 {
    font-size: 1.5rem;
  }
  
  .filter-controls {
    padding: 1rem;
  }
}

@media (max-width: 480px) {
  .main-content {
    padding: 0.5rem;
  }
  
  .posts-section {
    padding: 0.75rem;
    border-radius: 12px;
  }
  
  .posts-header h3 {
    font-size: 1.3rem;
  }
}

/* Scrollbar Styling */
.posts-section::-webkit-scrollbar {
  width: 8px;
}

.posts-section::-webkit-scrollbar-track {
  background: rgba(103, 126, 234, 0.1);
  border-radius: 10px;
}

.posts-section::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 10px;
}

.posts-section::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #5a67d8, #6b46c1);
}
</style>

<style scoped>
.img {
  width:25%;
}
</style>