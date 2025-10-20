import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { Note, Challenge, ChallengeProgress, DailyProgress, User } from './types';

// User operations
export const getUserById = async (userId: string): Promise<User | null> => {
  const userDoc = await getDoc(doc(db, 'users', userId));
  return userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } as User : null;
};

export const updateUserProfile = async (userId: string, updates: Partial<User>) => {
  await updateDoc(doc(db, 'users', userId), {
    ...updates,
    updatedAt: Timestamp.now(),
  });
};

// Calculate and update user streak
export const updateUserStreak = async (userId: string) => {
  const user = await getUserById(userId);
  if (!user) return;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // Get today's progress
  const todayProgress = await getTodayProgress(userId);
  
  // Only proceed if user actually completed challenges today
  if (!todayProgress || todayProgress.challengesCompleted === 0) {
    return user.streak;
  }

  // Check if today's progress already marked as streak active (prevent double counting)
  if (todayProgress.streakActive) {
    return user.streak;
  }
  
  // Get yesterday's progress
  const yesterdayProgressQuery = query(
    collection(db, 'dailyProgress'),
    where('userId', '==', userId),
    where('date', '==', yesterday)
  );
  const yesterdaySnapshot = await getDocs(yesterdayProgressQuery);
  const hadYesterdayActivity = !yesterdaySnapshot.empty && 
    (yesterdaySnapshot.docs[0].data() as DailyProgress).challengesCompleted > 0;

  let newStreak: number;
  
  if (hadYesterdayActivity) {
    // Had activity yesterday, increment streak
    newStreak = user.streak + 1;
    console.log(`User ${userId} continuing streak: ${user.streak} -> ${newStreak}`);
  } else if (user.streak === 0) {
    // Starting first day of streak
    newStreak = 1;
    console.log(`User ${userId} starting new streak: ${newStreak}`);
  } else {
    // No activity yesterday but had a streak - check if grace period applies
    const lastActivityDate = user.lastActivity?.toDate();
    const daysSinceLastActivity = lastActivityDate ? 
      Math.floor((Date.now() - lastActivityDate.getTime()) / (24 * 60 * 60 * 1000)) : 999;
    
    if (daysSinceLastActivity <= 2) {
      // Within grace period, start new streak
      newStreak = 1;
      console.log(`User ${userId} restarting streak after ${daysSinceLastActivity} days: ${newStreak}`);
    } else {
      // Too much time passed, reset
      newStreak = 1;
      console.log(`User ${userId} streak reset and restarted: ${newStreak}`);
    }
  }
  
  // Update user with new streak
  await updateUserProfile(userId, { 
    streak: newStreak,
    lastActivity: Timestamp.now()
  });
  
  // Mark today's progress as streak active to prevent double counting
  await updateDailyProgress(userId, { streakActive: true });
  
  console.log(`User ${userId} streak updated to: ${newStreak}`);
  return newStreak;
};

// Validate and potentially reset user streak on login
export const validateUserStreak = async (userId: string) => {
  const user = await getUserById(userId);
  if (!user) return;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // Get yesterday's progress to check if streak should continue
  const yesterdayProgressQuery = query(
    collection(db, 'dailyProgress'),
    where('userId', '==', userId),
    where('date', '==', yesterday)
  );
  const yesterdaySnapshot = await getDocs(yesterdayProgressQuery);
  const hadYesterdayActivity = !yesterdaySnapshot.empty && 
    (yesterdaySnapshot.docs[0].data() as DailyProgress).challengesCompleted > 0;

  // Check if we need to reset streak
  const lastActivityDate = user.lastActivity?.toDate();
  if (lastActivityDate) {
    const daysSinceLastActivity = Math.floor((Date.now() - lastActivityDate.getTime()) / (24 * 60 * 60 * 1000));
    
    // Reset streak if:
    // 1. More than 2 days since last activity, OR
    // 2. Exactly 1 day since last activity but no challenges completed yesterday
    if ((daysSinceLastActivity > 2) || (daysSinceLastActivity === 2 && !hadYesterdayActivity)) {
      if (user.streak > 0) {
        await updateUserProfile(userId, { streak: 0 });
        console.log(`User ${userId} streak reset due to missing daily activity`);
      }
    }
  }
  
  return user;
};

