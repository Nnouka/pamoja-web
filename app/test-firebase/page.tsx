'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestFirebasePage() {
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testFirebaseConnection = async () => {
    setLoading(true);
    setTestResult('Testing Firebase connection...');

    try {
      // Test Firebase initialization
      const { auth, db, storage } = await import('@/lib/firebase');
      setTestResult(prev => prev + '\n✅ Firebase modules imported successfully');

      // Test auth state
      setTestResult(prev => prev + '\n✅ Firebase Auth initialized: ' + (auth ? 'Yes' : 'No'));
      
      // Test Firestore
      setTestResult(prev => prev + '\n✅ Firestore initialized: ' + (db ? 'Yes' : 'No'));
      
      // Test Storage
      setTestResult(prev => prev + '\n✅ Storage initialized: ' + (storage ? 'Yes' : 'No'));
      
      // Test Firestore write operation
      setTestResult(prev => prev + '\n🔄 Testing Firestore write...');
      const { collection, addDoc, getDocs, deleteDoc, doc, Timestamp } = await import('firebase/firestore');
      
      const testDoc = await addDoc(collection(db, 'test'), {
        message: 'Hello from test',
        timestamp: Timestamp.now()
      });
      setTestResult(prev => prev + '\n✅ Firestore write successful. Doc ID: ' + testDoc.id);
      
      // Test Firestore read operation
      setTestResult(prev => prev + '\n🔄 Testing Firestore read...');
      const snapshot = await getDocs(collection(db, 'test'));
      setTestResult(prev => prev + '\n✅ Firestore read successful. Found ' + snapshot.docs.length + ' documents');
      
      // Clean up test document
      await deleteDoc(doc(db, 'test', testDoc.id));
      setTestResult(prev => prev + '\n✅ Test document cleaned up');
      
      // Test configuration
      setTestResult(prev => prev + '\n✅ All Firebase services working correctly!');
      
    } catch (error: any) {
      console.error('Firebase test error:', error);
      setTestResult(prev => prev + '\n❌ Error: ' + (error.message || error.toString()));
      
      if (error.code) {
        setTestResult(prev => prev + '\n❌ Error Code: ' + error.code);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Firebase Connection Test</CardTitle>
          <CardDescription>
            Test Firebase configuration and connectivity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testFirebaseConnection} disabled={loading}>
            {loading ? 'Testing...' : 'Test Firebase Connection'}
          </Button>
          
          {testResult && (
            <div className="bg-gray-100 p-4 rounded font-mono text-sm whitespace-pre-line">
              {testResult}
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded">
            <h3 className="font-semibold mb-2">Environment Variables Status:</h3>
            <div className="text-sm space-y-1">
              <p>API Key: {process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing'}</p>
              <p>Auth Domain: {process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '❌ Missing'}</p>
              <p>Project ID: {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '❌ Missing'}</p>
              <p>Storage Bucket: {process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '❌ Missing'}</p>
              <p>Messaging Sender ID: {process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? '✅ Set' : '❌ Missing'}</p>
              <p>App ID: {process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? '✅ Set' : '❌ Missing'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}