<template>
  <div class="game-view">
    <!-- Additional filters (only show if logged in) -->
    <div v-if="isLoggedIn && selectedGame && selectedVideoType" class="additional-filters">
      <select v-model="localSortBy" @change="$emit('sortChanged', localSortBy)" class="sort-select">
        <option value="date">Sort by Date</option>
        <option value="reactions">Sort by Reactions</option>
      </select>
      <button @click="toggleUserPosts" class="filter-btn">
        {{ showOnlyUserPosts ? '🌐 Show All Posts' : '👤 My Posts Only' }}
      </button>
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
      <!-- No posts message -->
      <div v-if="displayedPosts.length === 0 && selectedGame && selectedVideoType" class="no-posts">
        <p>🎭 No {{ selectedVideoType }} videos found for {{ selectedGame }}.</p>
        <p>Be the first to share some {{ selectedVideoType === 'short' ? 'quick clips' : 'epic gameplay' }}!</p>
      </div>
      
      <!-- Posts -->
      <div v-for="(item, index) in displayedPosts" :key="item.id" class="post-item">
        <!-- Post Header -->
        <div class="post-header">
          <div class="post-actions" v-if="isLoggedIn">
            <button
              v-if="isOwnPost(item) || isAdmin"
              @click="$emit('deletePost', item.id)"
              class="delete-btn"
              title="Delete post"
            >
              🗑️
            </button>
            <button
              v-if="isAdmin"
              @click="$emit('hidePost', item.id)"
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
                  @click="$emit('navigateToProfile', item.userId)" 
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
              @click="handleReaction(item.id, emoji)"
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
                    @click="handleProfileNavigation(comment.userId)" 
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
              <button @click="$emit('promptLogin')" class="comment-login-btn">
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
</template>

<script>
import { ref, computed } from 'vue'
import { auth } from '../../firebase/config'
import defaultAvatar from '../assets/default-avatar.png'
import UserSearchComponent from './UserSearchComponent.vue'

export default {
  name: 'GameView',
  components: {
    UserSearchComponent
  },
  props: {
    selectedGame: {
      type: String,
      default: ''
    },
    selectedVideoType: {
      type: String,
      default: ''
    },
    posts: {
      type: Array,
      default: () => []
    },
    comments: {
      type: Object,
      default: () => ({})
    },
    userProfiles: {
      type: Object,
      default: () => ({})
    },
    isLoggedIn: {
      type: Boolean,
      default: false
    },
    isAdmin: {
      type: Boolean,
      default: false
    },
    postsLoading: {
      type: Boolean,
      default: false
    },
    hasPostsAccess: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: ''
    },
    hiddenPosts: {
      type: Set,
      default: () => new Set()
    },
    sortBy: {
      type: String,
      default: 'date'
    },
    showOnlyUserPosts: {
      type: Boolean,
      default: false
    }
  },
  emits: [
    'addReaction', 
    'addComment', 
    'deletePost', 
    'hidePost', 
    'navigateToProfile', 
    'promptLogin',
    'sortChanged',
    'toggleUserPosts'
  ],
  setup(props, { emit }) {
    // State
    const newComments = ref({})
    const localSortBy = ref(props.sortBy)
    const emojis = ['👍', '❤️', '😆', '😮', '😢']
    const guestViewLimit = ref(5)

    // Computed
    const displayedPosts = computed(() => {
      if (!props.selectedGame || !props.selectedVideoType) return []
      
      // Filter posts by game and video type
      let filteredPosts = props.posts.filter(post => {
        const postGame = post.game || 'Other'
        if (postGame !== props.selectedGame) return false
        
        if (post.type === 'video' && post.duration) {
          const duration = post.duration
          if (props.selectedVideoType === 'short') {
            return duration <= 60
          } else {
            return duration > 60
          }
        }
        
        if (post.type === 'video') {
          return props.selectedVideoType === 'long'
        } else {
          return props.selectedVideoType === 'short'
        }
      })

      // Apply user filter if needed
      if (props.showOnlyUserPosts && auth.currentUser) {
        filteredPosts = filteredPosts.filter(post => post.userId === auth.currentUser.uid)
      }

      // Sort posts
      filteredPosts.sort((a, b) => {
        if (props.sortBy === 'date') {
          const aTime = a.timestamp?.seconds || 0
          const bTime = b.timestamp?.seconds || 0
          return bTime - aTime
        }
        return getTotalReactions(b.id) - getTotalReactions(a.id)
      })

      // Limit for guests
      if (props.isLoggedIn) {
        return filteredPosts
      }
      return filteredPosts.slice(0, guestViewLimit.value + 3)
    })

    // Methods
    const getUserPhoto = (userId) => {
      return props.userProfiles[userId]?.ppUrl || defaultAvatar
    }

    const formatDate = (timestamp) => {
      if (!timestamp) return 'Unknown date'
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const getReactionCount = (postId, emoji) => {
      const post = props.posts.find(item => item.id === postId)
      return post?.reactions?.[emoji]?.length || 0
    }

    const getTotalReactions = (postId) => {
      const post = props.posts.find(item => item.id === postId)
      if (!post?.reactions) return 0
      return Object.values(post.reactions)
        .reduce((total, reactions) => total + reactions.length, 0)
    }

    const getComments = (postId) => {
      return props.comments[postId] || []
    }

    const isOwnPost = (post) => {
      return auth.currentUser && post.userId === auth.currentUser.uid
    }

    const shouldShowProgressivePrompt = (index) => {
      if (props.isLoggedIn) return false
      return index === 2 || (index > 2 && (index + 1) % 3 === 0)
    }

    const handleReaction = (postId, emoji) => {
      if (props.isLoggedIn) {
        emit('addReaction', postId, emoji)
      } else {
        emit('promptLogin')
      }
    }

    const handleProfileNavigation = (userId) => {
      if (props.isLoggedIn) {
        emit('navigateToProfile', userId)
      } else {
        emit('promptLogin')
      }
    }

    const addComment = (postId) => {
      if (!props.isLoggedIn || !newComments.value[postId]) return
      
      const commentText = newComments.value[postId].trim()
      if (commentText) {
        emit('addComment', postId, commentText)
        newComments.value[postId] = ''
      }
    }

    const toggleUserPosts = () => {
      emit('toggleUserPosts')
    }

    return {
      newComments,
      localSortBy,
      emojis,
      guestViewLimit,
      displayedPosts,
      getUserPhoto,
      formatDate,
      getReactionCount,
      getTotalReactions,
      getComments,
      isOwnPost,
      shouldShowProgressivePrompt,
      handleReaction,
      handleProfileNavigation,
      addComment,
      toggleUserPosts,
      defaultAvatar
    }
  }
}
</script>

<style scoped>
.game-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.additional-filters {
  display: flex;
  gap: 15px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 10px;
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

.loading-state,
.error-state {
  text-align: center;
  padding: 40px 20px;
  margin: 20px 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #dd7724ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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

.author-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
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

.reactions {
  display: flex;
  gap: 10px;
  margin: 10px 0;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e9ecef;
  background: white;
}

.emoji-btn {
  background: white;
  border: 1px solid #ced4da;
  border-radius: 20px;
  padding: 5px 10px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.emoji-btn:hover {
  background-color: #f8f9fa;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.emoji-btn.logged-out {
  opacity: 0.7;
}

.comments-section {
  margin-top: 15px;
}

.comments-list {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 10px;
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

.comment-text {
  color: #666;
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
</style>