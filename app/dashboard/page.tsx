'use client';

import { useAuth } from '@/contexts/auth-context';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Target, Flame, Upload, BookOpen, Play } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getUserNotes, getUserChallenges, getUserDueChallenges } from '@/lib/database';
import { Note, Challenge } from '@/lib/types';

function DashboardContent() {
  const { currentUser, userProfile, logout } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [dueChallenges, setDueChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentUser?.uid) return;
      
      try {
        console.log('Fetching dashboard data for user:', currentUser.uid);
        
        const [userNotes, userChallenges, userDueChallenges] = await Promise.all([
          getUserNotes(currentUser.uid),
          getUserChallenges(currentUser.uid, 5),
          getUserDueChallenges(currentUser.uid)
        ]);
        
        console.log('Dashboard data fetched:', {
          notesCount: userNotes.length,
          challengesCount: userChallenges.length,
          dueChallengesCount: userDueChallenges.length
        });
        
        setNotes(userNotes);
        setChallenges(userChallenges);
        setDueChallenges(userDueChallenges);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentUser?.uid]);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Pamoja</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {userProfile?.displayName || 'User'}!
              </span>
              <Link href="/notes">
                <Button variant="outline">
                  <BookOpen className="mr-2 h-4 w-4" />
                  My Notes
                </Button>
              </Link>
              <Link href="/leaderboard">
                <Button variant="outline">
                  <Trophy className="mr-2 h-4 w-4" />
                  Leaderboard
                </Button>
              </Link>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total XP</CardTitle>
              <Trophy className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userProfile?.xp || 0}</div>
              <p className="text-xs text-muted-foreground">
                Level {userProfile?.level || 1}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
              <Flame className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userProfile?.streak || 0}</div>
              <p className="text-xs text-muted-foreground">
                Days in a row
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Due Challenges</CardTitle>
              <Target className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : dueChallenges.length}</div>
              <p className="text-xs text-muted-foreground">
                Ready to review
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Notes Uploaded</CardTitle>
              <BookOpen className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : notes.length}</div>
              <p className="text-xs text-muted-foreground">
                Ready for challenges
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Learning Materials</CardTitle>
              <CardDescription>
                Upload your notes, slides, or voice memos to create AI-powered challenges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Link href="/upload">
                  <Button className="w-full" variant="primary">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Notes
                  </Button>
                </Link>
                <div className="text-sm text-gray-500">
                  Supported formats: PDF, TXT, DOC, MP3, WAV, M4A
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Today's Challenges</CardTitle>
              <CardDescription>
                Complete your daily challenges to maintain your streak
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Loading challenges...</p>
                  </div>
                ) : dueChallenges.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">
                      {notes.length === 0 
                        ? "No challenges available yet. Upload some notes to get started!" 
                        : "No challenges due right now. Great job staying on top of your learning!"}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-green-600 font-medium mb-2">
                      {dueChallenges.length} challenge{dueChallenges.length !== 1 ? 's' : ''} ready for review!
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      Keep your streak alive by completing them now.
                    </p>
                  </div>
                )}
                <Link href="/challenges">
                  <Button 
                    className="w-full" 
                    variant="primary"
                    disabled={loading}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    {dueChallenges.length > 0 ? 'Start Challenges' : 'View All Challenges'}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your learning progress and achievements</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                Loading activity...
              </div>
            ) : notes.length === 0 && challenges.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No activity yet. Start by uploading your first set of notes!
              </div>
            ) : (
              <div className="space-y-3">
                {notes.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                      <span className="text-sm">Notes uploaded: {notes.length}</span>
                    </div>
                    <Link href="/notes">
                      <Button variant="outline" size="sm">View Notes</Button>
                    </Link>
                  </div>
                )}
                {challenges.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Target className="h-5 w-5 text-green-600" />
                      <span className="text-sm">Challenges created: {challenges.length}</span>
                    </div>
                    <Link href="/challenges">
                      <Button variant="outline" size="sm">View Challenges</Button>
                    </Link>
                  </div>
                )}
                {dueChallenges.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Flame className="h-5 w-5 text-orange-600" />
                      <span className="text-sm">Challenges ready for review: {dueChallenges.length}</span>
                    </div>
                    <Link href="/challenges">
                      <Button variant="outline" size="sm">Start Review</Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}