'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { updateUserStreak, validateUserStreak, getTodayProgress } from '@/lib/database';

export default function DebugPage() {
  const { currentUser, userProfile } = useAuth();
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const checkDatabase = async () => {
    setLoading(true);
    setDebugInfo('Checking database...\n');

    try {
      // Check current user info
      const userId = currentUser?.uid ?? (currentUser as any)?.localId;
      setDebugInfo(prev => prev + `Current User UID: ${currentUser?.uid || 'Not set'}\n`);
      setDebugInfo(prev => prev + `Current User localId: ${(currentUser as any)?.localId || 'Not set'}\n`);
      setDebugInfo(prev => prev + `Resolved User ID: ${userId || 'Not logged in'}\n`);
      setDebugInfo(prev => prev + `User Profile ID: ${userProfile?.id || 'No profile'}\n`);
      setDebugInfo(prev => prev + `User Profile Email: ${userProfile?.email || 'No email'}\n\n`);

      // Check all notes in database
      setDebugInfo(prev => prev + '=== ALL NOTES IN DATABASE ===\n');
      const notesSnapshot = await getDocs(query(collection(db, 'notes'), limit(10)));
      
      if (notesSnapshot.empty) {
        setDebugInfo(prev => prev + 'No notes found in database\n');
      } else {
        notesSnapshot.docs.forEach((doc, index) => {
          const data = doc.data();
          setDebugInfo(prev => prev + `Note ${index + 1}:\n`);
          setDebugInfo(prev => prev + `  ID: ${doc.id}\n`);
          setDebugInfo(prev => prev + `  Title: ${data.title}\n`);
          setDebugInfo(prev => prev + `  UserId: ${data.userId}\n`);
          setDebugInfo(prev => prev + `  Created: ${data.createdAt?.toDate?.() || 'Unknown'}\n\n`);
        });
      }

      // Check all users in database
      setDebugInfo(prev => prev + '=== ALL USERS IN DATABASE ===\n');
      const usersSnapshot = await getDocs(query(collection(db, 'users'), limit(10)));
      
      if (usersSnapshot.empty) {
        setDebugInfo(prev => prev + 'No users found in database\n');
      } else {
        usersSnapshot.docs.forEach((doc, index) => {
          const data = doc.data();
          setDebugInfo(prev => prev + `User ${index + 1}:\n`);
          setDebugInfo(prev => prev + `  Doc ID: ${doc.id}\n`);
          setDebugInfo(prev => prev + `  Profile ID: ${data.id}\n`);
          setDebugInfo(prev => prev + `  Email: ${data.email}\n`);
          setDebugInfo(prev => prev + `  Display Name: ${data.displayName}\n\n`);
        });
      }

      // Check all challenges
      setDebugInfo(prev => prev + '=== ALL CHALLENGES IN DATABASE ===\n');
      const challengesSnapshot = await getDocs(query(collection(db, 'challenges'), limit(5)));
      
      if (challengesSnapshot.empty) {
        setDebugInfo(prev => prev + 'No challenges found in database\n');
      } else {
        challengesSnapshot.docs.forEach((doc, index) => {
          const data = doc.data();
          setDebugInfo(prev => prev + `Challenge ${index + 1}:\n`);
          setDebugInfo(prev => prev + `  ID: ${doc.id}\n`);
          setDebugInfo(prev => prev + `  Question: ${data.question}\n`);
          setDebugInfo(prev => prev + `  UserId: ${data.userId}\n`);
          setDebugInfo(prev => prev + `  NoteId: ${data.noteId}\n\n`);
        });
      }

    } catch (error: any) {
      setDebugInfo(prev => prev + `Error: ${error.message}\n`);
      console.error('Debug error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testStreaks = async () => {
    if (!currentUser?.uid) return;
    
    setLoading(true);
    setDebugInfo('Testing streak functionality...\n');

    try {
      const userId = currentUser.uid;
      
      // Check current streak state
      setDebugInfo(prev => prev + `Current streak: ${userProfile?.streak || 0}\n`);
      setDebugInfo(prev => prev + `Last activity: ${userProfile?.lastActivity?.toDate()?.toISOString() || 'Never'}\n\n`);
      
      // Check today's progress
      const todayProgress = await getTodayProgress(userId);
      setDebugInfo(prev => prev + `Today's progress:\n`);
      if (todayProgress) {
        setDebugInfo(prev => prev + `  - Challenges completed: ${todayProgress.challengesCompleted}\n`);
        setDebugInfo(prev => prev + `  - Streak active: ${todayProgress.streakActive}\n`);
        setDebugInfo(prev => prev + `  - Date: ${todayProgress.date}\n\n`);
      } else {
        setDebugInfo(prev => prev + `  - No progress recorded for today\n\n`);
      }
      
      // Validate streak
      setDebugInfo(prev => prev + 'Running streak validation...\n');
      await validateUserStreak(userId);
      setDebugInfo(prev => prev + 'Streak validation completed\n\n');
      
      // Try to update streak (will only work if user has completed challenges today)
      setDebugInfo(prev => prev + 'Attempting streak update...\n');
      const newStreak = await updateUserStreak(userId);
      setDebugInfo(prev => prev + `Streak after update: ${newStreak}\n\n`);
      
      setDebugInfo(prev => prev + 'Check browser console for detailed logs\n');
      
    } catch (error: any) {
      console.error('Streak test error:', error);
      setDebugInfo(prev => prev + `\nERROR: ${error.message}\n`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Database Debug Information</CardTitle>
          <CardDescription>
            Check what's stored in the database and verify user linkage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={checkDatabase} disabled={loading}>
              {loading ? 'Checking...' : 'Check Database'}
            </Button>
            <Button onClick={testStreaks} disabled={loading} variant="outline">
              {loading ? 'Testing...' : 'Test Streaks'}
            </Button>
          </div>
          
          {debugInfo && (
            <div className="bg-gray-100 p-4 rounded font-mono text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
              {debugInfo}
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded">
            <h3 className="font-semibold mb-2">Current Auth State:</h3>
            <div className="text-sm space-y-1">
              <p>Logged in: {currentUser ? 'Yes' : 'No'}</p>
              <p>User UID: {currentUser?.uid || 'N/A'}</p>
              <p>User localId: {(currentUser as any)?.localId || 'N/A'}</p>
              <p>Resolved ID: {(currentUser?.uid ?? (currentUser as any)?.localId) || 'N/A'}</p>
              <p>Email: {currentUser?.email || 'N/A'}</p>
              <p>Profile loaded: {userProfile ? 'Yes' : 'No'}</p>
              <p>Profile ID: {userProfile?.id || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}