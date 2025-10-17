<template>
  <div class="profile-box">
    <div v-if="isLoggedIn" class="profile-content">
      <div class="profile-section">
        <div class="profile-header">
          <div class="profile-photo-container">
            <img :src="profilePhoto" alt="Profile Photo" class="profile-photo" />
            <label class="profile-photo-upload">
              <input type="file" @change="handleProfilePhotoSelect" accept="image/*" class="hidden" />
              <span>Change Photo</span>
            </label>
          </div>
          <div class="profile-info">
            <h2>{{ currentUser }}</h2>
            <div class="about-section">
              <textarea
                v-if="editingAbout"
                v-model="aboutText"
                @blur="saveAbout"
                placeholder="Write something about yourself..."
                class="about-edit"
              ></textarea>
              <p v-else @click="editingAbout = true" class="about-text">
                {{ aboutText || 'Click to add bio...' }}
              </p>
            </div>
            <div class="view-social">
              <button @click="togglePostsView" class="view-social-link">
                {{ showPosts ? 'Hide My Posts' : 'View My Posts' }}
              </button>
            </div>
            
            <!-- User Posts Section -->
            <div v-if="showPosts" class="user-posts-section">
              <h3>My Posts</h3>
              <div v-if="postsLoading" class="loading-posts">
                <p>Loading your posts...</p>
              </div>
              <div v-else-if="userPosts.length === 0" class="no-posts">
                <p>You haven't posted anything yet. <router-link to="/social">Share your first post!</router-link></p>
              </div>
              <div v-else class="posts-list">
                <div v-for="post in userPosts" :key="post.id" class="post-item">
                  <div class="post-header">
                    <h4>{{ post.title }}</h4>
                    <button @click="deleteUserPost(post.id)" class="delete-post-btn" title="Delete post">
                      🗑️
                    </button>
                  </div>
                  <div class="post-content">
                    <video v-if="post.type === 'video'" controls class="post-media">
                      <source :src="post.url" :type="post.mimeType">
                    </video>
                    <img v-else :src="post.url" :alt="post.title" class="post-media">
                    <p class="post-description">{{ post.description }}</p>
                  </div>
                  <div class="post-stats">
                    <span class="post-date">{{ formatDate(post.timestamp) }}</span>
                    <span class="post-reactions">{{ getTotalReactions(post) }} reactions</span>
                    <span class="post-comments">{{ getCommentsCount(post.id) }} comments</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Delete Profile Section -->
            <div class="delete-profile-section">
              <button 
                @click="confirmDeleteProfile" 
                :disabled="isDeleting"
                class="delete-profile-btn"
              >
                <span v-if="!isDeleting">🗑️ Delete Profile</span>
                <span v-else>⏳ Deleting...</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="login-message">
      <p>Please log in to view and edit your profile.</p>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { auth, profilesCollection, postsCollection, commentsCollection, usersCollection, db } from '../../firebase/config'
