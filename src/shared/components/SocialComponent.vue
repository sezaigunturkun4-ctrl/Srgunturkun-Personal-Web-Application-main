<template>
  <div class="social-container">
    <div class="social-overlay"></div>
    <!-- Upload Section -->
    <div class="upload-section">
      <div v-if="isLoggedIn">
        <h3>Share New Media</h3>
        <div class="upload-controls" v-if="isLoggedIn">
          <input type="file" @change="handleFileSelect" accept="image/*,video/*" />
          <input v-model="mediaTitle" placeholder="Title" class="media-title" required />
          <textarea v-model="mediaDescription" placeholder="Description" class="media-description"></textarea>
          <button @click="uploadMedia" :disabled="!selectedFile || !mediaTitle">
            Upload
          </button>
          <div v-if="error" class="alert alert-danger mt-2">{{ error }}</div>
          <div v-if="uploadSuccess" class="alert alert-success mt-2">Upload successful!</div>
        </div>
      </div>
    </div>
    <div class="login-prompt" v-if=!isLoggedIn>
      <p>Please <router-link to="/login">login</router-link> to share media.</p>
    </div>

    <!-- Filter Controls -->
    <!-- Admin Panel -->
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
        
        <!-- User Management -->
        <div class="admin-section">
          <h4>User Management</h4>
          <div v-if="users.length === 0" class="no-users">
            <p>Admin user management is currently unavailable.</p>
          </div>
          <div v-for="user in users" :key="user.uid" class="user-item">
            <span>{{ user.email }}</span>
            <div class="user-actions">
              <button 
                @click="toggleUserRole(user.uid, 'admin')"
                :class="{ 'active': user.customClaims?.admin }"
                disabled
              >
                Admin
              </button>
              <button 
                @click="toggleUserRole(user.uid, 'moderator')"
                :class="{ 'active': user.customClaims?.moderator }"
                disabled
              >
                Moderator
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="filter-controls" v-if="isLoggedIn">
      <select v-model="sortBy" >
        <option value="date">Sort by Date</option>
        <option value="reactions">Sort by Reactions</option>
      </select>
    </div>

    <!-- User Search Component -->
    <UserSearchComponent v-if="isLoggedIn" />

    <!-- Loading State -->
    <div v-if="isLoggedIn && postsLoading" class="loading-state">
      <p>Loading posts...</p>
    </div>

    <!-- Error State -->
    <div v-if="isLoggedIn && !hasPostsAccess && !postsLoading" class="error-state">
      <p>Unable to access posts. Please check your permissions.</p>
      <p v-if="error" class="error-message">{{ error }}</p>
    </div>

    <!-- Media List -->
    <div v-if="hasPostsAccess" class="media-list">
      <div v-for="item in sortedMedia" :key="item.id" class="media-item">
        <div class="media-header">
          <h4>{{ item.title }}</h4>
          <div class="post-actions">
            <button 
              v-if="isOwnPost(item) || isAdmin"
              @click="deletePost(item.id)" 
              class="delete-btn"
              title="Delete post"
            >
              ❌
            </button>
            <button
              v-if="isAdmin"
              @click="hidePost(item.id)"
              class="hide-btn"
              :title="hiddenPosts.has(item.id) ? 'Show post' : 'Hide post'"
            >
              👁️
            </button>
          </div>
        </div>
        <div class="media-author">
          <div class="author-info">
            <img 
              :src="getUserPhoto(item.userId)" 
              :alt="item.username + ' profile'" 
              class="author-photo"
              @error="$event.target.src = defaultAvatar"
            />
            <span 
              @click="navigateToUserProfile(item.userId)" 
              class="username-link"
              :title="'View ' + item.username + '\'s profile'"
            >
              {{ item.username }}
            </span>
          </div>
        </div>
        
        <video v-if="item.type === 'video'" controls>
          <source :src="item.url" :type="item.mimeType">
        </video>
        <img v-else :src="item.url" :alt="item.title">
        <p>{{ item.description }}</p>
        
        <!-- Reactions Section -->
        <div class="reactions">
          <button 
            v-for="emoji in emojis" 
            :key="emoji"
            @click="addReaction(item.id, emoji)"
            class="emoji-btn"
          >
            {{ emoji }} {{ getReactionCount(item.id, emoji) }}
          </button>
        </div>

        <!-- Comments Section -->
        <div class="comments">
          <div v-for="comment in postComments[item.id] || []" :key="comment.id" class="comment">
            <div class="comment-author">
              <img 
                :src="getUserPhoto(comment.userId)" 
                :alt="comment.username + ' profile'" 
                class="comment-author-photo"
                @error="$event.target.src = defaultAvatar"
              />
              <span 
                @click="navigateToUserProfile(comment.userId)" 
                class="comment-user username-link"
                :title="'View ' + comment.username + '\'s profile'"
              >
                {{ comment.username }}:
              </span>
            </div>
            <span class="comment-text">{{ comment.text }}</span>
          </div>
          <div class="add-comment" v-if="isLoggedIn">
            <input 
              v-model="newComments[item.id]" 
              placeholder="Add a comment..."
              @keyup.enter="addComment(item.id)"
            />
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
    const profilePhoto = ref(localStorage.getItem('profilePhoto') || '')
    const sortBy = ref('date')
    const newComments = ref({})
    const postComments = ref({}) // Store comments for each post
    const showOnlyUserPosts = ref(false)
    const unsubscribe = ref(null) // Store Firestore listener
    const commentsUnsubscribe = ref(null) // Store comments listener
    const error = ref('')
    const uploadSuccess = ref(false)
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

    // Auth state observer
    onMounted(() => {
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

    async function uploadMedia() {
      if (!selectedFile.value || !mediaTitle.value) {
        error.value = 'Please select a file and enter a title'
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
          
          const newMedia = {
            title: mediaTitle.value,
            description: mediaDescription.value,
            url: e.target.result,
            type: selectedFile.value.type.startsWith('video/') ? 'video' : 'image',
            mimeType: selectedFile.value.type,
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
          uploadSuccess.value = true
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            uploadSuccess.value = false
          }, 3000)
          
        } catch (error) {
          console.error('Error uploading media:', error)
          error.value = 'Failed to upload media. Please check your permissions and try again.'
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

    return {
      mediaItems,
      selectedFile,
      mediaTitle,
      mediaDescription,
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
      defaultAvatar
    }
  }
}
</script>

<style scoped>
.social-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
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

.upload-section {
  background: #dd7724ff;
  border-radius: 8px;
}

.upload-controls {
  display: flex;
  flex-direction: column;
  margin: 20px;
  gap: 10px;
}

.media-title {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.media-description {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-height: 80px;
}

.media-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
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
</style>