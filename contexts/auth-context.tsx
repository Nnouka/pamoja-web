'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User } from '@/lib/types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Create or get user profile from Firestore
  const createUserProfile = async (user: FirebaseUser) => {
    // Handle both uid and localId properties
    const userId = user.uid ?? (user as any).localId;
    console.log('createUserProfile called with user:', { uid: user.uid, localId: (user as any).localId, email: user.email });
    console.log('Using user ID:', userId);
    
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.log('Creating new user profile for:', userId);
      // Create new user profile
      const newUserProfile: User = {
        id: userId,
        email: user.email!,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        xp: 0,
        level: 1,
        streak: 0,
        lastActivity: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      
      await setDoc(userRef, newUserProfile);
      console.log('New user profile created and set:', newUserProfile);
      setUserProfile(newUserProfile);
    } else {
      console.log('User profile exists, updating last activity for:', userId);
      // Update last activity
      const existingProfile = userDoc.data() as User;
      await updateDoc(userRef, {
        lastActivity: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      const updatedProfile = {
        ...existingProfile,
        id: userId, // Ensure the id is set correctly
        lastActivity: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      console.log('Updated user profile set:', updatedProfile);
      setUserProfile(updatedProfile);
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      console.log('Attempting to create user with Firebase Auth...');
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      console.log('User created successfully:', user.uid);
      
      await updateProfile(user, { displayName });
      console.log('Profile updated with display name');
      
      await createUserProfile(user);
      console.log('User profile created in Firestore');
    } catch (error: any) {
      console.error('SignUp Error Details:', {
        code: error.code,
        message: error.message,
        details: error
      });
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        await createUserProfile(user);
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading,
    signUp,
    signIn,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}