import Dexie, { type EntityTable } from 'dexie';

// ─── Interfaces ────────────────────────────────────────────────
export interface Exercise {
    id?: number;
    name: string;
}

export interface Food {
    id?: number;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

export interface WorkoutSession {
    id?: number;
    date: string; // YYYY-MM-DD
    isCompleted: boolean;
    startTime: string; // HH:MM
    endTime: string; // HH:MM
}

export interface WorkoutSet {
    id?: number;
    sessionId: number;
    exerciseId: number;
    weight: number;
    reps: number;
    isCompleted: boolean;
}

export interface NutritionLog {
    id?: number;
    date: string; // YYYY-MM-DD
    foodId: number;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
}

export interface MentalHealthLog {
    id?: number;
    date: string; // YYYY-MM-DD
    moodScore: number; // 1-5
    sleepHours: number;
    bedtime: string; // HH:MM
    wakeUpTime: string; // HH:MM
    journalNote: string;
}

export interface UserProfile {
    id?: number;  // singleton: always id=1
    userName: string;
    weightKg: number;
    heightCm: number;
    dailyCalorieTarget: number; // kcal, default 2000
}

// ─── Database ──────────────────────────────────────────────────
const db = new Dexie('FitnessWebDB') as Dexie & {
    exercises: EntityTable<Exercise, 'id'>;
    foods: EntityTable<Food, 'id'>;
    workoutSessions: EntityTable<WorkoutSession, 'id'>;
    workoutSets: EntityTable<WorkoutSet, 'id'>;
    nutritionLogs: EntityTable<NutritionLog, 'id'>;
    mentalHealthLogs: EntityTable<MentalHealthLog, 'id'>;
    userProfile: EntityTable<UserProfile, 'id'>;
};

db.version(1).stores({
    exercises: '++id, name',
    foods: '++id, name, calories, protein, carbs, fat',
    workoutSessions: '++id, date, isCompleted',
    workoutSets: '++id, sessionId, exerciseId, weight, reps, isCompleted',
    nutritionLogs: '++id, date, foodId, mealType',
    mentalHealthLogs: '++id, date, moodScore, sleepHours, journalNote',
});

db.version(2).stores({
    exercises: '++id, name',
    foods: '++id, name, calories, protein, carbs, fat',
    workoutSessions: '++id, date, isCompleted, startTime, endTime',
    workoutSets: '++id, sessionId, exerciseId, weight, reps, isCompleted',
    nutritionLogs: '++id, date, foodId, mealType',
    mentalHealthLogs: '++id, date, moodScore, sleepHours, bedtime, wakeUpTime, journalNote',
}).upgrade(tx => {
    return tx.table('workoutSessions').toCollection().modify(session => {
        if (!session.startTime) session.startTime = '';
        if (!session.endTime) session.endTime = '';
    });
});

db.version(3).stores({
    exercises: '++id, name',
    foods: '++id, name, calories, protein, carbs, fat',
    workoutSessions: '++id, date, isCompleted, startTime, endTime',
    workoutSets: '++id, sessionId, exerciseId, weight, reps, isCompleted',
    nutritionLogs: '++id, date, foodId, mealType',
    mentalHealthLogs: '++id, date, moodScore, sleepHours, bedtime, wakeUpTime, journalNote',
    userProfile: '++id, weightKg, heightCm',
});

db.version(4).stores({
    exercises: '++id, name',
    foods: '++id, name, calories, protein, carbs, fat',
    workoutSessions: '++id, date, isCompleted, startTime, endTime',
    workoutSets: '++id, sessionId, exerciseId, weight, reps, isCompleted',
    nutritionLogs: '++id, date, foodId, mealType',
    mentalHealthLogs: '++id, date, moodScore, sleepHours, bedtime, wakeUpTime, journalNote',
    userProfile: '++id, userName, weightKg, heightCm, dailyCalorieTarget',
}).upgrade(tx => {
    return tx.table('userProfile').toCollection().modify(profile => {
        if (!profile.userName) profile.userName = '';
        if (!profile.dailyCalorieTarget) profile.dailyCalorieTarget = 2000;
    });
});

export default db;
