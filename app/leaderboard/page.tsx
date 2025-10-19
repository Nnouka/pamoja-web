'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Crown, Medal, Star, ArrowLeft, Flame, Target } from 'lucide-react';
import { getLeaderboard } from '@/lib/database';
import { LeaderboardEntry } from '@/lib/types';
import Link from 'next/link';

function LeaderboardContent() {
  const { userProfile } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, [userProfile]);

  const loadLeaderboard = async () => {
    try {
      const data = await getLeaderboard(50);
      setLeaderboard(data);
      
      // Find user's rank
      if (userProfile) {
        const userEntry = data.find(entry => entry.userId === userProfile.id);
        setUserRank(userEntry?.rank || null);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-gray-600">#{rank}</span>;
    }
  };

  const getRankColor = (rank: number, isCurrentUser: boolean = false) => {
    if (isCurrentUser) return 'bg-blue-50 border-blue-200';
    
    switch (rank) {
      case 1:
        return 'bg-yellow-50 border-yellow-200';
      case 2:
        return 'bg-gray-50 border-gray-200';
      case 3:
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <Link href="/dashboard" className="mr-4">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
            </div>
            {userRank && (
              <div className="text-sm text-gray-600">
                Your Rank: #{userRank}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top 3 Podium */}
        {leaderboard.length >= 3 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-center">Top Performers</CardTitle>
              <CardDescription className="text-center">
                Champions of learning and knowledge mastery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center items-end space-x-8">
                {/* 2nd Place */}
                <div className="text-center">
                  <div className="w-20 h-16 bg-gray-200 rounded-t-lg flex items-end justify-center pb-2 mb-2">
                    <Medal className="h-8 w-8 text-gray-400" />
                  </div>
                  <div className="bg-gray-100 p-3 rounded">
                    <p className="font-semibold text-sm">{leaderboard[1].displayName}</p>
                    <p className="text-xs text-gray-600">Level {leaderboard[1].level}</p>
                    <p className="text-sm font-bold text-gray-700">{leaderboard[1].xp.toLocaleString()} XP</p>
                  </div>
                </div>

                {/* 1st Place */}
                <div className="text-center">
                  <div className="w-24 h-20 bg-yellow-200 rounded-t-lg flex items-end justify-center pb-2 mb-2">
                    <Crown className="h-10 w-10 text-yellow-600" />
                  </div>
                  <div className="bg-yellow-100 p-4 rounded">
                    <p className="font-bold">{leaderboard[0].displayName}</p>
                    <p className="text-sm text-yellow-700">Level {leaderboard[0].level}</p>
                    <p className="text-lg font-bold text-yellow-800">{leaderboard[0].xp.toLocaleString()} XP</p>
                    <div className="flex items-center justify-center mt-2">
                      <Flame className="h-4 w-4 text-orange-500 mr-1" />
                      <span className="text-sm">{leaderboard[0].streak} day streak</span>
                    </div>
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="text-center">
                  <div className="w-20 h-14 bg-amber-200 rounded-t-lg flex items-end justify-center pb-2 mb-2">
                    <Medal className="h-7 w-7 text-amber-600" />
                  </div>
                  <div className="bg-amber-100 p-3 rounded">
                    <p className="font-semibold text-sm">{leaderboard[2].displayName}</p>
                    <p className="text-xs text-amber-700">Level {leaderboard[2].level}</p>
                    <p className="text-sm font-bold text-amber-800">{leaderboard[2].xp.toLocaleString()} XP</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Full Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle>All Rankings</CardTitle>
            <CardDescription>
              Complete leaderboard showing all learners
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leaderboard.map((entry, index) => {
                const isCurrentUser = userProfile?.id === entry.userId;
                
                return (
                  <div
                    key={entry.userId}
                    className={`flex items-center justify-between p-4 rounded-lg border ${getRankColor(
                      entry.rank,
                      isCurrentUser
                    )}`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-10">
                        {getRankIcon(entry.rank)}
                      </div>
                      <div>
                        <p className={`font-medium ${isCurrentUser ? 'text-blue-900' : 'text-gray-900'}`}>
                          {entry.displayName}
                          {isCurrentUser && (
                            <span className="ml-2 text-sm text-blue-600">(You)</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-600">Level {entry.level}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{entry.xp.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">XP</p>
                      </div>
                      
                      {entry.streak > 0 && (
                        <div className="flex items-center text-orange-600">
                          <Flame className="h-4 w-4 mr-1" />
                          <span className="text-sm font-medium">{entry.streak}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {leaderboard.length === 0 && (
                <div className="text-center py-12">
                  <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No rankings yet</h3>
                  <p className="text-gray-500 mb-6">
                    Be the first to start learning and climb the leaderboard!
                  </p>
                  <Link href="/challenges">
                    <Button variant="primary">
                      <Target className="mr-2 h-4 w-4" />
                      Start Practicing
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Your Progress Card */}
        {userProfile && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Your Progress</CardTitle>
              <CardDescription>Keep learning to climb higher!</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{userProfile.xp.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Total XP</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{userProfile.level}</p>
                  <p className="text-sm text-gray-600">Level</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">{userProfile.streak}</p>
                  <p className="text-sm text-gray-600">Day Streak</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">#{userRank || '–'}</p>
                  <p className="text-sm text-gray-600">Global Rank</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <ProtectedRoute>
      <LeaderboardContent />
    </ProtectedRoute>
  );
}