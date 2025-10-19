import { initializeApp } from "firebase/app"
import { getAnalytics } from "firebase/analytics"
import { getFirestore, collection } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { ref } from 'vue'

// Assign environment variables to string variables
// Support both Vite (VITE_) and Vue CLI (VUE_APP_) prefixes
const apiKey = import.meta.env?.VITE_FIREBASE_API_KEY || process.env.VUE_APP_FIREBASE_API_KEY
const authDomain = import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || process.env.VUE_APP_FIREBASE_AUTH_DOMAIN
const projectId = import.meta.env?.VITE_FIREBASE_PROJECT_ID || process.env.VUE_APP_FIREBASE_PROJECT_ID
const storageBucket = import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || process.env.VUE_APP_FIREBASE_STORAGE_BUCKET
const messagingSenderId = import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.VUE_APP_FIREBASE_MESSAGING_SENDER_ID
const appId = import.meta.env?.VITE_FIREBASE_APP_ID || process.env.VUE_APP_FIREBASE_APP_ID
const measurementId = import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID || process.env.VUE_APP_FIREBASE_MEASUREMENT_ID

// Validate that all required Firebase config values are present
if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
  console.error('Missing Firebase configuration values. Please check your .env file.')
  console.error('Environment detected:', import.meta.env ? 'Vite' : 'Vue CLI')
  console.error('Required variables:', {
    apiKey: !!apiKey,
    authDomain: !!authDomain,
    projectId: !!projectId,
    storageBucket: !!storageBucket,
    messagingSenderId: !!messagingSenderId,
    appId: !!appId
  })
} else {
  console.log('✅ Firebase configuration loaded successfully')
  console.log('Environment detected:', import.meta.env ? 'Vite' : 'Vue CLI')
}

const firebaseConfig = {
  apiKey: apiKey,
  authDomain: authDomain,
  projectId: projectId,
  storageBucket: storageBucket,
  messagingSenderId: messagingSenderId,
  appId: appId,
  measurementId: measurementId
};

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const analytics = getAnalytics(app)

// Initialize Firestore & Auth
const db = getFirestore(app)
const auth = getAuth(app)

// Collection references - create after initialization
const usersCollection = collection(db, 'users')
const postsCollection = collection(db, 'posts')
const commentsCollection = collection(db, 'comments')
const profilesCollection = collection(db, 'profiles')
const gamesCollection = collection(db, 'games')

// User state management
const currentUser = ref(null)
const userLoading = ref(true)

// Setup auth state listener
let unsubscribe
if (auth) {
  unsubscribe = onAuthStateChanged(auth, (user) => {
    currentUser.value = user
    userLoading.value = false
  })
}

// Cleanup function for manual cleanup
const cleanup = () => {
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
}

// Auto cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanup)
}

// User state helpers
const useUser = () => {
  const isAuthenticated = () => !!currentUser.value
  const getUserId = () => currentUser.value?.uid
  const getUserEmail = () => currentUser.value?.email
  const getUserDisplayName = () => currentUser.value?.displayName
  const getUserPhotoURL = () => currentUser.value?.photoURL
  const isUserLoading = () => userLoading.value

  return {
    user: currentUser,
    isAuthenticated,
    getUserId,
    getUserEmail,
    getUserDisplayName,
    getUserPhotoURL,
    isUserLoading
  }
}

// Export services and collections
export {
  db,
  auth,
  usersCollection,
  postsCollection,
  commentsCollection,
  profilesCollection,
  gamesCollection,
  analytics,
  useUser,
  currentUser,
  cleanup
}