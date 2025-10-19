<template>
  <div class="signup-box">
    <h2>Sign Up</h2>
    <form @submit.prevent="handleSignup">
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
        <label>Display Name</label>
        <input 
          v-model="username" 
          class="form-control" 
          required 
          autocomplete="username"
        />
      </div>
      <div class="mb-3">
        <label>Password</label>
        <input 
          v-model="password" 
          type="password" 
          class="form-control" 
          required 
          minlength="6"
          autocomplete="new-password"
        />
        <small class="form-text text-muted">Password must be at least 6 characters long</small>
      </div>
      <button type="submit" class="btn btn-primary">Sign Up</button>
      
      <!-- Divider -->
      <div class="divider">
        <span>or</span>
      </div>
      
      <!-- Google Sign Up Button -->
      <button 
        type="button" 
        @click="handleGoogleSignup" 
        class="btn btn-google"
      >
        <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>
      
      <div v-if="error" class="alert alert-danger mt-2">{{ error }}</div>
      <div v-if="success" class="alert alert-success mt-2">
        Account created successfully! <strong>Please check your email and click the verification link before logging in.</strong> You cannot access your account until your email is verified.
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { auth, usersCollection } from '../../firebase/config'
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, GoogleAuthProvider, getRedirectResult, sendEmailVerification, signOut } from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'

// Form state
const email = ref('')
const username = ref('')
const password = ref('')
const error = ref('')
const success = ref(false)
const isSigningIn = ref(false)

// Google provider with custom settings
const googleProvider = new GoogleAuthProvider()
googleProvider.addScope('email')
googleProvider.addScope('profile')
// Set custom parameters to ensure proper popup behavior
googleProvider.setCustomParameters({
  'prompt': 'select_account',
  'access_type': 'offline'
})

// Password validation
const validatePassword = (password) => {
  if (password.length < 6) {
    return 'Password must be at least 6 characters long'
  }
  return null
}

// Signup handler
const handleSignup = async () => {
  error.value = ''
  success.value = false

  // Validate password
  const passwordError = validatePassword(password.value)
  if (passwordError) {
    error.value = passwordError
    return
  }

  try {
    // Create the user account
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email.value,
      password.value
    )

    // Update the user's display name
    await updateProfile(userCredential.user, {
      displayName: username.value
    })

    // Send email verification
    try {
      await sendEmailVerification(userCredential.user)
      console.log('Email verification sent successfully')
    } catch (emailError) {
      console.error('Failed to send email verification:', emailError)
      // Don't fail the signup process if email verification fails
      error.value = 'Account created but failed to send verification email. Please try again later.'
      return
    }
    
    try {
      // Create a document for the user using their UID
      const docRef = doc(usersCollection, userCredential.user.uid);
      const userData = {
        email: email.value,
        displayName: username.value,
        emailVerified: false, // Track email verification status
        createdAt: new Date().toISOString() // Convert Date to ISO string for Firestore
      };
      
      await setDoc(docRef, userData);
    } catch (firestoreError) {
      console.error('Firestore Error:', firestoreError);
      error.value = 'Account created but profile setup failed. Please contact support.';
      return;
    }

    // Sign out the user immediately to prevent access until email is verified
    await signOut(auth)

    // Clear form and show success message with verification info
    success.value = true
    email.value = ''
    username.value = ''
    password.value = ''
  } catch (e) {
    switch (e.code) {
      case 'auth/email-already-in-use':
        error.value = 'This email is already registered'
        break
      case 'auth/invalid-email':
        error.value = 'Invalid email address'
        break
      case 'auth/weak-password':
        error.value = 'Password is too weak'
        break
      default:
        error.value = 'Failed to create account. Please try again.'
    }
  }
}

// Google signup handler with new window approach
const handleGoogleSignup = async () => {
  if (isSigningIn.value) return // Prevent multiple clicks
  
  error.value = ''
  success.value = false
  isSigningIn.value = true

  try {
    // Use popup with specific configuration to avoid COOP issues
    const result = await signInWithPopup(auth, googleProvider)
    const user = result.user

    // Check if user document already exists
    const userDocRef = doc(usersCollection, user.uid)
    const userDoc = await getDoc(userDocRef)

    if (!userDoc.exists()) {
      // Create user document if it doesn't exist (new user)
      const userData = {
        email: user.email,
        displayName: user.displayName || 'Google User',
        photoURL: user.photoURL || '',
        provider: 'google',
        createdAt: new Date().toISOString()
      }
      
      await setDoc(userDocRef, userData)
    }

    success.value = true
    // Clear form
    email.value = ''
    username.value = ''
    password.value = ''
    
  } catch (error) {
    console.error('Google signup error:', error)
    
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
      case 'auth/credential-already-in-use':
        error.value = 'This Google account is already linked to another user.'
        break
      default:
        error.value = 'Failed to sign up with Google. Please try again.'
    }
  } finally {
    isSigningIn.value = false
  }
}

// Handle redirect result when component mounts
onMounted(async () => {
  try {
    const result = await getRedirectResult(auth)
    if (result) {
      // User signed in via redirect
      const user = result.user

      // Check if user document already exists
      const userDocRef = doc(usersCollection, user.uid)
      const userDoc = await getDoc(userDocRef)

      if (!userDoc.exists()) {
        // Create user document if it doesn't exist (new user)
        const userData = {
          email: user.email,
          displayName: user.displayName || 'Google User',
          photoURL: user.photoURL || '',
          provider: 'google',
          createdAt: new Date().toISOString()
        }
        
        await setDoc(userDocRef, userData)
      }

      success.value = true
      // Clear form
      email.value = ''
      username.value = ''
      password.value = ''
    }
  } catch (error) {
    console.error('Redirect result error:', error)
    error.value = 'Failed to complete Google sign-up. Please try again.'
  }
})
</script>

<style scoped>
.signup-box {
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

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
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
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
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

.alert-success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.form-text {
  font-size: 12px;
  margin-top: 5px;
}

.text-muted {
  color: #6c757d;
}
</style>
