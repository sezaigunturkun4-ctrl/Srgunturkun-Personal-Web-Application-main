<template>
  <div class="login-box">
    <h2>Login</h2>
    <form @submit.prevent="handleLogin" v-if="!user">
      <div class="mb-3">
        <label>Email</label>
        <input 
          v-model="email" 
          type="email" 
          class="form-control" 
          required 
          autocomplete="email"
        />
      </div>
      <div class="mb-3">
        <label>Password</label>
        <input 
          v-model="password" 
          type="password" 
          class="form-control" 
          required 
          autocomplete="current-password"
        />
      </div>
      <button type="submit" class="btn btn-success">Login</button>
      
      <!-- Divider -->
      <div class="divider">
        <span>or</span>
      </div>
      
      <!-- Google Login Button -->
      <button 
        type="button" 
        @click="handleGoogleLogin" 
        class="btn btn-google"
        :disabled="isSigningIn"
      >
        <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <span v-if="!isSigningIn">Continue with Google</span>
        <span v-else>Signing in...</span>
      </button>
      
      <div v-if="error" class="alert alert-danger mt-2">
        {{ error }}
        <div v-if="showResendButton" class="mt-2">
          <button 
            type="button" 
            @click="resendVerificationEmail" 
            class="btn btn-sm btn-outline-primary"
            :disabled="resendingEmail"
          >
            {{ resendingEmail ? 'Sending...' : 'Resend Verification Email' }}
          </button>
        </div>
      </div>
      
      <!-- Signup Link -->
      <div class="signup-link">
        <p>Don't have an account? <router-link to="/signup">Sign up here</router-link></p>
      </div>
    </form>
    <div v-else class="alert alert-info">
      Logged in as <strong>{{ user.email }}</strong>
      <button 
        class="btn btn-sm btn-outline-secondary ms-2" 
        @click="handleLogout"
      >
        Logout
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { auth, usersCollection } from '../../firebase/config'
import { 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  sendEmailVerification
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'

const email = ref('')
const password = ref('')
const error = ref('')
const user = ref(null)
const isSigningIn = ref(false)
const showResendButton = ref(false)
const resendingEmail = ref(false)
const lastFailedEmail = ref('')
let unsubscribe

// Google provider configuration
const googleProvider = new GoogleAuthProvider()
googleProvider.addScope('email')
googleProvider.addScope('profile')
googleProvider.setCustomParameters({
  'prompt': 'select_account'
})

// Setup auth state listener
onMounted(() => {
  unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    console.log('Auth state changed:', currentUser ? `User: ${currentUser.email}` : 'No user')
    user.value = currentUser
    if (currentUser) {
      error.value = '' // Clear errors when user successfully logs in
    }
  })
})

// Cleanup listener on component unmount
onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})

const handleLogin = async () => {
  error.value = ''
  showResendButton.value = false
  
  // Basic validation
  if (!email.value || !password.value) {
    error.value = 'Please fill in all fields'
    return
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.value, password.value)
    
    // Check if email is verified for email/password accounts
    if (userCredential.user.providerData.some(provider => provider.providerId === 'password')) {
      if (!userCredential.user.emailVerified) {
        // Sign out the user immediately
        await signOut(auth)
        lastFailedEmail.value = email.value
        showResendButton.value = true
        error.value = 'Please verify your email before logging in. Check your inbox for a verification link.'
        // Don't clear the fields when login fails due to email verification
        return
      }
    }
    
    // Only clear fields if login is successful
    console.log('Login successful for user:', userCredential.user.email)
    email.value = ''
    password.value = ''
    
    // Optional: Add success feedback or navigation
    // You might want to redirect to a specific page here
    
  } catch (e) {
    console.error('Login error:', e.code, e.message)
    switch (e.code) {
      case 'auth/invalid-email':
        error.value = 'Invalid email address'
        break
      case 'auth/user-not-found':
        error.value = 'No account found with this email'
        break
      case 'auth/wrong-password':
        error.value = 'Incorrect password'
        break
      case 'auth/too-many-requests':
        error.value = 'Too many failed attempts. Please try again later'
        break
      case 'auth/invalid-credential':
        error.value = 'Invalid email or password'
        break
      default:
        error.value = `Failed to login: ${e.message}. Please try again.`
    }
    // Don't clear fields when there's an error, so user can try again
  }
}

const handleLogout = async () => {
  try {
    await signOut(auth)
  } catch (e) {
    error.value = 'Failed to logout. Please try again.'
  }
}