import { onAuthStateChanged, deleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import defaultAvatar from '../assets/default-avatar.png'
import { doc, setDoc, getDoc, deleteDoc, query, where, getDocs, writeBatch, onSnapshot, orderBy } from 'firebase/firestore'

export default {
  name: 'ProfileComponent',
  setup() {
    // State
    const user = ref(null)
    const displayName = ref('')
    const ppUrl = ref('')
    const userBio = ref('')
    const editingAbout = ref(false)
    const isDeleting = ref(false)
    const showPosts = ref(false)
    const userPosts = ref([])
    const postsLoading = ref(false)
    const postComments = ref({})
    let unsubscribe
    let postsUnsubscribe
    let commentsUnsubscribe

    // Load user profile data from Firestore and localStorage
    async function loadUserProfile(currentUser) {
      if (!currentUser) return
      
      // Add a small delay to ensure the user token is fully processed
      await new Promise(resolve => setTimeout(resolve, 100))
      
      try {
        // Ensure user is authenticated and token is valid
        await currentUser.getIdToken(true) // Force refresh token
        
        // First, try to load from localStorage for immediate display
        const localPhoto = localStorage.getItem(`profilePhoto_${currentUser.uid}`)
        if (localPhoto) {
          ppUrl.value = localPhoto
        }
        
        const docRef = doc(profilesCollection, currentUser.uid)
        const docSnap = await getDoc(docRef)
        
        if (docSnap.exists()) {
          const data = docSnap.data()
          // Use Firestore data, but fallback to localStorage if Firestore photo is missing
          ppUrl.value = data.ppUrl || localPhoto || currentUser.photoURL || ''
          displayName.value = data.displayName || currentUser.displayName || ''
          userBio.value = data.userBio || ''
          
          // Update localStorage with latest Firestore data
          if (data.ppUrl) {
            localStorage.setItem(`profilePhoto_${currentUser.uid}`, data.ppUrl)
          }
        } else {
          // Create initial profile document if it doesn't exist
          const initialProfile = {
            ppUrl: localPhoto || currentUser.photoURL || '',
            displayName: currentUser.displayName || '',
            userBio: '',
            createdAt: new Date()
          }
          
          await setDoc(docRef, initialProfile)
          
          // Set local values
          ppUrl.value = initialProfile.ppUrl
          displayName.value = initialProfile.displayName
          userBio.value = initialProfile.userBio
        }
      } catch (error) {
        console.error('Error loading profile:', error)
        // Use localStorage and Firebase Auth data as fallback
        const localPhoto = localStorage.getItem(`profilePhoto_${currentUser.uid}`)
        ppUrl.value = localPhoto || currentUser.photoURL || ''
        displayName.value = currentUser.displayName || ''
        userBio.value = ''
      }
    }

    onMounted(() => {
      // Set up auth state listener
      unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        user.value = currentUser
        if (currentUser) {
          await loadUserProfile(currentUser)
          // Clean up old profile photos from localStorage
          cleanupOldProfilePhotos()
        }
      })
    })

    onUnmounted(() => {
      if (unsubscribe) unsubscribe()
      if (postsUnsubscribe) postsUnsubscribe()
      if (commentsUnsubscribe) commentsUnsubscribe()
    })

    // Computed
    const isLoggedIn = computed(() => !!user.value)
    const currentUser = computed(() => displayName.value || user.value?.displayName || user.value?.email || '')
    const profilePhoto = computed(() => ppUrl.value || defaultAvatar)
    const aboutText = computed({
      get: () => userBio.value,
      set: (value) => userBio.value = value
    })

    // Methods
    async function handleProfilePhotoSelect(event) {
      const file = event.target.files[0]
      if (!file || !user.value) return

      // Check file size (optional - warn if too large)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        alert('Image is too large. Please choose a smaller image (max 5MB).')
        return
      }

      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const newPhotoURL = e.target.result
          
          // Update local state immediately for responsive UI
          ppUrl.value = newPhotoURL
          
          // Store in localStorage for persistence across sessions
          localStorage.setItem(`profilePhoto_${user.value.uid}`, newPhotoURL)
          
          // Update Firestore profile document (don't update Firebase Auth photoURL)
          const docRef = doc(profilesCollection, user.value.uid)
          const profileData = {
            ppUrl: newPhotoURL,
            displayName: displayName.value,
            userBio: userBio.value,
            updatedAt: new Date()
          }
          
          await setDoc(docRef, profileData, { merge: true })
          console.log('Profile photo updated successfully')
          
        } catch (error) {
          console.error('Error updating profile photo:', error)
          // Revert the local change if update failed
          const fallbackPhoto = localStorage.getItem(`profilePhoto_${user.value.uid}`) || user.value.photoURL || ''
          ppUrl.value = fallbackPhoto
        }
      }
      reader.readAsDataURL(file)
    }

    async function saveAbout() {
      if (!user.value) return
      
      editingAbout.value = false
      
      try {
        // Update Firestore profile document
        const docRef = doc(profilesCollection, user.value.uid)
        const profileData = {
          ppUrl: ppUrl.value,
          displayName: displayName.value,
          userBio: userBio.value,
          updatedAt: new Date()
        }
        
        await setDoc(docRef, profileData, { merge: true })
        console.log('Bio updated successfully')
        
      } catch (error) {
        console.error('Error updating bio:', error)
      }
    }

    async function updateDisplayName(newDisplayName) {
      if (!user.value || !newDisplayName) return
      
      try {
        // Update local state immediately
        displayName.value = newDisplayName
        
        // Update Firestore profile document (skip Firebase Auth to avoid issues)
        const docRef = doc(profilesCollection, user.value.uid)
        const profileData = {
          ppUrl: ppUrl.value,
          displayName: newDisplayName,
          userBio: userBio.value,
          updatedAt: new Date()
        }
        
        await setDoc(docRef, profileData, { merge: true })
        console.log('Display name updated successfully')
        
      } catch (error) {
        console.error('Error updating display name:', error)
        // Revert local change if update failed
        displayName.value = user.value.displayName || ''
      }
    }

    // Utility function to clean up old localStorage entries
    function cleanupOldProfilePhotos() {
      try {
        const currentUserId = user.value?.uid
        if (!currentUserId) return

        // Keep only current user's photo and remove old ones
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('profilePhoto_') && !key.endsWith(currentUserId)) {
            localStorage.removeItem(key)
          }
        })
      } catch (error) {
        console.log('Error cleaning up old photos:', error)
      }
    }

    // Posts Management Functions
    function togglePostsView() {
      showPosts.value = !showPosts.value
      if (showPosts.value && user.value) {
        loadUserPosts()
        loadUserComments()
      } else {
        // Cleanup listeners when hiding posts
        if (postsUnsubscribe) {
          postsUnsubscribe()
          postsUnsubscribe = null
        }
        if (commentsUnsubscribe) {
          commentsUnsubscribe()
          commentsUnsubscribe = null
        }
      }
    }

    function loadUserPosts() {
      if (!user.value || postsUnsubscribe) return
      
      postsLoading.value = true
      const q = query(
        postsCollection, 
        where('userId', '==', user.value.uid),
        orderBy('timestamp', 'desc')
      )
      
      postsUnsubscribe = onSnapshot(q, (snapshot) => {
        const posts = []
        snapshot.forEach((doc) => {
          posts.push({ id: doc.id, ...doc.data() })
        })
        userPosts.value = posts
        postsLoading.value = false
      }, (error) => {
        console.error('Error loading user posts:', error)
        postsLoading.value = false
      })
    }

    function loadUserComments() {
      if (!user.value || commentsUnsubscribe) return
      
      const q = query(commentsCollection, orderBy('timestamp', 'asc'))
      commentsUnsubscribe = onSnapshot(q, (snapshot) => {
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
      })
    }

    async function deleteUserPost(postId) {
      if (!confirm('Are you sure you want to delete this post?')) return
      
      try {
        await deleteDoc(doc(postsCollection, postId))
        
        // Also delete associated comments
        const commentsQuery = query(commentsCollection, where('postId', '==', postId))
        const commentsSnapshot = await getDocs(commentsQuery)
        
        if (!commentsSnapshot.empty) {
          const batch = writeBatch(db)
          commentsSnapshot.forEach((commentDoc) => {
            batch.delete(commentDoc.ref)
          })
          await batch.commit()
        }
        
        console.log('Post and associated comments deleted successfully')
      } catch (error) {
        console.error('Error deleting post:', error)
        alert('Failed to delete post. Please try again.')
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
      
      // Handle Firestore timestamp
      const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }

    // Delete Profile Functions
    function confirmDeleteProfile() {
      const confirmed = confirm(
        "Are you sure about deleting your profile?\n\nYour data will be deleted UNRECOVERABLY!\n\nThis action cannot be undone."
      )
      
      if (confirmed) {
        deleteProfile()
      }
    }

    async function reauthenticateUser(currentUser) {
      try {
        // For email/password users, we need to re-authenticate
        if (currentUser.providerData[0]?.providerId === 'password') {
          const password = prompt('For security, please enter your password to confirm deletion:')
          if (!password) {
            throw new Error('Password required for deletion')
          }
          
          const credential = EmailAuthProvider.credential(currentUser.email, password)
          await reauthenticateWithCredential(currentUser, credential)
        }
        
        // Force token refresh for all users
        await currentUser.getIdToken(true)
        return true
      } catch (error) {
        console.error('Re-authentication failed:', error)
        if (error.code === 'auth/wrong-password') {
          alert('Incorrect password. Please try again.')
        } else if (error.code === 'auth/too-many-requests') {
          alert('Too many failed attempts. Please try again later.')
        } else {
          alert('Authentication failed. Please log out and log back in, then try again.')
        }
        return false
      }
    }

    async function deleteProfile() {
      if (!user.value || isDeleting.value) return
      
      isDeleting.value = true
      const currentUser = user.value
      const userId = currentUser.uid
      
      try {
        console.log('Starting profile deletion process...')
        
        // Step 0: Re-authenticate user for security
        const reauthSuccess = await reauthenticateUser(currentUser)
        if (!reauthSuccess) {
          isDeleting.value = false
          return
        }
        
        // Step 1: Delete all user posts
        await deleteUserPosts(userId)
        
        // Step 2: Delete all user comments
        await deleteUserComments(userId)
        
        // Step 3: Delete user profile document
        await deleteUserProfile(userId)
        
        // Step 4: Delete user document from users collection
        await deleteUserDocument(userId)
        
        // Step 5: Clean up localStorage
        cleanupUserLocalStorage(userId)
        
        // Step 6: Delete Firebase Auth user account
        try {
          await deleteUser(currentUser)
          console.log('Firebase Auth user deleted successfully')
        } catch (authError) {
          console.error('Error deleting Firebase Auth user:', authError)
          
          // Handle specific authentication errors
          if (authError.code === 'auth/requires-recent-login') {
            alert('For security reasons, please log out and log back in, then try deleting your profile again.')
            return
          } else if (authError.code === 'auth/user-token-expired') {
            alert('Your session has expired. Please log out and log back in, then try deleting your profile again.')
            return
          } else {
            console.warn('Could not delete Firebase Auth user, but data was cleaned up:', authError.message)
            // Continue with success message since data was deleted
          }
        }
        
        alert('Profile deleted successfully. You will be redirected to the homepage.')
        
        // Redirect to homepage after successful deletion
        window.location.href = '/'
        
      } catch (error) {
        console.error('Error deleting profile:', error)
        alert(`Failed to delete profile: ${error.message}\n\nPlease try again or contact support.`)
      } finally {
        isDeleting.value = false
      }
    }

    async function deleteUserPosts(userId) {
      try {
        const postsQuery = query(postsCollection, where('userId', '==', userId))
        const postsSnapshot = await getDocs(postsQuery)
        
        if (!postsSnapshot.empty) {
          const batch = writeBatch(db)
          
          postsSnapshot.forEach((docSnapshot) => {
            batch.delete(docSnapshot.ref)
          })
          
          await batch.commit()
          console.log(`Deleted ${postsSnapshot.size} posts`)
        }
      } catch (error) {
        console.error('Error deleting posts:', error)
        throw new Error('Failed to delete posts')
      }
    }

    async function deleteUserComments(userId) {
      try {
        const commentsQuery = query(commentsCollection, where('userId', '==', userId))
        const commentsSnapshot = await getDocs(commentsQuery)
        
        if (!commentsSnapshot.empty) {
          const batch = writeBatch(db)
          
          commentsSnapshot.forEach((docSnapshot) => {
            batch.delete(docSnapshot.ref)
          })
          
          await batch.commit()
          console.log(`Deleted ${commentsSnapshot.size} comments`)
        }
      } catch (error) {
        console.error('Error deleting comments:', error)
        throw new Error('Failed to delete comments')
      }
    }

    async function deleteUserProfile(userId) {
      try {
        const profileRef = doc(profilesCollection, userId)
        await deleteDoc(profileRef)
        console.log('Profile document deleted')
      } catch (error) {
        console.error('Error deleting profile document:', error)
        // Don't throw error if profile doesn't exist
      }
    }

    async function deleteUserDocument(userId) {
      try {
        const userRef = doc(usersCollection, userId)
        await deleteDoc(userRef)
        console.log('User document deleted')
      } catch (error) {
        console.error('Error deleting user document:', error)
        // Don't throw error if user document doesn't exist
      }
    }

    function cleanupUserLocalStorage(userId) {
      try {
        // Remove user-specific localStorage items
        localStorage.removeItem(`profilePhoto_${userId}`)
        
        // Remove any other user-specific data
        Object.keys(localStorage).forEach(key => {
          if (key.includes(userId)) {
            localStorage.removeItem(key)
          }
        })
        
        console.log('localStorage cleaned up')
      } catch (error) {
        console.error('Error cleaning up localStorage:', error)
      }
    }

    return {
      // State
      ppUrl,
      userBio,
      displayName,
      editingAbout,
      defaultAvatar,
      isDeleting,
      showPosts,
      userPosts,
      postsLoading,
      
      // Computed
      isLoggedIn,
      currentUser,
      profilePhoto,
      aboutText,

      // Methods
      handleProfilePhotoSelect,
      saveAbout,
      updateDisplayName,
      confirmDeleteProfile,
      togglePostsView,
      deleteUserPost,
      getTotalReactions,
      getCommentsCount,
      formatDate
    }
  }
};
</script>

