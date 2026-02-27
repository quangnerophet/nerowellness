import { create } from 'zustand';
import { getToday } from './utils';

type TabType = 'dashboard' | 'gym' | 'nutrition' | 'mental' | 'library';

interface AppState {
    activeTab: TabType;
    setActiveTab: (tab: TabType) => void;
    selectedDate: string; // YYYY-MM-DD
    setSelectedDate: (date: string) => void;
    goToToday: () => void;
    isReadOnly: () => boolean;
    // User profile
    userName: string;
    setUserName: (name: string) => void;
    userWeightKg: number;
    setUserWeightKg: (w: number) => void;
    dailyCalorieTarget: number;
    setDailyCalorieTarget: (kcal: number) => void;
    // Computed targets
    dailyProteinTarget: () => number;
}

export const useAppStore = create<AppState>((set, get) => ({
    activeTab: 'dashboard',
    setActiveTab: (tab) => set({ activeTab: tab }),
    selectedDate: getToday(),
    setSelectedDate: (date) => set({ selectedDate: date }),
    goToToday: () => set({ selectedDate: getToday() }),
    isReadOnly: () => get().selectedDate < getToday(),
    userName: '',
    setUserName: (name) => set({ userName: name }),
    userWeightKg: 0,
    setUserWeightKg: (w) => set({ userWeightKg: w }),
    dailyCalorieTarget: 2000,
    setDailyCalorieTarget: (kcal) => set({ dailyCalorieTarget: kcal }),
    dailyProteinTarget: () => {
        const w = get().userWeightKg;
        return w > 0 ? Math.round(w * 2) : 150;
    },
}));