const resendVerificationEmail = async () => {
  if (!lastFailedEmail.value) {
    error.value = 'No email address available for resend'
    return
  }
  
  resendingEmail.value = true
  
  try {
    // We need the current password to sign in temporarily
    if (!password.value) {
      error.value = 'Please enter your password to resend verification email'
      resendingEmail.value = false
      return
    }
    
    // Sign in temporarily to send verification email
    const tempCredential = await signInWithEmailAndPassword(auth, lastFailedEmail.value, password.value)
    
    // Send verification email
    await sendEmailVerification(tempCredential.user)
    
    // Sign out immediately
    await signOut(auth)
    
    error.value = 'Verification email sent! Please check your inbox and verify your email before logging in.'
    showResendButton.value = false
  } catch (e) {
    console.error('Resend verification error:', e)
    if (e.code === 'auth/wrong-password') {
      error.value = 'Incorrect password. Please enter the correct password to resend verification email.'
    } else {
      error.value = 'Failed to resend verification email. Please try again.'
    }
  } finally {
    resendingEmail.value = false
  }
}

const handleGoogleLogin = async () => {
  if (isSigningIn.value) return // Prevent multiple clicks
  
  error.value = ''
  isSigningIn.value = true

  try {
    const result = await signInWithPopup(auth, googleProvider)
    const user = result.user

    // Check if user document already exists
    const userDocRef = doc(usersCollection, user.uid)
    const userDoc = await getDoc(userDocRef)

    if (!userDoc.exists()) {
      // User doesn't exist - they need to sign up first
      await signOut(auth) // Sign them out immediately
      error.value = 'No account found with this Google account. Please sign up first.'
      
      // Redirect to signup page after a short delay
      setTimeout(() => {
        window.location.href = '/signup'
      }, 2000)
      
      return
    }

    // User exists - update last login time
    await setDoc(userDocRef, {
      lastLoginAt: new Date().toISOString()
    }, { merge: true })

    // Clear any error messages
    error.value = ''
    
  } catch (error) {
    console.error('Google login error:', error)
    
    // Handle specific popup-related errors
    switch (error.code) {
      case 'auth/popup-closed-by-user':
        error.value = 'Google sign-in was cancelled.'
        break
      case 'auth/popup-blocked':
        error.value = 'Popup was blocked by your browser. Please allow popups for this site and try again.'
        break
      case 'auth/cancelled-popup-request':
        error.value = 'Another sign-in process is already in progress.'
        break
      case 'auth/unauthorized-domain':
        error.value = 'This domain is not authorized for Google sign-in.'
        break
      case 'auth/operation-not-allowed':
        error.value = 'Google sign-in is not enabled for this app.'
        break
      case 'auth/account-exists-with-different-credential':
        error.value = 'An account already exists with this email using a different sign-in method.'
        break
      default:
        error.value = 'Failed to sign in with Google. Please try again.'
    }
  } finally {
    isSigningIn.value = false
  }
}
</script>

<style scoped>
.login-box {
  max-width: 350px;
  margin: 2rem auto;
  padding: 2rem;
  background: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 10px;
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-success:hover {
  background: #218838;
}

.btn-google {
  background: white;
  color: #333;
  border: 1px solid #dadce0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-weight: 500;
}

.btn-google:hover {
  background: #f8f9fa;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.btn-google:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.google-icon {
  width: 18px;
  height: 18px;
}

.divider {
  text-align: center;
  margin: 20px 0;
  position: relative;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: #dadce0;
}

.divider span {
  background: #f8f9fa;
  padding: 0 15px;
  color: #666;
  font-size: 14px;
}

.form-control {
  width: 100%;
  padding: 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 16px;
}

.form-control:focus {
  outline: none;
  border-color: #28a745;
  box-shadow: 0 0 0 2px rgba(40,167,69,0.25);
}

.mb-3 {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #333;
}

.alert {
  padding: 10px;
  border-radius: 4px;
  margin-top: 10px;
}

.alert-danger {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.alert-info {
  background: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}

.btn-sm {
  padding: 5px 10px;
  font-size: 14px;
}

.btn-outline-secondary {
  background: transparent;
  color: #6c757d;
  border: 1px solid #6c757d;
}

.btn-outline-secondary:hover {
  background: #6c757d;
  color: white;
}

.ms-2 {
  margin-left: 0.5rem;
}

.mt-2 {
  margin-top: 0.5rem;
}

.signup-link {
  text-align: center;
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #e9ecef;
}

.signup-link p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.signup-link a {
  color: #28a745;
  text-decoration: none;
  font-weight: 500;
}

.signup-link a:hover {
  text-decoration: underline;
}
</style>
