// Firebase Connection Test
// Run this in browser console to test your Firebase setup

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBegQqK0kzi1YGXrh8QUg9iXx2tPWCyyOo",
  authDomain: "pamoja-a8bbf.firebaseapp.com",
  projectId: "pamoja-a8bbf",
  storageBucket: "pamoja-a8bbf.firebasestorage.app",
  messagingSenderId: "543255122555",
  appId: "1:543255122555:web:376d7b0c8eab74e96b48de"
};

console.log('Testing Firebase config...');
try {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  console.log('Firebase initialized successfully:', app);
  console.log('Auth instance:', auth);
} catch (error) {
  console.error('Firebase initialization error:', error);
}