import { Challenge } from './types';

interface GenerateChallengesRequest {
  content: string;
  fileType: 'text' | 'pdf' | 'audio' | 'image';
  subject?: string;
  tags: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  count?: number;
}

interface GenerateChallengesResponse {
  challenges: Omit<Challenge, 'id' | 'noteId' | 'userId' | 'createdAt'>[];
}

// Spaced Repetition Algorithm (SM-2)
export const calculateNextReview = (
  quality: number, // 0-5 (0 = total blackout, 5 = perfect response)
  easinessFactor: number = 2.5,
  interval: number = 1,
  repetitions: number = 0
): { easinessFactor: number; interval: number; nextReviewDate: Date } => {
  let newEasinessFactor = easinessFactor;
  let newInterval = interval;

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easinessFactor);
    }
  } else {
    // Incorrect response
    newInterval = 1;
  }

  // Update easiness factor
  newEasinessFactor = easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  
  if (newEasinessFactor < 1.3) {
    newEasinessFactor = 1.3;
  }

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return {
    easinessFactor: newEasinessFactor,
    interval: newInterval,
    nextReviewDate
  };
};

// Convert user performance to SM-2 quality rating
export const performanceToQuality = (
  correct: boolean,
  timeSpent: number, // in seconds
  averageTime: number = 30 // expected time in seconds
): number => {
  if (!correct) return 0; // Total failure
  
  // Base quality for correct answer
  let quality = 3;
  
  // Adjust based on speed (faster = higher quality)
  if (timeSpent <= averageTime * 0.5) {
    quality = 5; // Perfect response
  } else if (timeSpent <= averageTime * 0.75) {
    quality = 4; // Good response
  } else if (timeSpent <= averageTime) {
    quality = 3; // Satisfactory response
  } else {
    quality = 3; // Still correct but slower
  }
  
  return quality;
};

// Generate challenges using OpenAI API
export const generateChallenges = async (
  request: GenerateChallengesRequest
): Promise<GenerateChallengesResponse> => {
  try {
    const response = await fetch('/api/generate-challenges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error('Failed to generate challenges');
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating challenges:', error);
    
    // Fallback: return sample challenges
    return {
      challenges: [
        {
          type: 'multiple-choice',
          question: 'Based on the uploaded content, what is the main topic discussed?',
          options: ['Topic A', 'Topic B', 'Topic C', 'Topic D'],
          correctAnswer: 'Topic A',
          explanation: 'This is a sample question generated while the AI service is unavailable.',
          difficulty: 'medium'
        },
        {
          type: 'short-answer',
          question: 'Summarize the key points from the uploaded material.',
          correctAnswer: 'Key points include...',
          explanation: 'This is a sample question. Please review your uploaded content.',
          difficulty: 'medium'
        }
      ]
    };
  }
};

// Extract text content from different file types
export const extractContentFromFile = async (file: File): Promise<string> => {
  const fileType = file.type.toLowerCase();
  
  if (fileType.includes('text') || fileType.includes('plain')) {
    return await file.text();
  }
  
  // For other file types, we would need additional processing
  // This is a simplified version - in production, you'd use:
  // - PDF.js for PDFs
  // - Speech-to-text APIs for audio
  // - OCR APIs for images
  
  return `Content extracted from ${file.name} (${fileType})`;
};

// Calculate XP rewards based on performance
export const calculateXPReward = (
  correct: boolean,
  difficulty: Challenge['difficulty'],
  timeBonus: boolean = false,
  streakBonus: number = 0
): number => {
  if (!correct) return 0;
  
  const baseXP = {
    easy: 10,
    medium: 20,
    hard: 35
  };
  
  let xp = baseXP[difficulty];
  
  if (timeBonus) xp += Math.floor(xp * 0.5); // 50% bonus for quick answers
  if (streakBonus > 0) xp += Math.min(streakBonus * 2, 50); // Up to 50 XP streak bonus
  
  return xp;
};

// Calculate level from XP
export const calculateLevel = (xp: number): number => {
  // Level formula: level = floor(sqrt(xp / 100)) + 1
  return Math.floor(Math.sqrt(xp / 100)) + 1;
};

// Calculate XP needed for next level
export const xpForNextLevel = (currentLevel: number): number => {
  // XP needed for level n: (n-1)^2 * 100
  return Math.pow(currentLevel, 2) * 100;
};