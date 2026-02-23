import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js"
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js"
import { getAuth, onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js"


import {firebaseConfig} from './firebase_config.js'


const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const database = getDatabase(app)

const inputEl = document.getElementById("input-el")
const inputBtn = document.getElementById("input-btn")
const ulEl = document.getElementById("ul-el")
const deleteBtn = document.getElementById("delete-btn")
// const p = document.getElementById("paragraph")


onAuthStateChanged(auth, (user) => {
    if (!user) {
        console.log("No user logged in, redirecting to login page")
        window.location.replace("index.html")
        return
    }
    
    console.log("User is logged in:", user.email)
    console.log("User is logged in:", user)
    initializeLeadsTracker(user)
});

function initializeLeadsTracker(user) {    
    const userRef = ref(database, `users/${user.email}/leads`)

    deleteBtn.addEventListener("dblclick", function() {
        
        remove(userRef)
        ulEl.innerHTML = "";
    })
    
    inputBtn.addEventListener("click", function() {
            
            push(userRef, inputEl.value);
            inputEl.value = "";
              
    })
    
    onValue(userRef, function(snapshot) {
        if (snapshot.exists()) {
            const snapshotValues = snapshot.val()
            const leads = Object.values(snapshotValues)
            render(leads)
        } 

        else {    
            ulEl.innerHTML = ""
        }
    })
}


function render(leads) {
    let listItems = ""
    for (let i = 0; i < leads.length; i++) {
        listItems += `
            <li>
                <a target='_blank' href='${leads[i]}'>
                    ${leads[i]}
                </a>
            </li>
        `
    }
    ulEl.innerHTML = listItems
}

