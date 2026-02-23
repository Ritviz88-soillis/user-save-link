import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js"
import { getAuth, 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword,
  onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js"

import { firebaseConfig } from './firebase_config.js'

// ============================================
// DOM Elements
// ============================================
const elements = {
  form: document.getElementById('login-form'),
  signUp: document.getElementById('sign-up-btn'),
  loginBtn: document.getElementById('btn'),
  googleLog: document.getElementById('login-google'),
  userName: document.getElementById('userName'),
  password: document.getElementById('password'),
  togglePassword: document.getElementById('toggle-password'),
  themeToggle: document.getElementById('theme-toggle'),
  toastContainer: document.getElementById('toast-container'),
  emailError: document.getElementById('email-error'),
  passwordError: document.getElementById('password-error'),
  forgotPassword: document.getElementById('forgot-password')
}

// Firebase Initialization

const provider = new GoogleAuthProvider()
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)

// ============================================
// Auth State Guard - Redirect if already logged in
// ============================================
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is already logged in, redirect to dashboard
    console.log("User already authenticated:", user.email)
    window.location.replace("logged.html")
  }
})

// Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem('theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme)
    updateThemeIcon(savedTheme)
  } else if (prefersDark) {
    document.documentElement.setAttribute('data-theme', 'dark')
    updateThemeIcon('dark')
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme')
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark'
  
  document.documentElement.setAttribute('data-theme', newTheme)
  localStorage.setItem('theme', newTheme)
  updateThemeIcon(newTheme)
}

function updateThemeIcon(theme) {
  const icon = elements.themeToggle.querySelector('.theme-icon')
  icon.textContent = theme === 'dark' ? '☀️' : '🌙'
}


// Toast Notifications