<style scoped>
.profile-box {
  max-width: 800px;
  margin: 2rem auto;
  padding: 2rem;
  background: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.profile-content {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.profile-section {
  padding: 24px;
  background: white;
  border-radius: 12px;
}

.profile-header {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.profile-photo-container {
  position: relative;
  width: 150px;
  height: 150px;
  flex-shrink: 0;
}

.profile-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  border: 3px solid #dd7724ff;
}

.profile-photo-upload {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  background: #dd7724ff;
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.9em;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.3s;
}

.profile-photo-container:hover .profile-photo-upload {
  opacity: 1;
}

.hidden {
  display: none;
}

.profile-info {
  flex: 1;
}

.about-section {
  margin: 15px 0;
}

.about-text {
  color: #666;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.about-text:hover {
  background-color: #f8f9fa;
}

.about-edit {
  width: 100%;
  min-height: 80px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
}

.login-message {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.view-social {
  text-align: center;
  margin-top: 20px;
}

.view-social-link {
  display: inline-block;
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-decoration: none;
  border-radius: 25px;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.view-social-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
  color: white;
  text-decoration: none;
}

/* User Posts Section */
.user-posts-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e9ecef;
}

.user-posts-section h3 {
  color: #333;
  margin-bottom: 20px;
  text-align: center;
}

.loading-posts,
.no-posts {
  text-align: center;
  padding: 20px;
  color: #666;
}

.no-posts a {
  color: #667eea;
  text-decoration: none;
}

.no-posts a:hover {
  text-decoration: underline;
}

.posts-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.post-item {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 15px;
  border: 1px solid #e9ecef;
}

.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.post-header h4 {
  margin: 0;
  color: #333;
  font-size: 1.1em;
}

.delete-post-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.2s;
}

.delete-post-btn:hover {
  background: #c82333;
}

.post-content {
  margin-bottom: 15px;
}

.post-media {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin-bottom: 10px;
}

.post-description {
  color: #555;
  margin: 0;
  line-height: 1.4;
}

.post-stats {
  display: flex;
  gap: 15px;
  font-size: 0.9em;
  color: #666;
  padding-top: 10px;
  border-top: 1px solid #dee2e6;
}

.post-date,
.post-reactions,
.post-comments {
  display: flex;
  align-items: center;
}

/* Delete Profile Section */
.delete-profile-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e9ecef;
  text-align: center;
}

.delete-profile-btn {
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 0.9em;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 3px 10px rgba(220, 53, 69, 0.3);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.delete-profile-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 5px 15px rgba(220, 53, 69, 0.4);
  background: linear-gradient(135deg, #c82333 0%, #a71e2a 100%);
}

.delete-profile-btn:active {
  transform: translateY(0);
}

.delete-profile-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
</style>
