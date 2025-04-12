import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js"
import { getAuth, 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js"

import { firebaseConfig } from './firebase_config.js'


const signUp = document.getElementById('sign-up-btn')
const loginBtn = document.getElementById('btn')
const googleLog = document.getElementById('login-google')

signUp.addEventListener('click', handleSignUp)
googleLog.addEventListener('click', handleGoogleLogin)
loginBtn.addEventListener('click', handleEmailLogin)


const provider = new GoogleAuthProvider();

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)

function handleSignUp() {
  const email = document.getElementById('userName').value
  const password = document.getElementById('password').value
  
  // Simple validation
  if (!email || !password) {
    alert("Please enter both email and password");
    return;
  }
  
  if (password.length < 6) {
    alert("Password must be at least 6 characters");
    return;
  }

  createUserWithEmailAndPassword(auth, email, password)
  .then((userCredential) => {
      const user = userCredential.user;
      window.location.href = "logged.html"
  }).catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      alert("Sign up failed: " + errorMessage);

  });
}

function handleEmailLogin() {
    const email = document.getElementById('userName').value
    const password = document.getElementById('password').value
    
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        
        window.location.href = "logged.html"
        console.log("User login successfull", userCredential);
        
      })
      .catch((error) => {
        console.error("Login error: Invalid ID/PASSWORD")
        alert("Login failed: Invalid ID/PASSWORD")
      })

}

function handleGoogleLogin() {

signInWithPopup(auth, provider)
    .then((result) => {
        // This gives you a Google Access Token. You can use it to access the Google API.
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential.accessToken;
        
        const user = result.user;
        window.location.href = "logged.html"
        
    }).catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        const email = error.customData.email;
        console.error("Login error:", errorMessage);
        alert("Login failed: " + errorMessage)
    
    });
}