// Note operations
export const getUserNotes = async (userId: string): Promise<Note[]> => {
  console.log('getUserNotes called for userId:', userId);
  
  const notesQuery = query(
    collection(db, 'notes'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  console.log('Executing Firestore query...');
  const notesSnapshot = await getDocs(notesQuery);
  console.log('Query result - docs count:', notesSnapshot.docs.length);
  
  const notes = notesSnapshot.docs.map(doc => {
    const data = doc.data();
    console.log('Note document:', doc.id, data);
    return {
      id: doc.id,
      ...data
    };
  }) as Note[];
  
  console.log('Returning notes:', notes);
  return notes;
};

export const createNote = async (noteData: Omit<Note, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'notes'), noteData);
  return docRef.id;
};

export const updateNote = async (noteId: string, updates: Partial<Note>) => {
  await updateDoc(doc(db, 'notes', noteId), {
    ...updates,
    updatedAt: Timestamp.now(),
  });
};

export const deleteNote = async (noteId: string) => {
  await deleteDoc(doc(db, 'notes', noteId));
};

// Challenge operations
export const createChallenge = async (challengeData: Omit<Challenge, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'challenges'), challengeData);
  return docRef.id;
};

export const getChallengesForNote = async (noteId: string): Promise<Challenge[]> => {
  const challengesQuery = query(
    collection(db, 'challenges'),
    where('noteId', '==', noteId),
    orderBy('createdAt', 'desc')
  );
  
  const challengesSnapshot = await getDocs(challengesQuery);
  return challengesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Challenge[];
};

