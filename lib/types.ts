import { Timestamp } from 'firebase/firestore';

// User Profile
export interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  xp: number;
  level: number;
  streak: number;
  lastActivity: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Course Notes/Materials
export interface Note {
  id: string;
  userId: string;
  title: string;
  content?: string; // For text notes
  fileUrl?: string; // For uploaded files (slides, voice memos)
  fileType: 'text' | 'pdf' | 'audio' | 'image';
  fileName?: string;
  subject?: string;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// AI-Generated Challenges
export interface Challenge {
  id: string;
  noteId: string;
  userId: string;
  type: 'multiple-choice' | 'fill-blank' | 'short-answer' | 'true-false';
  question: string;
  options?: string[]; // For multiple choice
  correctAnswer: string;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: Timestamp;
}

// User Progress on Challenges
export interface ChallengeProgress {
  id: string;
  challengeId: string;
  userId: string;
  attempts: ChallengeAttempt[];
  mastered: boolean;
  nextReviewDate: Timestamp;
  repetitionCount: number;
  easinessFactor: number; // For spaced repetition algorithm
  interval: number; // Days until next review
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Individual Challenge Attempts
export interface ChallengeAttempt {
  timestamp: Timestamp;
  userAnswer: string;
  correct: boolean;
  timeSpent: number; // in seconds
}

// Daily Progress Tracking
export interface DailyProgress {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  challengesCompleted: number;
  correctAnswers: number;
  xpEarned: number;
  streakActive: boolean;
  createdAt: Timestamp;
}

// Leaderboard Entries
export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  xp: number;
  level: number;
  streak: number;
  rank: number;
}

// Study Sessions
export interface StudySession {
  id: string;
  userId: string;
  challengesCompleted: number;
  correctAnswers: number;
  totalQuestions: number;
  duration: number; // in seconds
  xpEarned: number;
  startedAt: Timestamp;
  completedAt: Timestamp;
}