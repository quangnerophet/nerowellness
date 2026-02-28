import { doc, setDoc, collection, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { UserProfile, Food, NutritionLog, WorkoutSession, WorkoutSet, MentalHealthLog, Exercise } from "../db";

const DEFAULT_USER_ID = "default_user";

/**
 * Syncs the user profile to Firestore
 */
export async function syncUserProfile(profile: UserProfile) {
    if (!profile.id) return;
    const userRef = doc(db, "users", DEFAULT_USER_ID);
    await setDoc(userRef, { profile }, { merge: true });
}

/**
 * Syncs all nutrition-related data to Firestore
 */
export async function syncNutrition(foods: Food[], logs: NutritionLog[]) {
    const userRef = doc(db, "users", DEFAULT_USER_ID);
    const nutritionRef = doc(collection(userRef, "nutrition"), "data");
    await setDoc(nutritionRef, { foods, logs });
}

/**
 * Syncs all workout-related data to Firestore
 */
export async function syncWorkouts(sessions: WorkoutSession[], sets: WorkoutSet[], exercises: Exercise[]) {
    const userRef = doc(db, "users", DEFAULT_USER_ID);
    const workoutsRef = doc(collection(userRef, "workouts"), "data");
    await setDoc(workoutsRef, { sessions, sets, exercises });
}

/**
 * Syncs all mental health logs to Firestore
 */
export async function syncMentalHealth(logs: MentalHealthLog[]) {
    const userRef = doc(db, "users", DEFAULT_USER_ID);
    const mentalHealthRef = doc(collection(userRef, "mentalHealth"), "data");
    await setDoc(mentalHealthRef, { logs });
}

/**
 * Fetches all user data from Firestore
 */
export async function fetchAllUserData() {
    const userRef = doc(db, "users", DEFAULT_USER_ID);
    const userSnap = await getDoc(userRef);

    const data = {
        profile: null as UserProfile | null,
        nutrition: { foods: [] as Food[], logs: [] as NutritionLog[] },
        workouts: { sessions: [] as WorkoutSession[], sets: [] as WorkoutSet[], exercises: [] as Exercise[] },
        mentalHealth: { logs: [] as MentalHealthLog[] }
    };

    if (userSnap.exists()) {
        data.profile = userSnap.data().profile || null;
    }

    // Sub-collections
    const nutritionSnap = await getDoc(doc(collection(userRef, "nutrition"), "data"));
    if (nutritionSnap.exists()) {
        data.nutrition = nutritionSnap.data() as any;
    }

    const workoutsSnap = await getDoc(doc(collection(userRef, "workouts"), "data"));
    if (workoutsSnap.exists()) {
        data.workouts = workoutsSnap.data() as any;
    }

    const mentalHealthSnap = await getDoc(doc(collection(userRef, "mentalHealth"), "data"));
    if (mentalHealthSnap.exists()) {
        data.mentalHealth = mentalHealthSnap.data() as any;
    }

    return data;
}
