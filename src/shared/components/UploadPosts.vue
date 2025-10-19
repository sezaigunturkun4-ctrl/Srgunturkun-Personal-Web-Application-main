<template>
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
        
        <select v-model="selectedUploadGame" class="media-game" required :disabled="gamesLoading">
          <option value="">{{ gamesLoading ? 'Loading games from Firebase...' : gameCategories.length === 1 && gameCategories[0] === 'Other' ? 'Games unavailable - using Other' : 'Select game category...' }}</option>
          <option v-for="game in gameCategories" :key="game" :value="game">{{ game }}</option>
        </select>
        
        <div v-if="gameCategories.length === 1 && gameCategories[0] === 'Other' && !gamesLoading" class="upload-games-error">
          <p>⚠️ Could not load games from database. Only "Other" category available.</p>
        </div>
        
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
        
        <!-- Games Management Section -->
        <div class="admin-section">
          <h4>🎮 Games Management</h4>
          <p>Current games in database: {{ gameCategories.length }}</p>
          <div class="games-admin-actions">
            <button 
              @click="$emit('reloadGames')" 
              class="admin-btn reload-btn"
              :disabled="gamesLoading"
            >
              {{ gamesLoading ? '🔄 Loading...' : '🔄 Reload Games' }}
            </button>
            <button 
              @click="$emit('createDefaultGames')" 
              class="admin-btn create-btn"
              :disabled="gamesLoading || (gameCategories.length > 1)"
            >
              📋 Create Default Games
            </button>
          </div>
          <p v-if="gameCategories.length <= 1" class="admin-hint">
            💡 If games collection is empty, use "Create Default Games" to populate with popular titles
          </p>
        </div>
        
        <!-- Admin Disabled Notice -->
        <div class="admin-disabled-notice">
          <p><strong>⚠️ Some admin functionality is currently disabled for security reasons.</strong></p>
          <p>Server-side admin features have been removed to enhance application security.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { auth, postsCollection } from '../../firebase/config'
import { addDoc, serverTimestamp } from 'firebase/firestore'

export default {
  name: 'UploadPosts',
  props: {
    gameCategories: {
      type: Array,
      default: () => []
    },
    gamesLoading: {
      type: Boolean,
      default: false
    },
    isLoggedIn: {
      type: Boolean,
      default: false
    },
    isAdmin: {
      type: Boolean,
      default: false
    }
  },
  emits: ['reloadGames', 'createDefaultGames', 'postUploaded'],
  setup(props, { emit }) {
    // State
    const selectedFile = ref(null)
    const mediaTitle = ref('')
    const mediaDescription = ref('')
    const selectedUploadGame = ref('')
    const error = ref('')
    const uploadSuccess = ref(false)
    const uploadLoading = ref(false)
    const showAdminPanel = ref(false)

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

    function handleFileSelect(event) {
      selectedFile.value = event.target.files[0]
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
          
          // Emit event to parent
          emit('postUploaded', newMedia)
          
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

    return {
      selectedFile,
      mediaTitle,
      mediaDescription,
      selectedUploadGame,
      error,
      uploadSuccess,
      uploadLoading,
      showAdminPanel,
      handleFileSelect,
      uploadMedia
    }
  }
}
</script>

<style scoped>
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

.upload-games-error {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  padding: 12px;
  margin-top: 8px;
}

.upload-games-error p {
  color: #856404;
  margin: 0;
  font-size: 0.85em;
  text-align: center;
}

.alert {
  padding: 10px;
  border-radius: 5px;
  margin-top: 10px;
}

.alert-danger {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.alert-success {
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}

/* Admin Styles */
.admin-panel {
  margin-top: 20px;
  background: rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 15px;
  border: 1px solid rgba(255,255,255,0.2);
}

.admin-toggle {
  background: rgba(255,255,255,0.9);
  color: #dd7724ff;
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
}

.admin-toggle:hover {
  background: white;
  transform: translateY(-1px);
}

.admin-controls {
  margin-top: 15px;
}

.admin-controls h3 {
  color: white;
  margin-bottom: 15px;
}

.admin-section {
  margin-top: 15px;
  padding: 15px;
  background: rgba(255,255,255,0.9);
  border-radius: 8px;
  border-left: 4px solid #dd7724ff;
}

.admin-section h4 {
  margin: 0 0 15px 0;
  color: #dd7724ff;
  font-size: 1.1em;
}

.admin-section p {
  color: #666;
  margin: 10px 0;
  font-size: 0.9em;
}

.games-admin-actions {
  display: flex;
  gap: 10px;
  margin: 15px 0;
  flex-wrap: wrap;
}

.admin-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9em;
  font-weight: 500;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 5px;
}

.reload-btn {
  background: #007bff;
  color: white;
}

.reload-btn:hover:not(:disabled) {
  background: #0056b3;
  transform: translateY(-1px);
}

.create-btn {
  background: #28a745;
  color: white;
}

.create-btn:hover:not(:disabled) {
  background: #1e7e34;
  transform: translateY(-1px);
}

.admin-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.admin-hint {
  background: #e3f2fd;
  color: #1565c0;
  padding: 10px;
  border-radius: 6px;
  margin: 10px 0;
  font-size: 0.85em;
  border-left: 3px solid #2196f3;
}

.admin-disabled-notice {
  background: rgba(255, 243, 205, 0.9);
  border: 1px solid #ffeaa7;
  border-radius: 6px;
  padding: 15px;
  margin-top: 15px;
  color: #856404;
}

.admin-disabled-notice p {
  margin: 5px 0;
  color: #856404;
}

.admin-disabled-notice strong {
  color: #6c4c00;
}
</style>