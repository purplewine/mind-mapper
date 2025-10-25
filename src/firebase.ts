// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCFf1X1EjUiD8NlK0gs3iPUGKZM1y2l5gY",
  authDomain: "sajankhandelwalpersonsalweb.firebaseapp.com",
  projectId: "sajankhandelwalpersonsalweb",
  storageBucket: "sajankhandelwalpersonsalweb.firebasestorage.app",
  messagingSenderId: "1044780058446",
  appId: "1:1044780058446:web:8d2128c578d3c11b87801f",
  measurementId: "G-5JX2C07772"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);