function showToast(message, type = 'info', duration = 4000) {
  const toast = document.createElement('div')
  toast.className = `toast ${type}`
  toast.setAttribute('role', 'alert')
  
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }
  
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-message">${message}</span>
  `
  
  elements.toastContainer.appendChild(toast)
  
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out forwards'
    setTimeout(() => toast.remove(), 300)
  }, duration)
}

// Form Validation
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function validatePassword(password) {
  return password.length >= 6
}

function showFieldError(field, errorElement, message) {
  field.classList.add('input-error')
  errorElement.textContent = message
}

function clearFieldError(field, errorElement) {
  field.classList.remove('input-error')
  errorElement.textContent = ''
}

function validateForm() {
  let isValid = true
  const email = elements.userName.value.trim()
  const password = elements.password.value
  
  // Validate email
  if (!email) {
    showFieldError(elements.userName, elements.emailError, 'Email is required')
    isValid = false
  } else if (!validateEmail(email)) {
    showFieldError(elements.userName, elements.emailError, 'Please enter a valid email')
    isValid = false
  } else {
    clearFieldError(elements.userName, elements.emailError)
  }
  
  // Validate password
  if (!password) {
    showFieldError(elements.password, elements.passwordError, 'Password is required')
    isValid = false
  } else if (!validatePassword(password)) {
    showFieldError(elements.password, elements.passwordError, 'Password must be at least 6 characters')
    isValid = false
  } else {
    clearFieldError(elements.password, elements.passwordError)
  }
  
  return isValid
}

// ============================================
// Button Loading State
// ============================================
function setButtonLoading(button, isLoading) {
  if (isLoading) {
    button.classList.add('loading')
    button.disabled = true
  } else {
    button.classList.remove('loading')
    button.disabled = false
  }
}

// ============================================
// Authentication Handlers
// ============================================
async function handleSignUp(e) {
  e.preventDefault()
  
  if (!validateForm()) return
  
  const email = elements.userName.value.trim()
  const password = elements.password.value
  
  setButtonLoading(elements.signUp, true)
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    showToast('Account created successfully! Redirecting...', 'success')
    
    // Small delay to show success message
    setTimeout(() => {
      window.location.href = "logged.html"
    }, 1500)
    
  } catch (error) {
    console.error('Sign up error:', error.code)
    
    const errorMessages = {
      'auth/email-already-in-use': 'This email is already registered. Try logging in.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
      'auth/operation-not-allowed': 'Email/password sign up is not enabled.'
    }
    
    const message = errorMessages[error.code] || 'Sign up failed. Please try again.'
    showToast(message, 'error')
    
  } finally {
    setButtonLoading(elements.signUp, false)
  }
}

async function handleEmailLogin(e) {
  e.preventDefault()
  
  if (!validateForm()) return
  
  const email = elements.userName.value.trim()
  const password = elements.password.value
  
  setButtonLoading(elements.loginBtn, true)
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    showToast('Login successful! Redirecting...', 'success')
    
    setTimeout(() => {
      window.location.href = "logged.html"
    }, 1000)
    
  } catch (error) {
    console.error('Login error:', error.code)
    
    const errorMessages = {
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/user-disabled': 'This account has been disabled.',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
      'auth/invalid-credential': 'Invalid email or password.'
    }
    
    const message = errorMessages[error.code] || 'Login failed. Please check your credentials.'
    showToast(message, 'error')
    
  } finally {
    setButtonLoading(elements.loginBtn, false)
  }
}

async function handleGoogleLogin() {
  setButtonLoading(elements.googleLog, true)
  
  try {
    const result = await signInWithPopup(auth, provider)
    const credential = GoogleAuthProvider.credentialFromResult(result)
    
    showToast(`Welcome, ${result.user.displayName || 'User'}!`, 'success')
    
    setTimeout(() => {
      window.location.href = "logged.html"
    }, 1000)
    
  } catch (error) {
    console.error('Google login error:', error.code)
    
    const errorMessages = {
      'auth/popup-closed-by-user': 'Sign-in cancelled. Please try again.',
      'auth/popup-blocked': 'Popup was blocked. Please allow popups and try again.',
      'auth/cancelled-popup-request': 'Sign-in cancelled.',
      'auth/account-exists-with-different-credential': 'An account already exists with this email.'
    }
    
    const message = errorMessages[error.code] || 'Google sign-in failed. Please try again.'
    showToast(message, 'error')
    
  } finally {
    setButtonLoading(elements.googleLog, false)
  }
}

// ============================================
// Password Visibility Toggle
// ============================================
function togglePasswordVisibility() {
  const type = elements.password.type === 'password' ? 'text' : 'password'
  elements.password.type = type
  elements.togglePassword.textContent = type === 'password' ? '👁️' : '🙈'
  elements.togglePassword.setAttribute('aria-label', 
    type === 'password' ? 'Show password' : 'Hide password')
}

// ============================================
// Forgot Password Handler
// ============================================
function handleForgotPassword(e) {
  e.preventDefault()
  showToast('Password reset feature coming soon!', 'info')
}

// ============================================
// Real-time Validation
// ============================================
function setupRealtimeValidation() {
  elements.userName.addEventListener('blur', () => {
    const email = elements.userName.value.trim()
    if (email && !validateEmail(email)) {
      showFieldError(elements.userName, elements.emailError, 'Please enter a valid email')
    } else {
      clearFieldError(elements.userName, elements.emailError)
    }
  })
  
  elements.password.addEventListener('blur', () => {
    const password = elements.password.value
    if (password && !validatePassword(password)) {
      showFieldError(elements.password, elements.passwordError, 'Password must be at least 6 characters')
    } else {
      clearFieldError(elements.password, elements.passwordError)
    }
  })
  
  // Clear errors on input
  elements.userName.addEventListener('input', () => {
    clearFieldError(elements.userName, elements.emailError)
  })
  
  elements.password.addEventListener('input', () => {
    clearFieldError(elements.password, elements.passwordError)
  })
}

// ============================================
// Keyboard Accessibility
// ============================================
function setupKeyboardNav() {
  // Enter key on inputs submits form
  elements.password.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleEmailLogin(e)
    }
  })
}

// ============================================
// Event Listeners
// ============================================
function setupEventListeners() {
  // Form submission
  elements.form.addEventListener('submit', handleEmailLogin)
  elements.signUp.addEventListener('click', handleSignUp)
  elements.googleLog.addEventListener('click', handleGoogleLogin)
  
  // UI interactions
  elements.togglePassword.addEventListener('click', togglePasswordVisibility)
  elements.themeToggle.addEventListener('click', toggleTheme)
  elements.forgotPassword.addEventListener('click', handleForgotPassword)
  
  // Setup validation and keyboard nav
  setupRealtimeValidation()
  setupKeyboardNav()
}

// ============================================
// Initialize App
// ============================================
function init() {
  initTheme()
  setupEventListeners()
  
  // Focus on email field for quick start
  elements.userName.focus()
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}