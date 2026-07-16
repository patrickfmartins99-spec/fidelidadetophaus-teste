// firebase.js
// Módulo 2: Configuração e Conexão com o Firebase

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, set, onValue, get, push, remove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDZBx7Vrsdfh" + "gOGxbDyDHAkfOhRvNiIg0Q",
    authDomain: "fidelidadetophausnavega.firebaseapp.com",
    databaseURL: "https://fidelidadetophausnavega-default-rtdb.firebaseio.com",
    projectId: "fidelidadetophausnavega",
    storageBucket: "fidelidadetophausnavega.firebasestorage.app"
};

// Inicialização das Instâncias
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// ==========================================================================
// EXPOSIÇÃO GLOBAL (Para uso nos outros módulos sem quebrar a arquitetura)
// ==========================================================================
window.firebaseApp = app;
window.db = db;
window.auth = auth;

// Expondo as funções do SDK do Firebase que são usadas pelo sistema
window.firebaseRef = ref;
window.firebaseSet = set;
window.firebaseOnValue = onValue;
window.firebaseGet = get;
window.firebasePush = push;
window.firebaseRemove = remove;
window.firebaseSignIn = signInWithEmailAndPassword;
window.firebaseSignOut = signOut;
window.firebaseOnAuthStateChanged = onAuthStateChanged;