// Environment variable utility for cross-platform compatibility
// Supports both Vite (import.meta.env) and Vue CLI (process.env)

/**
 * Get environment variable with fallback support for both Vite and Vue CLI
 * @param {string} key - The environment variable key (without prefix)
 * @param {*} defaultValue - Default value if not found
 * @returns {*} The environment variable value
 */
export const getEnvVar = (key, defaultValue = undefined) => {
  // Try Vite first (VITE_ prefix)
  const viteKey = `VITE_${key}`
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[viteKey] !== undefined) {
    return import.meta.env[viteKey]
  }
  
  // Fallback to Vue CLI (VUE_APP_ prefix)
  const vueKey = `VUE_APP_${key}`
  if (typeof process !== 'undefined' && process.env && process.env[vueKey] !== undefined) {
    return process.env[vueKey]
  }
  
  return defaultValue
}

/**
 * Get all Firebase configuration from environment variables
 * @returns {object} Firebase configuration object
 */
export const getFirebaseConfig = () => {
  return {
    apiKey: getEnvVar('FIREBASE_API_KEY'),
    authDomain: getEnvVar('FIREBASE_AUTH_DOMAIN'),
    projectId: getEnvVar('FIREBASE_PROJECT_ID'),
    storageBucket: getEnvVar('FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnvVar('FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnvVar('FIREBASE_APP_ID'),
    measurementId: getEnvVar('FIREBASE_MEASUREMENT_ID')
  }
}

/**
 * Get app configuration from environment variables
 * @returns {object} App configuration object
 */
export const getAppConfig = () => {
  return {
    name: getEnvVar('APP_NAME', 'Personal Web Application'),
    version: getEnvVar('APP_VERSION', '0.1.0'),
    environment: getEnvVar('NODE_ENV', 'development')
  }
}

/**
 * Get feature flags from environment variables
 * @returns {object} Feature flags object
 */
export const getFeatureFlags = () => {
  return {
    analytics: getEnvVar('ENABLE_ANALYTICS', 'true') === 'true',
    debug: getEnvVar('ENABLE_DEBUG', 'false') === 'true',
    socialLogin: getEnvVar('ENABLE_SOCIAL_LOGIN', 'true') === 'true'
  }
}

/**
 * Get contact information from environment variables
 * @returns {object} Contact information object
 */
export const getContactConfig = () => {
  return {
    email: getEnvVar('CONTACT_EMAIL'),
    phone: getEnvVar('CONTACT_PHONE'),
    address: getEnvVar('CONTACT_ADDRESS')
  }
}

/**
 * Check if we're running in development mode
 * @returns {boolean} True if in development mode
 */
export const isDevelopment = () => {
  return getEnvVar('NODE_ENV', 'development') === 'development'
}

/**
 * Check if we're running in production mode
 * @returns {boolean} True if in production mode
 */
export const isProduction = () => {
  return getEnvVar('NODE_ENV', 'development') === 'production'
}

/**
 * Detect the build system being used
 * @returns {string} 'vite' or 'vue-cli'
 */
export const getBuildSystem = () => {
  return typeof import.meta !== 'undefined' && import.meta.env ? 'vite' : 'vue-cli'
}