import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db';
import * as syncService from '../services/syncService';

/**
 * SyncManager is a background component that monitors Dexie changes
 * and synchronizes them to Firestore. It also pulls data on mount.
 */
export default function SyncManager() {
    const [isSyncedFromCloud, setIsSyncedFromCloud] = useState(false);

    // 1. Pull data from cloud on mount
    useEffect(() => {
        async function initSync() {
            try {
                const cloudData = await syncService.fetchAllUserData();

                // Clear and Restore logic (Merge could be more complex, but for now Full Replace is safer for cross-device consistency)
                await db.transaction('rw', [db.userProfile, db.foods, db.nutritionLogs, db.workoutSessions, db.workoutSets, db.exercises, db.mentalHealthLogs], async () => {
                    if (cloudData.profile) {
                        await db.userProfile.put({ ...cloudData.profile, id: 1 });
                    }
                    if (cloudData.nutrition.foods.length > 0) {
                        await db.foods.clear();
                        await db.foods.bulkPut(cloudData.nutrition.foods);
                    }
                    if (cloudData.nutrition.logs.length > 0) {
                        await db.nutritionLogs.clear();
                        await db.nutritionLogs.bulkPut(cloudData.nutrition.logs);
                    }
                    if (cloudData.workouts.sessions.length > 0) {
                        await db.workoutSessions.clear();
                        await db.workoutSessions.bulkPut(cloudData.workouts.sessions);
                    }
                    if (cloudData.workouts.sets.length > 0) {
                        await db.workoutSets.clear();
                        await db.workoutSets.bulkPut(cloudData.workouts.sets);
                    }
                    if (cloudData.workouts.exercises.length > 0) {
                        await db.exercises.clear();
                        await db.exercises.bulkPut(cloudData.workouts.exercises);
                    }
                    if (cloudData.mentalHealth.logs.length > 0) {
                        await db.mentalHealthLogs.clear();
                        await db.mentalHealthLogs.bulkPut(cloudData.mentalHealth.logs);
                    }
                });

                console.log('Firebase Sync: Data pulled successfully');
                setIsSyncedFromCloud(true);
            } catch (error) {
                console.error('Firebase Sync Error (Initial Pull):', error);
                // Even on error, we might want to enable pushing, but it's safer to wait or retry.
                // For now, let's enable it so local changes aren't blocked forever.
                setIsSyncedFromCloud(true);
            }
        }
        initSync();
    }, []);

    // 2. Monitor Dexie tables for pushing changes
    const userProfile = useLiveQuery(() => db.userProfile.toCollection().first());
    const allFoods = useLiveQuery(() => db.foods.toArray());
    const allNutritionLogs = useLiveQuery(() => db.nutritionLogs.toArray());
    const allWorkoutSessions = useLiveQuery(() => db.workoutSessions.toArray());
    const allWorkoutSets = useLiveQuery(() => db.workoutSets.toArray());
    const allExercises = useLiveQuery(() => db.exercises.toArray());
    const allMentalLogs = useLiveQuery(() => db.mentalHealthLogs.toArray());

    // Sync Profile (Push)
    useEffect(() => {
        if (isSyncedFromCloud && userProfile) {
            syncService.syncUserProfile(userProfile).catch(console.error);
        }
    }, [userProfile, isSyncedFromCloud]);

    // Sync Nutrition (Push)
    useEffect(() => {
        if (isSyncedFromCloud && allFoods && allNutritionLogs) {
            syncService.syncNutrition(allFoods, allNutritionLogs).catch(console.error);
        }
    }, [allFoods, allNutritionLogs, isSyncedFromCloud]);

    // Sync Workouts (Push)
    useEffect(() => {
        if (isSyncedFromCloud && allWorkoutSessions && allWorkoutSets && allExercises) {
            syncService.syncWorkouts(allWorkoutSessions, allWorkoutSets, allExercises).catch(console.error);
        }
    }, [allWorkoutSessions, allWorkoutSets, allExercises, isSyncedFromCloud]);

    // Sync Mental Health (Push)
    useEffect(() => {
        if (isSyncedFromCloud && allMentalLogs) {
            syncService.syncMentalHealth(allMentalLogs).catch(console.error);
        }
    }, [allMentalLogs, isSyncedFromCloud]);

    return null;
}
