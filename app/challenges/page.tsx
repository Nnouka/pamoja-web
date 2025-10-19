'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, CheckCircle, XCircle, Clock, Trophy, Target } from 'lucide-react';
import { 
  getUserDueChallenges, 
  getChallengeProgress, 
  createChallengeProgress, 
  updateChallengeProgress,
  updateUserProfile,
  updateDailyProgress,
  updateUserStreak 
} from '@/lib/database';
import { 
  calculateNextReview, 
  performanceToQuality, 
  calculateXPReward,
  calculateLevel 
} from '@/lib/ai-utils';
import { Challenge, ChallengeProgress, ChallengeAttempt } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';
import Link from 'next/link';

interface ChallengeWithProgress extends Challenge {
  progress?: ChallengeProgress;
}

function ChallengesContent() {
  const { currentUser, userProfile } = useAuth();
  const [challenges, setChallenges] = useState<ChallengeWithProgress[]>([]);
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionStats, setCompletionStats] = useState({ correct: 0, total: 0, xpEarned: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    answered: 0,
    correct: 0,
    xpEarned: 0
  });
  const [startTime, setStartTime] = useState<Date>(new Date());

  useEffect(() => {
    if (currentUser?.uid) {
      loadChallenges();
    }
  }, [currentUser?.uid]);

  const loadChallenges = async () => {
    if (!currentUser?.uid) return;
    
    try {
      console.log('Challenges page: Loading challenges for user:', currentUser.uid);
      console.log('UserProfile ID for comparison:', userProfile?.id);
      
      const dueChallenges = await getUserDueChallenges(currentUser.uid);
      console.log('Challenges page: Found challenges:', dueChallenges.length);
      setChallenges(dueChallenges);
      setStartTime(new Date());
    } catch (error) {
      console.error('Error loading challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentChallenge = challenges[currentChallengeIndex];

  const handleSubmitAnswer = async () => {
    if (!currentChallenge || !userProfile || !currentUser?.uid) return;
    
    setSubmitting(true);
    
    try {
      const endTime = new Date();
      const timeSpent = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      
      // Determine correct answer based on challenge type
      let correctAnswer = currentChallenge.correctAnswer;
      let userAnswerText = '';
      let correct = false;
      
      if (currentChallenge.type === 'multiple-choice') {
        userAnswerText = selectedOption;
        
        // Handle different correctAnswer formats
        // Case 1: correctAnswer is just the letter (e.g., "B")
        // Case 2: correctAnswer is the full option text (e.g., "B. Python")
        if (correctAnswer.length <= 2) {
          // correctAnswer is just a letter (A, B, C, D)
          const selectedLetter = selectedOption.charAt(0);
          correct = selectedLetter.toLowerCase() === correctAnswer.toLowerCase();
        } else {
          // correctAnswer is the full option text
          correct = userAnswerText.toLowerCase() === correctAnswer.toLowerCase();
        }
      } else {
        userAnswerText = userAnswer.trim();
        correct = userAnswerText.toLowerCase() === correctAnswer.toLowerCase();
      }
      
      setIsCorrect(correct);
      
      // Create attempt record
      const attempt: ChallengeAttempt = {
        timestamp: Timestamp.now(),
        userAnswer: userAnswerText,
        correct,
        timeSpent
      };

      // Update or create challenge progress
      let progress = currentChallenge.progress;
      
      if (!progress) {
        // Create new progress
        progress = {
          id: '',
          challengeId: currentChallenge.id,
          userId: currentUser.uid,
          attempts: [attempt],
          mastered: false,
          nextReviewDate: Timestamp.now(),
          repetitionCount: 0,
          easinessFactor: 2.5,
          interval: 1,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        
        const progressId = await createChallengeProgress(progress);
        progress.id = progressId;
      } else {
        // Update existing progress
        progress.attempts.push(attempt);
        progress.repetitionCount += 1;
      }

      // Calculate next review using spaced repetition
      const quality = performanceToQuality(correct, timeSpent, 30);
      const nextReview = calculateNextReview(
        quality,
        progress.easinessFactor,
        progress.interval,
        progress.repetitionCount
      );

      progress.easinessFactor = nextReview.easinessFactor;
      progress.interval = nextReview.interval;
      progress.nextReviewDate = Timestamp.fromDate(nextReview.nextReviewDate);
      progress.mastered = correct && progress.repetitionCount >= 3 && nextReview.interval >= 30;

      await updateChallengeProgress(progress.id, progress);

      // Calculate XP reward
      const xpReward = calculateXPReward(
        correct,
        currentChallenge.difficulty,
        timeSpent < 20, // Time bonus for quick answers
        userProfile.streak
      );

      // Update user stats
      if (correct && xpReward > 0) {
        const newXP = userProfile.xp + xpReward;
        const newLevel = calculateLevel(newXP);
        
        await updateUserProfile(currentUser.uid, {
          xp: newXP,
          level: newLevel,
        });

        setSessionStats(prev => ({
          ...prev,
          xpEarned: prev.xpEarned + xpReward
        }));
      }

      // Update daily progress
      await updateDailyProgress(currentUser.uid, {
        challengesCompleted: sessionStats.answered + 1,
        correctAnswers: sessionStats.correct + (correct ? 1 : 0),
        xpEarned: sessionStats.xpEarned + (correct ? xpReward : 0)
      });

      // Update user streak
      await updateUserStreak(currentUser.uid);

      setSessionStats(prev => ({
        answered: prev.answered + 1,
        correct: prev.correct + (correct ? 1 : 0),
        xpEarned: prev.xpEarned + (correct ? xpReward : 0)
      }));

      setShowResult(true);
      setStartTime(new Date()); // Reset timer for next question
      
    } catch (error) {
      console.error('Error submitting answer:', error);
      alert('Failed to submit answer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextChallenge = () => {
    setShowResult(false);
    setUserAnswer('');
    setSelectedOption('');
    
    if (currentChallengeIndex < challenges.length - 1) {
      setCurrentChallengeIndex(prev => prev + 1);
    } else {
      // Session complete
      const finalCorrect = sessionStats.correct + (isCorrect ? 1 : 0);
      const finalTotal = sessionStats.answered + 1;
      const finalXP = sessionStats.xpEarned + (isCorrect ? calculateXPReward(isCorrect, currentChallenge.difficulty) : 0);
      
      setCompletionStats({
        correct: finalCorrect,
        total: finalTotal,
        xpEarned: finalXP
      });
      setShowCompletion(true);
    }
  };

  const renderQuestionInput = () => {
    if (!currentChallenge) return null;

    switch (currentChallenge.type) {
      case 'multiple-choice':
        return (
          <div className="space-y-3">
            {currentChallenge.options?.map((option, index) => (
              <label
                key={index}
                className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedOption === option
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="option"
                  value={option}
                  checked={selectedOption === option}
                  onChange={(e) => setSelectedOption(e.target.value)}
                  className="sr-only"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'true-false':
        return (
          <div className="space-y-3">
            <label className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
              selectedOption === 'True' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="radio"
                name="option"
                value="True"
                checked={selectedOption === 'True'}
                onChange={(e) => setSelectedOption(e.target.value)}
                className="sr-only"
              />
              <span className="text-sm">True</span>
            </label>
            <label className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
              selectedOption === 'False' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="radio"
                name="option"
                value="False"
                checked={selectedOption === 'False'}
                onChange={(e) => setSelectedOption(e.target.value)}
                className="sr-only"
              />
              <span className="text-sm">False</span>
            </label>
          </div>
        );

      default:
        return (
          <Input
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="Type your answer here..."
            className="text-lg p-4"
          />
        );
    }
  };

  const canSubmit = () => {
    if (currentChallenge?.type === 'multiple-choice' || currentChallenge?.type === 'true-false') {
      return selectedOption.length > 0;
    }
    return userAnswer.trim().length > 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
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
                <h1 className="text-2xl font-bold text-gray-900">Practice Challenges</h1>
              </div>
              <Link href="/history">
                <Button variant="outline" size="sm">
                  <Clock className="h-4 w-4 mr-2" />
                  View History
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No challenges available</h3>
              <p className="text-gray-500 mb-6">
                Upload some notes and generate challenges to start practicing!
              </p>
              <div className="space-x-4">
                <Link href="/upload">
                  <Button variant="primary">Upload Notes</Button>
                </Link>
                <Link href="/notes">
                  <Button variant="outline">View My Notes</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
              <h1 className="text-2xl font-bold text-gray-900">Practice Challenges</h1>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>{currentChallengeIndex + 1} of {challenges.length}</span>
              <div className="flex items-center">
                <Trophy className="h-4 w-4 mr-1" />
                {sessionStats.xpEarned} XP
              </div>
              <Link href="/history">
                <Button variant="outline" size="sm">
                  <Clock className="h-4 w-4 mr-2" />
                  History
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentChallenge && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl mb-2">{currentChallenge.question}</CardTitle>
                  <CardDescription className="flex items-center space-x-4">
                    <span className="capitalize">{currentChallenge.type.replace('-', ' ')}</span>
                    <span className="capitalize text-blue-600">{currentChallenge.difficulty}</span>
                  </CardDescription>
                </div>
                <div className="text-right text-sm text-gray-500">
                  Progress: {sessionStats.correct}/{sessionStats.answered}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!showResult ? (
                <div className="space-y-6">
                  {renderQuestionInput()}
                  <Button
                    onClick={handleSubmitAnswer}
                    disabled={!canSubmit() || submitting}
                    className="w-full"
                    variant="primary"
                  >
                    {submitting ? 'Submitting...' : 'Submit Answer'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className={`p-4 rounded-lg ${
                    isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center space-x-2 mb-2">
                      {isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className={`font-medium ${
                        isCorrect ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {isCorrect ? 'Correct!' : 'Incorrect'}
                      </span>
                    </div>
                    
                    {!isCorrect && (
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Correct answer:</strong> {
                          currentChallenge.type === 'multiple-choice' && 
                          currentChallenge.options && 
                          currentChallenge.correctAnswer.length <= 2 ? (
                            // Find and display the full option text for letter-based correct answers
                            (() => {
                              const correctIndex = currentChallenge.correctAnswer.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
                              return currentChallenge.options[correctIndex] || currentChallenge.correctAnswer;
                            })()
                          ) : (
                            currentChallenge.correctAnswer
                          )
                        }
                      </p>
                    )}
                    
                    {currentChallenge.explanation && (
                      <p className="text-sm text-gray-700">
                        <strong>Explanation:</strong> {currentChallenge.explanation}
                      </p>
                    )}

                    {isCorrect && (
                      <div className="flex items-center space-x-4 mt-3 text-sm text-green-700">
                        <div className="flex items-center">
                          <Trophy className="h-4 w-4 mr-1" />
                          +{calculateXPReward(isCorrect, currentChallenge.difficulty)} XP
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleNextChallenge}
                    className="w-full"
                    variant="primary"
                  >
                    {currentChallengeIndex < challenges.length - 1 ? 'Next Challenge' : 'Complete Session'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Session Completion Modal */}
      {showCompletion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-center">
              <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Complete!</h2>
              <p className="text-gray-600 mb-6">
                Great job! You've finished all your due challenges.
              </p>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{completionStats.correct}</div>
                  <div className="text-sm text-gray-500">Correct</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{completionStats.total}</div>
                  <div className="text-sm text-gray-500">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{completionStats.xpEarned}</div>
                  <div className="text-sm text-gray-500">XP Earned</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <Link href="/history" className="block">
                  <Button className="w-full !bg-blue-600 !text-white hover:!bg-blue-700">
                    <Clock className="h-4 w-4 mr-2" />
                    View Challenge History
                  </Button>
                </Link>
                <Link href="/dashboard" className="block">
                  <Button variant="outline" className="w-full">
                    Back to Dashboard
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => {
                    setShowCompletion(false);
                    loadChallenges();
                    setCurrentChallengeIndex(0);
                    setSessionStats({ answered: 0, correct: 0, xpEarned: 0 });
                  }}
                >
                  Try More Challenges
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChallengesPage() {
  return (
    <ProtectedRoute>
      <ChallengesContent />
    </ProtectedRoute>
  );
}