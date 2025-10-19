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