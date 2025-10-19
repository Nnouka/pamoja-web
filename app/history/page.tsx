'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, CheckCircle, XCircle, Clock, Calendar, Target, Eye, Book, ChevronDown, ChevronUp } from 'lucide-react';
import { getUserChallengeHistoryByNotes } from '@/lib/database';
import { Challenge, ChallengeProgress, ChallengeAttempt, Note } from '@/lib/types';
import Link from 'next/link';

interface ChallengeWithHistory extends Challenge {
  progress: ChallengeProgress;
}

function ChallengeHistoryContent() {
  const { currentUser } = useAuth();
  const [groupedHistory, setGroupedHistory] = useState<{ [noteId: string]: { note: Note; challenges: ChallengeWithHistory[] } }>({});
  const [loading, setLoading] = useState(true);
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeWithHistory | null>(null);
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect' | 'mastered'>('all');
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  // Toggle accordion expansion
  const toggleNoteExpansion = (noteId: string) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  // Expand all notes or collapse all
  const toggleAllNotes = () => {
    const filteredGroups = getFilteredGroups();
    const allNoteIds = Object.keys(filteredGroups);
    
    if (expandedNotes.size === allNoteIds.length) {
      // All are expanded, collapse all
      setExpandedNotes(new Set());
    } else {
      // Not all expanded, expand all
      setExpandedNotes(new Set(allNoteIds));
    }
  };

  useEffect(() => {
    const fetchChallengeHistory = async () => {
      if (!currentUser?.uid) return;
      
      try {
        const history = await getUserChallengeHistoryByNotes(currentUser.uid);
        setGroupedHistory(history as { [noteId: string]: { note: Note; challenges: ChallengeWithHistory[] } });
        
        // Auto-expand the first note group by default
        const noteIds = Object.keys(history);
        if (noteIds.length > 0) {
          setExpandedNotes(new Set([noteIds[0]]));
        }
      } catch (error) {
        console.error('Error fetching challenge history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChallengeHistory();
  }, [currentUser?.uid]);

  // Auto-expand notes when filter changes to show relevant content
  useEffect(() => {
    const filteredGroups = getFilteredGroups();
    const relevantNoteIds = Object.keys(filteredGroups);
    
    if (filter !== 'all' && relevantNoteIds.length > 0) {
      // Auto-expand all notes that have matching content
      setExpandedNotes(new Set(relevantNoteIds));
    }
  }, [filter, groupedHistory]);

  // Get all challenges from grouped structure
  const getAllChallenges = (): ChallengeWithHistory[] => {
    return Object.values(groupedHistory).flatMap(group => group.challenges);
  };

  const getFilteredGroups = () => {
    const filtered: { [noteId: string]: { note: Note; challenges: ChallengeWithHistory[] } } = {};
    
    Object.entries(groupedHistory).forEach(([noteId, group]) => {
      const filteredChallenges = group.challenges.filter(challenge => {
        switch (filter) {
          case 'correct':
            return challenge.progress.attempts.some((attempt: ChallengeAttempt) => attempt.correct);
          case 'incorrect':
            return challenge.progress.attempts.some((attempt: ChallengeAttempt) => !attempt.correct);
          case 'mastered':
            return challenge.progress.mastered;
          default:
            return true;
        }
      });
      
      if (filteredChallenges.length > 0) {
        filtered[noteId] = {
          note: group.note,
          challenges: filteredChallenges
        };
      }
    });
    
    return filtered;
  };

  const getSuccessRate = (attempts: ChallengeAttempt[]) => {
    if (attempts.length === 0) return 0;
    const correctAttempts = attempts.filter(attempt => attempt.correct).length;
    return Math.round((correctAttempts / attempts.length) * 100);
  };

  const getLatestAttempt = (attempts: ChallengeAttempt[]) => {
    return attempts[attempts.length - 1];
  };

  const formatDate = (timestamp: any) => {
    return timestamp?.toDate?.()?.toLocaleDateString() || 'Unknown';
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const allChallenges = getAllChallenges();
  const filteredGroups = getFilteredGroups();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="mr-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Challenge History</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Attempted</CardTitle>
              <Target className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allChallenges.length}</div>
              <p className="text-xs text-muted-foreground">
                Challenges completed
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mastered</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {allChallenges.filter((c: ChallengeWithHistory) => c.progress.mastered).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Fully mastered
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Success</CardTitle>
              <Target className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {allChallenges.length > 0 
                  ? Math.round(allChallenges.reduce((sum: number, c: ChallengeWithHistory) => sum + getSuccessRate(c.progress.attempts), 0) / allChallenges.length)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Success rate
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {allChallenges.reduce((sum: number, c: ChallengeWithHistory) => sum + c.progress.attempts.length, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total attempts
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Controls */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All ({allChallenges.length})
            </Button>
            <Button
              variant={filter === 'mastered' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('mastered')}
            >
              Mastered ({allChallenges.filter((c: ChallengeWithHistory) => c.progress.mastered).length})
            </Button>
            <Button
              variant={filter === 'correct' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('correct')}
            >
              Got Correct ({allChallenges.filter((c: ChallengeWithHistory) => c.progress.attempts.some((a: ChallengeAttempt) => a.correct)).length})
            </Button>
            <Button
              variant={filter === 'incorrect' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('incorrect')}
            >
              Need Review ({allChallenges.filter((c: ChallengeWithHistory) => c.progress.attempts.some((a: ChallengeAttempt) => !a.correct)).length})
            </Button>
          </div>
          
          {/* Accordion Controls */}
          {Object.keys(filteredGroups).length > 0 && (
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Challenge History by Notes ({Object.keys(filteredGroups).length} topics)
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAllNotes}
              >
                {expandedNotes.size === Object.keys(filteredGroups).length ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Collapse All
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Expand All
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Challenge History Grouped by Notes */}
        <div className="space-y-6">
          {Object.keys(filteredGroups).length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Book className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Challenge History</h3>
                <p className="text-gray-500 mb-4">
                  {filter === 'all' 
                    ? "You haven't completed any challenges yet. Start by uploading notes and generating challenges!"
                    : `No challenges match the "${filter}" filter.`}
                </p>
                <Link href="/upload">
                  <Button>Upload Notes & Generate Challenges</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            Object.entries(filteredGroups).map(([noteId, group]) => (
              <Card key={noteId} className="overflow-hidden">
                {/* Note Header - Clickable Accordion */}
                <CardHeader 
                  className="bg-gray-50 border-b cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleNoteExpansion(noteId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <div className="mr-3">
                          {expandedNotes.has(noteId) ? (
                            <ChevronUp className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold text-gray-900">
                            {group.note.title}
                          </CardTitle>
                          {group.note.subject && (
                            <CardDescription className="mt-1">
                              Subject: {group.note.subject}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Target className="h-4 w-4 mr-1" />
                        {group.challenges.length} challenge{group.challenges.length !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {group.challenges.filter(c => c.progress.mastered).length} mastered
                      </span>
                      <span className="flex items-center text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                        {Math.round(group.challenges.reduce((sum, c) => sum + getSuccessRate(c.progress.attempts), 0) / group.challenges.length)}% avg
                      </span>
                    </div>
                  </div>
                </CardHeader>
                
                {/* Challenges for this Note - Only show when expanded */}
                {expandedNotes.has(noteId) && (
                  <CardContent className="p-0 animate-in slide-in-from-top-2 duration-200">
                    <div className="divide-y">
                    {group.challenges.map((challenge) => {
                      const latestAttempt = getLatestAttempt(challenge.progress.attempts);
                      const successRate = getSuccessRate(challenge.progress.attempts);
              
                      return (
                        <div key={challenge.id} className="p-6 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                            {challenge.type}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mr-2 ${
                            challenge.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                            challenge.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {challenge.difficulty}
                          </span>
                          {challenge.progress.mastered && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Mastered
                            </span>
                          )}
                        </div>
                        
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                          {challenge.question}
                        </h3>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Target className="h-4 w-4 mr-1" />
                            {challenge.progress.attempts.length} attempts
                          </div>
                          <div className="flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {successRate}% success
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {formatTime(latestAttempt.timeSpent)}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {formatDate(latestAttempt.timestamp)}
                          </div>
                        </div>
                        
                        <div className="mt-3 flex items-center">
                          <span className="text-sm text-gray-500 mr-2">Latest result:</span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            latestAttempt.correct 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {latestAttempt.correct ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Correct
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                Incorrect
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedChallenge(challenge)}
                        className="ml-4"
                      >
                              <Eye className="h-4 w-4 mr-2" />
                              Review
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </main>

      {/* Challenge Review Modal */}
      {selectedChallenge && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedChallenge(null)}
        >
          <div 
            className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-xl font-semibold">Challenge Review</h3>
                <p className="text-sm text-gray-500">
                  {selectedChallenge.type} • {selectedChallenge.difficulty}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedChallenge(null)}
              >
                ×
              </Button>
            </div>
            
            <div className="p-6 overflow-auto max-h-[70vh]">
              {/* Question */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-2">Question</h4>
                <p className="text-gray-700">{selectedChallenge.question}</p>
              </div>
              
              {/* Multiple Choice Options */}
              {selectedChallenge.options && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-2">Options</h4>
                  <div className="space-y-2">
                    {selectedChallenge.options.map((option, index) => {
                      // Check if this option is correct
                      let isCorrect = false;
                      if (selectedChallenge.correctAnswer.length <= 2) {
                        // correctAnswer is just a letter (A, B, C, D)
                        const optionLetter = String.fromCharCode(65 + index); // A, B, C, D
                        isCorrect = optionLetter === selectedChallenge.correctAnswer.toUpperCase();
                      } else {
                        // correctAnswer is the full option text
                        isCorrect = option === selectedChallenge.correctAnswer;
                      }
                      
                      return (
                        <div 
                          key={index} 
                          className={`p-3 rounded border ${
                            isCorrect
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <span className="font-mono bg-gray-200 px-2 py-1 rounded mr-3 text-sm">
                            {String.fromCharCode(65 + index)}
                          </span>
                          {option}
                          {isCorrect && (
                            <CheckCircle className="h-4 w-4 text-green-600 inline ml-2" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Correct Answer */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-2">Correct Answer</h4>
                <p className="text-green-700 font-medium bg-green-50 p-3 rounded">
                  {selectedChallenge.type === 'multiple-choice' && selectedChallenge.options && selectedChallenge.correctAnswer.length <= 2 ? (
                    // Find and display the full option text for letter-based correct answers
                    (() => {
                      const correctIndex = selectedChallenge.correctAnswer.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
                      return selectedChallenge.options[correctIndex] || selectedChallenge.correctAnswer;
                    })()
                  ) : (
                    selectedChallenge.correctAnswer
                  )}
                </p>
              </div>
              
              {/* Explanation */}
              {selectedChallenge.explanation && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-2">Explanation</h4>
                  <p className="text-gray-700 bg-blue-50 p-3 rounded">
                    {selectedChallenge.explanation}
                  </p>
                </div>
              )}
              
              {/* Attempt History */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Your Attempt History</h4>
                <div className="space-y-3">
                  {selectedChallenge.progress.attempts.map((attempt, index) => (
                    <div 
                      key={index}
                      className={`p-4 rounded border ${
                        attempt.correct 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">
                          Attempt #{selectedChallenge.progress.attempts.length - index}
                        </span>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>{formatDate(attempt.timestamp)}</span>
                          <span>{formatTime(attempt.timeSpent)}</span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            attempt.correct 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {attempt.correct ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Correct
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                Incorrect
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-700">
                        <span className="font-medium">Your answer:</span> {attempt.userAnswer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChallengeHistoryPage() {
  return (
    <ProtectedRoute>
      <ChallengeHistoryContent />
    </ProtectedRoute>
  );
}