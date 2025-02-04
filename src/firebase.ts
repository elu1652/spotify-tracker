// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
//import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
//import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDlndpYc8izUJjkL0Ol5uq75kO54b5_WmU",
  authDomain: "spotify-tracker-b8e04.firebaseapp.com",
  databaseURL: "https://spotify-tracker-b8e04-default-rtdb.firebaseio.com",
  projectId: "spotify-tracker-b8e04",
  storageBucket: "spotify-tracker-b8e04.firebasestorage.app",
  messagingSenderId: "425664511144",
  appId: "1:425664511144:web:074aa12e79d0d9720b969d",
  measurementId: "G-MBCL489NDP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);
const db = getFirestore(app);

export { db };