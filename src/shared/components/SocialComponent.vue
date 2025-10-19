<template>
  <div class="social-container">
    <div class="social-overlay"></div>
    
    <!-- Main Content Grid -->
    <div class="main-content">
      <!-- Upload Section (Left Column) -->
      <div class="upload-section">
        <h3>📝 Share Your Story</h3>
        
        <div v-if="isLoggedIn" class="upload-form">
          <h4>Create New Post</h4>
          <div class="upload-controls">
            <input 
              type="file" 
              @change="handleFileSelect" 
              accept="image/*,video/*" 
              class="file-input"
              id="media-upload"
            />
            <label for="media-upload" class="file-label">
              📎 Choose Media
            </label>
            
            <select v-model="selectedUploadGame" class="media-game" required>
              <option value="">Select game category...</option>
              <option v-for="game in gameCategories" :key="game" :value="game">{{ game }}</option>
            </select>
            
            <input 
              v-model="mediaTitle" 
              placeholder="Post title..." 
              class="media-title" 
              required 
            />
            
            <textarea 
              v-model="mediaDescription" 
              placeholder="What's on your mind?" 
              class="media-description"
              rows="4"
            ></textarea>
            
            <button 
              @click="uploadMedia" 
              :disabled="!selectedFile || !mediaTitle || !selectedUploadGame || uploadLoading"
              class="upload-btn"
            >
              {{ uploadLoading ? '⏳ Uploading...' : '🚀 Share Post' }}
            </button>
            
            <div v-if="error" class="alert alert-danger mt-2">{{ error }}</div>
            <div v-if="uploadSuccess" class="alert alert-success mt-2">✅ Post shared successfully!</div>
          </div>
        </div>
        
        <div v-else class="login-prompt">
          <div class="login-card">
            <h4>🔐 Join the Community</h4>
            <p>Share your moments with the world!</p>
            <router-link to="/login" class="login-btn">Sign In</router-link>
            <router-link to="/signup" class="signup-btn">Create Account</router-link>
          </div>
        </div>

        <!-- Admin Panel (if admin) -->
        <div v-if="isAdmin" class="admin-panel">
          <button @click="showAdminPanel = !showAdminPanel" class="admin-toggle">
            {{ showAdminPanel ? 'Hide Admin Panel' : 'Show Admin Panel' }}
          </button>
          
          <div v-if="showAdminPanel" class="admin-controls">
            <h3>Admin Controls</h3>
            
            <!-- Admin Disabled Notice -->
            <div class="admin-disabled-notice">
              <p><strong>⚠️ Admin functionality is currently disabled for security reasons.</strong></p>
              <p>Server-side admin features have been removed to enhance application security.</p>
            </div>
          </div>
        </div>
      </div>

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
          <!-- Game Category Selection -->
          <div class="game-filter">
            <label for="game-search" class="filter-label">🎮 Choose Game:</label>
            <div class="game-search-container">
              <input 
                v-model="gameSearchQuery" 
                @input="onGameSearchInput"
                @focus="showGameDropdown = true"
                id="game-search" 
                class="game-search-input" 
                placeholder="Search for a game..." 
                autocomplete="off"
              />
              <div v-if="selectedGame" class="selected-game-display">
                <span class="selected-game-chip">
                  🎮 {{ selectedGame }}
                  <button @click="clearGameSelection" class="clear-game-btn">✕</button>
                </span>
              </div>
            </div>
            
            <!-- Game Buttons Grid -->
            <div v-if="showGameDropdown && !selectedGame" class="games-grid">
              <button 
                v-for="game in filteredGameCategories" 
                :key="game" 
                @click="selectGame(game)"
                class="game-button"
                :class="{ 'highlighted': isGameHighlighted(game) }"
              >
                {{ game }}
              </button>
              <div v-if="filteredGameCategories.length === 0" class="no-games-found">
                No games found matching "{{ gameSearchQuery }}"
              </div>
            </div>
          </div>
          
          <!-- Video Type Selection (only show after game is selected) -->
          <div v-if="selectedGame" class="video-type-filter">
            <label class="filter-label">📹 Video Type:</label>
            <div class="video-type-buttons">
              <button 
                @click="selectedVideoType = 'short'" 
                :class="['type-btn', { 'active': selectedVideoType === 'short' }]"
              >
                ⚡ Short (≤1 min)
              </button>
              <button 
                @click="selectedVideoType = 'long'" 
                :class="['type-btn', { 'active': selectedVideoType === 'long' }]"
              >
                🎬 Long (>1 min)
              </button>
            </div>
          </div>
          
          <!-- Additional filters (only show if logged in and game+type selected) -->
          <div v-if="isLoggedIn && selectedGame && selectedVideoType" class="additional-filters">
            <select v-model="sortBy" class="sort-select">
              <option value="date">Sort by Date</option>
              <option value="reactions">Sort by Reactions</option>
            </select>
            <button @click="showOnlyUserPosts = !showOnlyUserPosts" class="filter-btn">
              {{ showOnlyUserPosts ? '🌐 Show All Posts' : '👤 My Posts Only' }}
            </button>
          </div>
        </div>

        <!-- User Search Component (if logged in) -->
        <UserSearchComponent v-if="isLoggedIn" />

        <!-- Posts Loading State -->
        <div v-if="postsLoading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading amazing posts...</p>
        </div>

        <!-- Error State -->
        <div v-if="isLoggedIn && !hasPostsAccess && !postsLoading" class="error-state">
          <p>Unable to access posts. Please check your permissions.</p>
          <p v-if="error" class="error-message">{{ error }}</p>
        </div>

        <!-- Posts List -->
        <div v-if="!postsLoading" class="posts-list">
          <!-- Game Selection Required -->
          <div v-if="!selectedGame" class="selection-required">
            <div class="selection-card">
              <h4>🎮 Welcome to Gaming Hub!</h4>
              <p>Please select a game category above to view posts</p>
              <div class="popular-games">
                <p><strong>Popular games:</strong></p>
                <div class="game-chips">
                  <span 
                    v-for="game in gameCategories.slice(0, 5)" 
                    :key="game" 
                    @click="selectGame(game)"
                    class="game-chip"
                  >
                    {{ game }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Video Type Selection Required -->
          <div v-else-if="!selectedVideoType" class="selection-required">
            <div class="selection-card">
              <h4>📹 Choose Video Type for {{ selectedGame }}</h4>
              <p>Select the type of content you want to view:</p>
              <div class="type-selection-large">
                <button 
                  @click="selectedVideoType = 'short'" 
                  class="large-type-btn"
                >
                  <div class="btn-icon">⚡</div>
                  <div class="btn-text">
                    <strong>Short Videos</strong>
                    <span>Quick gameplay clips (≤1 minute)</span>
                  </div>
                </button>
                <button 
                  @click="selectedVideoType = 'long'" 
                  class="large-type-btn"
                >
                  <div class="btn-icon">🎬</div>
                  <div class="btn-text">
                    <strong>Long Videos</strong>
                    <span>Extended gameplay & tutorials (>1 minute)</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
          
          <!-- Filtered Posts Display -->
          <div v-else>
            <div class="active-filters">
              <span class="filter-tag">🎮 {{ selectedGame }}</span>
              <span class="filter-tag">📹 {{ selectedVideoType === 'short' ? 'Short Videos' : 'Long Videos' }}</span>
              <button @click="clearFilters" class="clear-filters">✕ Clear</button>
            </div>
            
            <div v-if="filteredPosts.length === 0" class="no-posts">
              <p>🎭 No {{ selectedVideoType }} videos found for {{ selectedGame }}.</p>
              <p>Be the first to share some {{ selectedVideoType === 'short' ? 'quick clips' : 'epic gameplay' }}!</p>
            </div>
            
            <div v-for="(item, index) in displayedPosts" :key="item.id" class="post-item">
            <!-- Post Header -->
            <div class="post-header">
              <div class="post-actions" v-if="isLoggedIn">
                <button
                  v-if="isOwnPost(item) || isAdmin"
                  @click="deletePost(item.id)"
                  class="delete-btn"
                  title="Delete post"
                >
                  🗑️
                </button>
                <button
                  v-if="isAdmin"
                  @click="hidePost(item.id)"
                  class="hide-btn"
                  :title="hiddenPosts.has(item.id) ? 'Show post' : 'Hide post'"
                >
                  {{ hiddenPosts.has(item.id) ? '👁️' : '🙈' }}
                </button>
              </div>
              
              <div class="post-author">
                <div class="author-info">
                  <img 
                    :src="getUserPhoto(item.userId)" 
                    :alt="item.username + ' profile'" 
                    class="author-photo"
                    @error="$event.target.src = defaultAvatar"
                  />
                  <div class="author-details">
                    <span 
                      @click="navigateToUserProfile(item.userId)" 
                      class="username-link"
                      :title="'View ' + item.username + '\'s profile'"
                    >
                      {{ item.username }}
                    </span>
                    <span class="post-date">{{ formatDate(item.timestamp) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Post Content -->
            <div class="post-content">
              <h4 class="post-title">{{ item.title }}</h4>
              
              <div class="post-media">
                <video v-if="item.type === 'video'" controls class="media-content">
                  <source :src="item.url" :type="item.mimeType">
                  Your browser does not support video playback.
                </video>
                <img v-else :src="item.url" :alt="item.title" class="media-content">
              </div>
              
              <p class="post-description">{{ item.description }}</p>
            </div>

            <!-- Post Interactions -->
            <div class="post-interactions">
              <!-- Reactions Section -->
              <div class="reactions">
                <button 
                  v-for="emoji in emojis" 
                  :key="emoji"
                  @click="isLoggedIn ? addReaction(item.id, emoji) : promptLogin()"
                  class="emoji-btn"
                  :class="{ 'logged-out': !isLoggedIn }"
                >
                  {{ emoji }} {{ getReactionCount(item.id, emoji) }}
                </button>
              </div>

              <!-- Comments Section -->
              <div class="comments-section">
                <div class="comments-list">
                  <div v-for="comment in getComments(item.id)" :key="comment.id" class="comment">
                    <div class="comment-author">
                      <img 
                        :src="getUserPhoto(comment.userId)" 
                        :alt="comment.username + ' profile'" 
                        class="comment-author-photo"
                        @error="$event.target.src = defaultAvatar"
                      />
                      <span 
                        @click="isLoggedIn ? navigateToUserProfile(comment.userId) : promptLogin()" 
                        class="comment-user username-link"
                        :title="'View ' + comment.username + '\'s profile'"
                      >
                        {{ comment.username }}:
                      </span>
                    </div>
                    <span class="comment-text">{{ comment.text }}</span>
                  </div>
                </div>
                
                <div class="add-comment" v-if="isLoggedIn">
                  <input 
                    v-model="newComments[item.id]" 
                    placeholder="Add a comment..."
                    @keyup.enter="addComment(item.id)"
                    class="comment-input"
                  />
                </div>
                
                <div v-else class="login-to-comment">
                  <button @click="promptLogin()" class="comment-login-btn">
                    Login to comment
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Guest View Limit Prompt -->
            <div v-if="!isLoggedIn && index >= guestViewLimit - 1" class="guest-limit-prompt">
              <div class="limit-card">
                <h4>🎉 You've seen {{ guestViewLimit }} amazing posts!</h4>
                <p>Join our community to see more, interact, and share your own content.</p>
                <div class="limit-actions">
                  <router-link to="/signup" class="join-btn">Join Now</router-link>
                  <router-link to="/login" class="login-link">Already have an account?</router-link>
                </div>
              </div>
            </div>
            
            <!-- Progressive Login Prompt -->
            <div v-if="!isLoggedIn && shouldShowProgressivePrompt(index)" class="progressive-prompt">
              <p>💡 <router-link to="/signup">Create an account</router-link> to like and comment on posts!</p>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { auth, postsCollection, commentsCollection, profilesCollection, db } from '../../firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import defaultAvatar from '../assets/default-avatar.png'
import UserSearchComponent from './UserSearchComponent.vue'
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
  getDoc
} from 'firebase/firestore'

export default {
  name: 'SocialComponent',
  components: {
    UserSearchComponent
  },
  setup() {
    // Router setup
    const router = useRouter()
    
    // State
    const mediaItems = ref([])
    const selectedFile = ref(null)
    const mediaTitle = ref('')
    const mediaDescription = ref('')
    const selectedUploadGame = ref('')
    const profilePhoto = ref(localStorage.getItem('profilePhoto') || '')
    const sortBy = ref('date')
    const newComments = ref({})
    const postComments = ref({}) // Store comments for each post
    const showOnlyUserPosts = ref(false)
    const unsubscribe = ref(null) // Store Firestore listener
    const commentsUnsubscribe = ref(null) // Store comments listener
    const error = ref('')
    const uploadSuccess = ref(false)
    const uploadLoading = ref(false)
    const isAdmin = ref(false)
    const users = ref([])
    const showAdminPanel = ref(false)
    const hiddenPosts = ref(new Set())
    const postsLoading = ref(true)
    const canAccessPosts = ref(false)
    const userProfiles = ref({}) // Cache for user profile data
    const emojis = ['👍', '❤️', '😆', '😮', '😢']
    const user = ref(null)
    const isLoggedIn = computed(() => !!user.value)
    const currentUser = computed(() => user.value?.displayName || '')
    const hasPostsAccess = computed(() => canAccessPosts.value && !postsLoading.value)
    
    // Game filtering system
    const selectedGame = ref('')
    const selectedVideoType = ref('')
    const gameSearchQuery = ref('')
    const showGameDropdown = ref(false)
    const gameCategories = ref([
      'Minecraft', 'Fortnite', 'Call of Duty', 'League of Legends', 'Valorant',
      'Apex Legends', 'Roblox', 'Genshin Impact', 'Among Us', 'Fall Guys',
      'Rocket League', 'Overwatch 2', 'Counter-Strike 2', 'Dota 2', 'FIFA',
      'GTA V', 'Red Dead Redemption', 'Cyberpunk 2077', 'The Witcher',
      'Elden Ring', 'Dark Souls', 'Zelda', 'Pokemon', 'Other'
    ])
    
    // Computed for filtered game categories based on search
    const filteredGameCategories = computed(() => {
      if (!gameSearchQuery.value) {
        return gameCategories.value
      }
      return gameCategories.value.filter(game => 
        game.toLowerCase().includes(gameSearchQuery.value.toLowerCase())
      )
    })

    // Auth state observer
    onMounted(() => {
      // Add click outside event listener
      document.addEventListener('click', handleClickOutside)
      
      const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
        user.value = currentUser
        
        if (currentUser) {
          try {
            const token = await currentUser.getIdTokenResult()
            isAdmin.value = !!token.claims.admin
            if (isAdmin.value) {
              // Load users for admin
              loadUsers()
            }
            
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
      // Remove click outside event listener
      document.removeEventListener('click', handleClickOutside)
      
      if (unsubscribe.value) {
        unsubscribe.value()
      }
      if (commentsUnsubscribe.value) {
        commentsUnsubscribe.value()
      }
    })

    const userPosts = computed(() => 
      mediaItems.value.filter(item => item.userId === auth.currentUser?.uid)
    )

    const totalReactionsReceived = computed(() => {
      return userPosts.value.reduce((total, post) => {
        const postReactions = Object.values(post.reactions)
          .reduce((sum, reactions) => sum + reactions.length, 0)
        return total + postReactions
      }, 0)
    })

    const sortedMedia = computed(() => {
      let filteredItems = showOnlyUserPosts.value && auth.currentUser
        ? mediaItems.value.filter(item => item.userId === auth.currentUser.uid)
        : mediaItems.value

      return [...filteredItems].sort((a, b) => {
        if (sortBy.value === 'date') {
          // Handle Firestore timestamps
          const aTime = a.timestamp?.seconds || 0
          const bTime = b.timestamp?.seconds || 0
          return bTime - aTime
        }
        return getTotalReactions(b.id) - getTotalReactions(a.id)
      })
    })
    
    // Filter posts by game and video type
    const filteredPosts = computed(() => {
      if (!selectedGame.value || !selectedVideoType.value) return []
      
      return sortedMedia.value.filter(post => {
        // Check if post has game category
        const postGame = post.game || 'Other'
        if (postGame !== selectedGame.value) return false
        
        // Check video duration for type filtering
        if (post.type === 'video' && post.duration) {
          const duration = post.duration // in seconds
          if (selectedVideoType.value === 'short') {
            return duration <= 60 // 1 minute or less
          } else {
            return duration > 60 // more than 1 minute
          }
        }
        
        // For posts without duration data, include all videos in 'long' category
        // and all non-video posts in 'short' category
        if (post.type === 'video') {
          return selectedVideoType.value === 'long'
        } else {
          return selectedVideoType.value === 'short'
        }
      })
    })
    
    // Display posts with guest viewing limits
    const displayedPosts = computed(() => {
      if (!selectedGame.value || !selectedVideoType.value) return []
      
      if (isLoggedIn.value) {
        return filteredPosts.value
      }
      return filteredPosts.value.slice(0, guestViewLimit.value + 3)
    })

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

    function handleFileSelect(event) {
      selectedFile.value = event.target.files[0]
    }
    
    // Helper function to get video duration
    function getVideoDuration(videoDataUrl) {
      return new Promise((resolve) => {
        const video = document.createElement('video')
        video.preload = 'metadata'
        video.onloadedmetadata = () => {
          resolve(Math.round(video.duration)) // Return duration in seconds
        }
        video.onerror = () => {
          resolve(null) // Return null if cannot determine duration
        }
        video.src = videoDataUrl
      })
    }

    async function uploadMedia() {
      if (!selectedFile.value || !mediaTitle.value || !selectedUploadGame.value) {
        error.value = 'Please select a file, enter a title, and choose a game category'
        return
      }
      
      if (!auth.currentUser) {
        error.value = 'Please log in to upload media'
        return
      }

      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          error.value = '' // Clear any previous errors
          uploadLoading.value = true
          
          // Detect video duration for videos
          let videoDuration = null
          if (selectedFile.value.type.startsWith('video/')) {
            videoDuration = await getVideoDuration(e.target.result)
          }
          
          const newMedia = {
            title: mediaTitle.value,
            description: mediaDescription.value,
            game: selectedUploadGame.value,
            url: e.target.result,
            type: selectedFile.value.type.startsWith('video/') ? 'video' : 'image',
            mimeType: selectedFile.value.type,
            duration: videoDuration, // in seconds
            timestamp: serverTimestamp(),
            reactions: {},
            comments: [],
            userId: auth.currentUser.uid,
            username: auth.currentUser.displayName || auth.currentUser.email
          }
          
          await addDoc(postsCollection, newMedia)
          
          // Reset form
          selectedFile.value = null
          mediaTitle.value = ''
          mediaDescription.value = ''
          selectedUploadGame.value = ''
          uploadLoading.value = false
          uploadSuccess.value = true
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            uploadSuccess.value = false
          }, 3000)
          
        } catch (error) {
          console.error('Error uploading media:', error)
          error.value = 'Failed to upload media. Please check your permissions and try again.'
          uploadLoading.value = false
        }
      }
      reader.readAsDataURL(selectedFile.value)
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

    function getReactionCount(mediaId, emoji) {
      const media = mediaItems.value.find(item => item.id === mediaId)
      return media?.reactions?.[emoji]?.length || 0
    }

    function getTotalReactions(mediaId) {
      const media = mediaItems.value.find(item => item.id === mediaId)
      if (!media?.reactions) return 0
      return Object.values(media.reactions)
        .reduce((total, reactions) => total + reactions.length, 0)
    }

    async function addComment(mediaId) {
      if (!isLoggedIn.value || !newComments.value[mediaId]) return
      
      if (!auth.currentUser) {
        error.value = 'Please log in to add comments'
        return
      }
      
      // Validate comment text
      const commentText = newComments.value[mediaId].trim()
      if (!commentText) {
        error.value = 'Comment cannot be empty'
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
          timestamp: serverTimestamp() // Use serverTimestamp for top-level field
        }
        
        // Validate the comment object before adding
        if (!newComment.postId || !newComment.userId || !newComment.username || !newComment.text) {
          throw new Error('Invalid comment data')
        }
        
        // Add comment to separate comments collection
        await addDoc(commentsCollection, newComment)
        newComments.value[mediaId] = ''
      } catch (error) {
        console.error('Error adding comment:', error)
        error.value = 'Failed to add comment. Please check your permissions.'
      }
    }

    function handleProfilePhotoSelect(event) {
      const file = event.target.files[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (e) => {
        profilePhoto.value = e.target.result
        localStorage.setItem('profilePhoto', e.target.result)
      }
      reader.readAsDataURL(file)
    }

    function isOwnPost(post) {
      return auth.currentUser && post.userId === auth.currentUser.uid
    }

    // Admin functions (disabled - server removed for security)
    async function loadUsers() {
      try {
        // Admin server functionality has been disabled for security reasons
        console.warn('Admin functionality disabled: Server removed for security')
        users.value = []
      } catch (err) {
        error.value = 'Admin functionality is currently disabled'
        console.error('Admin functionality disabled:', err)
      }
    }

    async function toggleUserRole() {
      try {
        // Admin server functionality has been disabled for security reasons
        console.warn('Admin functionality disabled: Server removed for security')
        error.value = 'Admin functionality is currently disabled for security reasons'
      } catch (err) {
        error.value = 'Admin functionality is currently disabled'
        console.error('Admin functionality disabled:', err)
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

    async function deletePost(postId) {
      if (!confirm('Are you sure you want to delete this post?')) return

      const isAdminDeletion = isAdmin.value && !isOwnPost({ id: postId })
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

    // Get user profile photo
    function getUserPhoto(userId) {
      return userProfiles.value[userId]?.ppUrl || defaultAvatar
    }

    // Get user display name
    function getUserDisplayName(userId) {
      return userProfiles.value[userId]?.displayName || 'Anonymous User'
    }

    // Guest viewing logic
    const guestViewLimit = ref(5) // Number of posts guests can see initially
    const showLoginPrompt = ref(false)
    
    // Computed for limited posts display
    const limitedPosts = computed(() => {
      if (isLoggedIn.value) {
        return sortedMedia.value
      }
      return sortedMedia.value.slice(0, guestViewLimit.value + 3) // Show a few more to encourage signup
    })
    
    // Check if should show progressive prompt
    const shouldShowProgressivePrompt = (index) => {
      if (isLoggedIn.value) return false
      // Show prompt at post 3 and every 3 posts after
      return index === 2 || (index > 2 && (index + 1) % 3 === 0)
    }
    
    // Prompt login function
    const promptLogin = () => {
      showLoginPrompt.value = true
      router.push('/login')
    }
    
    // Get comments for a specific post
    const getComments = (postId) => {
      return postComments.value[postId] || []
    }
    
    // Game filtering functions
    const onGameChange = () => {
      // Reset video type when game changes
      selectedVideoType.value = ''
    }
    
    const selectGame = (game) => {
      selectedGame.value = game
      gameSearchQuery.value = ''
      showGameDropdown.value = false
      onGameChange()
    }
    
    const clearGameSelection = () => {
      selectedGame.value = ''
      gameSearchQuery.value = ''
      selectedVideoType.value = ''
      showGameDropdown.value = false
    }
    
    const onGameSearchInput = () => {
      showGameDropdown.value = true
    }
    
    const isGameHighlighted = (game) => {
      if (!gameSearchQuery.value) return false
      return game.toLowerCase().includes(gameSearchQuery.value.toLowerCase())
    }
    
    const clearFilters = () => {
      selectedGame.value = ''
      selectedVideoType.value = ''
      gameSearchQuery.value = ''
      showGameDropdown.value = false
    }
    
    // Click outside handler to close dropdown
    const handleClickOutside = (event) => {
      const gameFilter = document.querySelector('.game-filter')
      if (gameFilter && !gameFilter.contains(event.target)) {
        showGameDropdown.value = false
      }
    }

    return {
      mediaItems,
      selectedFile,
      mediaTitle,
      mediaDescription,
      selectedUploadGame,
      uploadLoading,
      sortBy,
      newComments,
      postComments,
      emojis,
      isLoggedIn,
      sortedMedia,
      handleFileSelect,
      uploadMedia,
      addReaction,
      getReactionCount,
      addComment,
      isOwnPost,
      deletePost,
      profilePhoto,
      handleProfilePhotoSelect,
      showOnlyUserPosts,
      currentUser,
      userPosts,
      totalReactionsReceived,
      error,
      uploadSuccess,
      postsLoading,
      canAccessPosts,
      hasPostsAccess,
      showAdminPanel,
      users,
      isAdmin,
      toggleUserRole,
      hidePost,
      navigateToUserProfile,
      loadUserProfile,
      getUserPhoto,
      getUserDisplayName,
      defaultAvatar,
      // Guest viewing functionality
      guestViewLimit,
      limitedPosts,
      shouldShowProgressivePrompt,
      promptLogin,
      getComments,
      // Game filtering functionality
      selectedGame,
      selectedVideoType,
      gameCategories,
      gameSearchQuery,
      showGameDropdown,
      filteredGameCategories,
      filteredPosts,
      displayedPosts,
      onGameChange,
      selectGame,
      clearGameSelection,
      onGameSearchInput,
      isGameHighlighted,
      clearFilters
    }
  }
}
</script>

<style scoped>
.social-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

/* Main content grid layout */
.main-content {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 30px;
  min-height: 80vh;
}

/* Responsive design */
@media (max-width: 768px) {
  .main-content {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

.social-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: url('../assets/SocialBackground.png') center/cover;
  opacity: 0.7;
  z-index: -1;
  filter: brightness(0.7);
}

.hidden {
  display: none;
}

/* Upload Section (Left Side) */
.upload-section {
  background: linear-gradient(135deg, #dd7724ff 0%, #f39c12 100%);
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 10px 30px rgba(221, 119, 36, 0.2);
  height: fit-content;
  position: sticky;
  top: 20px;
}

.upload-section h3 {
  color: white;
  margin-bottom: 20px;
  text-align: center;
  font-size: 1.5em;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.upload-form h4 {
  color: white;
  margin-bottom: 15px;
  font-size: 1.2em;
}

.login-prompt {
  text-align: center;
}

.login-card {
  background: rgba(255,255,255,0.95);
  padding: 30px;
  border-radius: 15px;
  box-shadow: 0 5px 20px rgba(0,0,0,0.1);
}

.login-card h4 {
  color: #dd7724ff;
  margin-bottom: 15px;
}

.login-card p {
  color: #666;
  margin-bottom: 20px;
}

.login-btn, .signup-btn {
  display: inline-block;
  padding: 12px 20px;
  margin: 5px;
  border-radius: 25px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s;
}

.login-btn {
  background: #dd7724ff;
  color: white;
}

.signup-btn {
  background: transparent;
  color: #dd7724ff;
  border: 2px solid #dd7724ff;
}

.login-btn:hover, .signup-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(221, 119, 36, 0.3);
  text-decoration: none;
}

.login-btn:hover {
  color: white;
}

.signup-btn:hover {
  background: #dd7724ff;
  color: white;
}

/* Upload Controls */
.upload-controls {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.file-input {
  display: none;
}

.file-label {
  display: inline-block;
  padding: 12px 20px;
  background: rgba(255,255,255,0.9);
  color: #dd7724ff;
  border-radius: 25px;
  cursor: pointer;
  font-weight: 600;
  text-align: center;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.file-label:hover {
  background: white;
  border-color: rgba(255,255,255,0.5);
  transform: translateY(-1px);
}

.upload-btn {
  background: rgba(255,255,255,0.9);
  color: #dd7724ff;
  border: none;
  padding: 15px 25px;
  border-radius: 25px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 1.1em;
}

.upload-btn:hover:not(:disabled) {
  background: white;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(255,255,255,0.3);
}

.upload-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Posts Section (Right Side) */
.posts-section {
  background: rgba(255,255,255,0.95);
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  backdrop-filter: blur(10px);
}

.posts-header {
  margin-bottom: 25px;
  text-align: center;
}

.posts-header h3 {
  color: #333;
  font-size: 1.8em;
  margin-bottom: 15px;
}

.guest-prompt {
  background: #e3f2fd;
  padding: 15px;
  border-radius: 10px;
  border-left: 4px solid #2196f3;
}

.guest-prompt p {
  margin: 0;
  color: #1976d2;
}

.guest-prompt a {
  color: #1565c0;
  font-weight: 600;
  text-decoration: none;
}

.guest-prompt a:hover {
  text-decoration: underline;
}

.filter-controls {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 25px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 15px;
  border: 2px solid #e9ecef;
}

.filter-label {
  font-weight: 600;
  color: #495057;
  margin-bottom: 8px;
  display: block;
}

.game-filter {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
}

.game-search-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.game-search-input {
  padding: 12px 15px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  background: white;
  font-size: 1em;
  transition: all 0.3s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.game-search-input:focus {
  outline: none;
  border-color: #dd7724ff;
  box-shadow: 0 0 0 3px rgba(221, 119, 36, 0.1);
}

.selected-game-display {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.selected-game-chip {
  background: #dd7724ff;
  color: white;
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 0.9em;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}

.clear-game-btn {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 1.1em;
  padding: 0;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.clear-game-btn:hover {
  background: rgba(255,255,255,0.2);
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
  max-height: 300px;
  overflow-y: auto;
  padding: 15px;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  z-index: 1000;
}

.game-button {
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  color: #495057;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9em;
  font-weight: 500;
  transition: all 0.3s;
  text-align: center;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.game-button:hover {
  background: #e9ecef;
  border-color: #dee2e6;
  transform: translateY(-1px);
}

.game-button.highlighted {
  background: #fff3cd;
  border-color: #ffc107;
  color: #856404;
  font-weight: 600;
}

.game-button:active {
  transform: translateY(0);
}

.no-games-found {
  grid-column: 1 / -1;
  text-align: center;
  padding: 20px;
  color: #6c757d;
  font-style: italic;
}

.video-type-filter {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.video-type-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.type-btn {
  background: white;
  color: #6c757d;
  border: 2px solid #e0e0e0;
  padding: 12px 20px;
  border-radius: 25px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s;
  flex: 1;
  min-width: 150px;
}

.type-btn:hover {
  border-color: #dd7724ff;
  color: #dd7724ff;
}

.type-btn.active {
  background: #dd7724ff;
  color: white;
  border-color: #dd7724ff;
  box-shadow: 0 4px 12px rgba(221, 119, 36, 0.3);
}

.additional-filters {
  display: flex;
  gap: 15px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  padding-top: 15px;
  border-top: 1px solid #dee2e6;
}

.sort-select {
  padding: 10px 15px;
  border: 2px solid #e0e0e0;
  border-radius: 25px;
  background: white;
  font-size: 0.9em;
  cursor: pointer;
  transition: all 0.3s;
}

.sort-select:focus {
  outline: none;
  border-color: #dd7724ff;
}

.filter-btn {
  background: #f5f5f5;
  color: #333;
  border: 2px solid #e0e0e0;
  padding: 10px 20px;
  border-radius: 25px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s;
}

.filter-btn:hover {
  background: #dd7724ff;
  color: white;
  border-color: #dd7724ff;
}

.media-title, .media-description, .media-game {
  padding: 15px;
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 10px;
  background: rgba(255,255,255,0.9);
  font-size: 1em;
  transition: all 0.3s;
}

.media-title:focus, .media-description:focus, .media-game:focus {
  outline: none;
  border-color: rgba(255,255,255,0.8);
  background: white;
  box-shadow: 0 0 0 3px rgba(255,255,255,0.2);
}

.media-game {
  cursor: pointer;
}

.media-description {
  min-height: 100px;
  resize: vertical;
  font-family: inherit;
}

/* Selection screens */
.selection-required {
  display: flex;
  justify-content: center;
  padding: 40px 20px;
}

.selection-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 40px;
  border-radius: 20px;
  box-shadow: 0 15px 35px rgba(0,0,0,0.2);
  text-align: center;
  max-width: 600px;
  width: 100%;
}

.selection-card h4 {
  font-size: 1.8em;
  margin-bottom: 15px;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.selection-card p {
  margin-bottom: 25px;
  opacity: 0.9;
  font-size: 1.1em;
}

.popular-games {
  margin-top: 25px;
}

.game-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-top: 15px;
}

.game-chip {
  background: rgba(255,255,255,0.2);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s;
  backdrop-filter: blur(10px);
  font-weight: 500;
}

.game-chip:hover {
  background: rgba(255,255,255,0.3);
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.2);
}

.type-selection-large {
  display: flex;
  gap: 20px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 25px;
}

.large-type-btn {
  background: rgba(255,255,255,0.1);
  border: 2px solid rgba(255,255,255,0.3);
  color: white;
  padding: 25px;
  border-radius: 15px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 15px;
  min-width: 250px;
  backdrop-filter: blur(10px);
}

.large-type-btn:hover {
  background: rgba(255,255,255,0.2);
  border-color: rgba(255,255,255,0.5);
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.2);
}

.btn-icon {
  font-size: 2.5em;
  flex-shrink: 0;
}

.btn-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
}

.btn-text strong {
  font-size: 1.2em;
}

.btn-text span {
  opacity: 0.8;
  font-size: 0.9em;
}

/* Active filters display */
.active-filters {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px;
  background: #e8f5e8;
  border-radius: 10px;
  border-left: 4px solid #28a745;
  flex-wrap: wrap;
}

.filter-tag {
  background: #28a745;
  color: white;
  padding: 6px 12px;
  border-radius: 15px;
  font-size: 0.9em;
  font-weight: 500;
}

.clear-filters {
  background: #dc3545;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 15px;
  cursor: pointer;
  font-size: 0.9em;
  font-weight: 500;
  transition: all 0.3s;
  margin-left: auto;
}

.clear-filters:hover {
  background: #c82333;
  transform: scale(1.05);
}

/* Posts List */
.posts-list {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.no-posts {
  text-align: center;
  padding: 60px 20px;
  color: #666;
  font-size: 1.2em;
  background: linear-gradient(45deg, #f8f9fa, #e9ecef);
  border-radius: 15px;
  border: 2px dashed #dee2e6;
}

.post-item {
  background: white;
  border-radius: 15px;
  box-shadow: 0 5px 20px rgba(0,0,0,0.08);
  border: 1px solid #f0f0f0;
  overflow: hidden;
  transition: all 0.3s ease;
}

.post-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.12);
}

.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px 15px;
  border-bottom: 1px solid #f0f0f0;
}

.post-actions {
  display: flex;
  gap: 10px;
}

.delete-btn, .hide-btn {
  background: #fff5f5;
  border: 1px solid #fed7d7;
  color: #e53e3e;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1.1em;
}

.delete-btn:hover, .hide-btn:hover {
  background: #fed7d7;
  transform: scale(1.1);
}

.post-author {
  flex: 1;
}

.author-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.post-date {
  font-size: 0.8em;
  color: #999;
}

.post-content {
  padding: 20px 25px;
}

.post-title {
  color: #333;
  margin-bottom: 15px;
  font-size: 1.3em;
  font-weight: 600;
}

.post-media {
  margin: 15px 0;
  border-radius: 10px;
  overflow: hidden;
}

.media-content {
  width: 100%;
  height: auto;
  border-radius: 10px;
}

.post-description {
  color: #666;
  line-height: 1.6;
  margin: 15px 0 0;
}

.post-interactions {
  padding: 20px 25px;
  background: #fafafa;
  border-top: 1px solid #f0f0f0;
}

.media-item {
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  border: 1px solid #e1e1e1;
}

.media-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.media-author {
  font-size: 0.9em;
  color: #666;
  margin-bottom: 15px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.author-photo {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #dd7724ff;
}

.author-text {
  color: #666;
}

.username-link {
  color: #667eea;
  cursor: pointer;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
  padding: 2px 4px;
  border-radius: 3px;
}

.username-link:hover {
  background-color: #f0f3ff;
  color: #5a67d8;
  text-decoration: underline;
  transform: translateY(-1px);
}

.delete-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.delete-btn:hover {
  background-color: #ffebee;
}

.media-item video,
.media-item img {
  max-width: 100%;
  border-radius: 4px;
}

.reactions {
  display: flex;
  gap: 10px;
  margin: 10px 0;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.emoji-btn {
  background: black;
  border: 1px solid #ced4da;
  border-radius: 20px;
  padding: 5px 10px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.emoji-btn:hover {
  background-color: black;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.comments {
  margin-top: 15px;
  border-top: 1px solid #dee2e6;
  padding-top: 15px;
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
}

.comment {
  margin-bottom: 8px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.comment-author {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.comment-author-photo {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid #dd7724ff;
}

.comment-user {
  font-weight: bold;
}

.comment-user.username-link {
  font-weight: bold;
}

.add-comment input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-top: 10px;
}

.filter-controls {
  margin-bottom: 20px;
}

.filter-controls select {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.loading-state,
.error-state {
  text-align: center;
  padding: 40px 20px;
  margin: 20px 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.loading-state p {
  color: #666;
  font-size: 1.1em;
}

.error-state p {
  color: #dc3545;
  margin: 10px 0;
}

.error-message {
  font-size: 0.9em;
  background: #f8d7da;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #f5c6cb;
}

/* Admin Styles */
.admin-panel {
  margin-bottom: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 15px;
  border: 1px solid #e9ecef;
}

.admin-disabled-notice {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 15px;
  color: #856404;
}

.admin-disabled-notice p {
  margin: 5px 0;
}

.admin-disabled-notice strong {
  color: #6c4c00;
}

.admin-toggle {
  background: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.admin-controls {
  margin-top: 15px;
}

.admin-section {
  margin-top: 15px;
  padding: 15px;
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.no-users {
  text-align: center;
  padding: 20px;
  color: #666;
  font-style: italic;
}

.user-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid #eee;
}

.user-actions {
  display: flex;
  gap: 8px;
}

.user-actions button {
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
}

.user-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f8f9fa;
}

.user-actions button.active {
  background: #28a745;
  color: white;
  border-color: #28a745;
}

.user-actions button.active:disabled {
  background: #6c757d;
  border-color: #6c757d;
}

.post-actions {
  display: flex;
  gap: 8px;
}

.hide-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px;
  border-radius: 50%;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.hide-btn:hover {
  opacity: 1;
}

/* Guest viewing styles */
.guest-limit-prompt {
  margin: 20px 0;
  text-align: center;
}

.limit-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 30px;
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  max-width: 500px;
  margin: 0 auto;
}

.limit-card h4 {
  margin-bottom: 15px;
  font-size: 1.4em;
}

.limit-card p {
  margin-bottom: 25px;
  opacity: 0.9;
}

.limit-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  align-items: center;
}

.join-btn {
  background: white;
  color: #667eea;
  padding: 12px 25px;
  border-radius: 25px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s;
}

.join-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.2);
  text-decoration: none;
  color: #667eea;
}

.login-link {
  color: white;
  text-decoration: underline;
  opacity: 0.8;
  transition: opacity 0.3s;
}

.login-link:hover {
  opacity: 1;
  color: white;
  text-decoration: underline;
}

.progressive-prompt {
  background: #f8f9fa;
  border: 2px dashed #dee2e6;
  border-radius: 10px;
  padding: 15px;
  margin: 15px 0;
  text-align: center;
}

.progressive-prompt p {
  margin: 0;
  color: #6c757d;
}

.progressive-prompt a {
  color: #007bff;
  font-weight: 600;
  text-decoration: none;
}

.progressive-prompt a:hover {
  text-decoration: underline;
}

.login-to-comment {
  padding: 10px;
  text-align: center;
}

.comment-login-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background 0.3s;
}

.comment-login-btn:hover {
  background: #0056b3;
}

.comment-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 20px;
  outline: none;
  font-size: 0.9em;
}

.comment-input:focus {
  border-color: #007bff;
}
</style>