export const getActiveChallengesForNote = async (noteId: string, userId: string): Promise<Challenge[]> => {
  const challengesQuery = query(
    collection(db, 'challenges'),
    where('noteId', '==', noteId),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  const challengesSnapshot = await getDocs(challengesQuery);
  const challenges = challengesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Challenge[];
  
  // Get progress for all challenges to determine active ones
  const activeChallenges = [];
  
  for (const challenge of challenges) {
    const progressQuery = query(
      collection(db, 'challengeProgress'),
      where('challengeId', '==', challenge.id),
      where('userId', '==', userId)
    );
    
    const progressSnapshot = await getDocs(progressQuery);
    
    // If no progress exists, challenge is not started (active)
    // If progress exists but not completed, challenge is in progress (active)
    if (progressSnapshot.empty) {
      activeChallenges.push(challenge);
    } else {
      const progress = progressSnapshot.docs[0].data() as ChallengeProgress;
      if (!progress.mastered) {
        activeChallenges.push(challenge);
      }
    }
  }
  
  return activeChallenges;
};

export const getUserChallenges = async (userId: string, limitCount: number = 10): Promise<Challenge[]> => {
  const challengesQuery = query(
    collection(db, 'challenges'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  
  const challengesSnapshot = await getDocs(challengesQuery);
  return challengesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Challenge[];
};

// Challenge Progress operations
export const createChallengeProgress = async (progressData: Omit<ChallengeProgress, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'challengeProgress'), progressData);
  return docRef.id;
};

export const getChallengeProgress = async (challengeId: string, userId: string): Promise<ChallengeProgress | null> => {
  const progressQuery = query(
    collection(db, 'challengeProgress'),
    where('challengeId', '==', challengeId),
    where('userId', '==', userId)
  );
  
  const progressSnapshot = await getDocs(progressQuery);
  if (progressSnapshot.empty) return null;
  
  const doc = progressSnapshot.docs[0];
  return { id: doc.id, ...doc.data() } as ChallengeProgress;
};

export const updateChallengeProgress = async (progressId: string, updates: Partial<ChallengeProgress>) => {
  await updateDoc(doc(db, 'challengeProgress', progressId), {
    ...updates,
    updatedAt: Timestamp.now(),
  });
};

// Get user's challenge history with attempts
export const getUserChallengeHistory = async (userId: string): Promise<(Challenge & { progress?: ChallengeProgress })[]> => {
  // Get all user's challenges
  const userChallenges = await getUserChallenges(userId);
  
  // Get all challenge progress for user
  const progressQuery = query(
    collection(db, 'challengeProgress'),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc')
  );
  
  const progressSnapshot = await getDocs(progressQuery);
  const progressMap = new Map<string, ChallengeProgress>();
  
  progressSnapshot.docs.forEach(doc => {
    const progress = { id: doc.id, ...doc.data() } as ChallengeProgress;
    progressMap.set(progress.challengeId, progress);
  });
  
  // Combine challenges with their progress, only return challenges that have been attempted
  const challengeHistory = userChallenges
    .map(challenge => ({
      ...challenge,
      progress: progressMap.get(challenge.id)
    }))
    .filter(challenge => challenge.progress && challenge.progress.attempts.length > 0)
    .sort((a, b) => {
      const aLastAttempt = a.progress?.attempts[a.progress.attempts.length - 1]?.timestamp;
      const bLastAttempt = b.progress?.attempts[b.progress.attempts.length - 1]?.timestamp;
      return (bLastAttempt?.toMillis() || 0) - (aLastAttempt?.toMillis() || 0);
    });
  
  return challengeHistory;
};

export const getUserChallengeStatistics = async (userId: string): Promise<{
  totalCompleted: number;
  completedToday: number;
  averageScore: number;
  totalAttempts: number;
}> => {
  try {
    // Get all challenge progress for the user
    const progressQuery = query(
      collection(db, 'challengeProgress'),
      where('userId', '==', userId)
    );
    
    const progressSnapshot = await getDocs(progressQuery);
    const allProgress = progressSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ChallengeProgress[];
    
    // Calculate statistics
    let totalCompleted = 0;
    let completedToday = 0;
    let totalCorrectAnswers = 0;
    let totalAttempts = 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    allProgress.forEach(progress => {
      if (progress.attempts && progress.attempts.length > 0) {
        totalAttempts += progress.attempts.length;
        
        // Count correct answers
        const correctAnswers = progress.attempts.filter(attempt => attempt.correct).length;
        totalCorrectAnswers += correctAnswers;
        
        // Check if completed (mastered or has correct answers)
        if (progress.mastered || correctAnswers > 0) {
          totalCompleted++;
          
          // Check if completed today
          const lastAttempt = progress.attempts[progress.attempts.length - 1];
          if (lastAttempt && lastAttempt.timestamp.toDate() >= today) {
            completedToday++;
          }
        }
      }
    });
    
    const averageScore = totalAttempts > 0 ? Math.round((totalCorrectAnswers / totalAttempts) * 100) : 0;
    
    return {
      totalCompleted,
      completedToday,
      averageScore,
      totalAttempts
    };
  } catch (error) {
    console.error('Error getting challenge statistics:', error);
    return {
      totalCompleted: 0,
      completedToday: 0,
      averageScore: 0,
      totalAttempts: 0
    };
  }
};

// Get user's challenge history grouped by notes
export const getUserChallengeHistoryByNotes = async (userId: string): Promise<{ [noteId: string]: { note: Note; challenges: (Challenge & { progress?: ChallengeProgress })[] } }> => {
  // Get challenge history
  const challengeHistory = await getUserChallengeHistory(userId);
  
  // Get all user notes
  const userNotes = await getUserNotes(userId);
  const notesMap = new Map<string, Note>();
  userNotes.forEach(note => notesMap.set(note.id, note));
  
  // Group challenges by note
  const groupedHistory: { [noteId: string]: { note: Note; challenges: (Challenge & { progress?: ChallengeProgress })[] } } = {};
  
  challengeHistory.forEach(challenge => {
    const noteId = challenge.noteId;
    const note = notesMap.get(noteId);
    
    if (note) {
      if (!groupedHistory[noteId]) {
        groupedHistory[noteId] = {
          note,
          challenges: []
        };
      }
      groupedHistory[noteId].challenges.push(challenge);
    }
  });
  
  // Sort challenges within each note by most recent attempt
  Object.values(groupedHistory).forEach(group => {
    group.challenges.sort((a, b) => {
      const aLastAttempt = a.progress?.attempts[a.progress.attempts.length - 1]?.timestamp;
      const bLastAttempt = b.progress?.attempts[b.progress.attempts.length - 1]?.timestamp;
      return (bLastAttempt?.toMillis() || 0) - (aLastAttempt?.toMillis() || 0);
    });
  });
  
  return groupedHistory;
};

export const getUserDueChallenges = async (userId: string): Promise<(Challenge & { progress?: ChallengeProgress })[]> => {
  const now = Timestamp.now();
  
  // Get all user's challenges first
  const userChallenges = await getUserChallenges(userId);
  
  // Get all challenge progress for user
  const progressQuery = query(
    collection(db, 'challengeProgress'),
    where('userId', '==', userId)
  );
  
  const progressSnapshot = await getDocs(progressQuery);
  const progressMap = new Map<string, ChallengeProgress>();
  
  progressSnapshot.docs.forEach(doc => {
    const progress = { id: doc.id, ...doc.data() } as ChallengeProgress;
    progressMap.set(progress.challengeId, progress);
  });

  // Filter challenges: include if no progress OR if due for review
  const dueChallenges: (Challenge & { progress?: ChallengeProgress })[] = [];
  
  for (const challenge of userChallenges) {
    const progress = progressMap.get(challenge.id);
    
    if (!progress) {
      // New challenge with no progress - include it
      dueChallenges.push(challenge);
    } else if (!progress.mastered && progress.nextReviewDate <= now) {
      // Challenge due for review - include it
      dueChallenges.push({
        ...challenge,
        progress
      });
    }
  }
  
  return dueChallenges;
};

// Daily Progress operations
export const getTodayProgress = async (userId: string): Promise<DailyProgress | null> => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  const progressQuery = query(
    collection(db, 'dailyProgress'),
    where('userId', '==', userId),
    where('date', '==', today)
  );
  
  const progressSnapshot = await getDocs(progressQuery);
  if (progressSnapshot.empty) return null;
  
  const doc = progressSnapshot.docs[0];
  return { id: doc.id, ...doc.data() } as DailyProgress;
};

export const updateDailyProgress = async (userId: string, updates: Partial<DailyProgress>) => {
  const today = new Date().toISOString().split('T')[0];
  const existing = await getTodayProgress(userId);
  
  if (existing) {
    await updateDoc(doc(db, 'dailyProgress', existing.id), updates);
  } else {
    await addDoc(collection(db, 'dailyProgress'), {
      userId,
      date: today,
      challengesCompleted: 0,
      correctAnswers: 0,
      xpEarned: 0,
      streakActive: false,
      createdAt: Timestamp.now(),
      ...updates
    });
  }
};

// Leaderboard operations
export const getLeaderboard = async (limitCount: number = 50) => {
  const usersQuery = query(
    collection(db, 'users'),
    orderBy('xp', 'desc'),
    limit(limitCount)
  );
  
  const usersSnapshot = await getDocs(usersQuery);
  return usersSnapshot.docs.map((doc, index) => ({
    userId: doc.id,
    displayName: doc.data().displayName || 'Anonymous',
    xp: doc.data().xp || 0,
    level: doc.data().level || 1,
    streak: doc.data().streak || 0,
    rank: index + 1
  }));
};