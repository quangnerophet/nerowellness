import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db';
import { getToday, getGreeting } from '../utils';
import { useAppStore } from '../store';
import DateNavigator from '../components/DateNavigator';
import {
    Utensils,
    Dumbbell,
    ChevronRight,
    ChevronLeft,
    TrendingUp,
    Shield,
    Moon,
    Smile,
    Star,
    Zap,
} from 'lucide-react';

// ─── Calendar Helpers ──────────────────────────────────────────
function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
}
function pad(n: number) { return n.toString().padStart(2, '0'); }
function fmtDate(y: number, m: number, d: number) {
    return `${y}-${pad(m + 1)}-${pad(d)}`;
}
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// ─── RPG Score Helper ──────────────────────────────────────────
// Max 15 pts/day:
//   Sleep  : ≥8h=2, <8h logged=1, none=0
//   Workout: finished=5, none=0
//   Protein: ≥target=3, logged but <target=1, none=0
//   Mood   : score 1-5 → pts 1-5, none=0
interface DayScoreInput {
    sleepHours: number;
    workoutFinished: boolean;
    totalProtein: number;
    proteinTarget: number;
    moodScore: number;
}
function calcDayScore(d: DayScoreInput): number {
    let pts = 0;
    // Sleep (max 2)
    if (d.sleepHours >= 8) pts += 2;
    else if (d.sleepHours > 0) pts += 1;
    // Workout (max 5)
    if (d.workoutFinished) pts += 5;
    // Protein (max 3)
    if (d.totalProtein >= d.proteinTarget && d.totalProtein > 0) pts += 3;
    else if (d.totalProtein > 0) pts += 1;
    // Mood (max 5)
    pts += d.moodScore; // 0-5
    return pts;
}

// ─── Heatmap Color ─────────────────────────────────────────────
function getHeatStyle(
    score: number,
    isSelected: boolean,
    isTodayCell: boolean
): string {
    if (isSelected) return 'bg-royal-700 text-white ring-2 ring-royal-400 ring-offset-1 font-bold';
    if (isTodayCell && score === 0) return 'bg-royal-50 text-royal-700 ring-1 ring-royal-200';
    if (score === 15) return 'bg-amber-400 text-white font-bold shadow-sm shadow-amber-300';
    if (score >= 11) return 'bg-blue-600 text-white';
    if (score >= 6) return 'bg-blue-400 text-white';
    if (score >= 1) return 'bg-blue-100 text-blue-800';
    return 'text-text-primary hover:bg-gray-50';
}

export default function Dashboard() {
    const { setActiveTab, selectedDate, setSelectedDate } = useAppStore();
    const today = getToday();
    const userName = useAppStore((s) => s.userName);
    const userWeightKg = useAppStore((s) => s.userWeightKg);
    const proteinTarget = useAppStore((s) => s.dailyProteinTarget());
    const dailyCalorieTarget = useAppStore((s) => s.dailyCalorieTarget);

    // Calendar state derived from selectedDate
    const selParts = selectedDate.split('-').map(Number);
    const calYear = selParts[0];
    const calMonth = selParts[1] - 1;

    // All data for heatmap
    const allWorkoutSessions = useLiveQuery(() => db.workoutSessions.toArray(), []);
    const allWorkoutSets = useLiveQuery(() => db.workoutSets.toArray(), []);
    const allNutritionLogs = useLiveQuery(() => db.nutritionLogs.toArray(), []);
    const allFoods = useLiveQuery(() => db.foods.toArray(), []);
    const allMentalLogs = useLiveQuery(() => db.mentalHealthLogs.toArray(), []);

    // Profile sync
    useLiveQuery(async () => {
        const p = await db.userProfile.toCollection().first();
        if (p) {
            if (p.weightKg) useAppStore.getState().setUserWeightKg(p.weightKg);
            if (p.userName !== undefined) useAppStore.getState().setUserName(p.userName);
            if (p.dailyCalorieTarget) useAppStore.getState().setDailyCalorieTarget(p.dailyCalorieTarget);
        }
    }, []);

    // Data for selected date
    const mentalLog = useLiveQuery(
        () => db.mentalHealthLogs.where('date').equals(selectedDate).first(),
        [selectedDate]
    );
    const todayNutrition = useLiveQuery(
        () => db.nutritionLogs.where('date').equals(selectedDate).toArray(),
        [selectedDate]
    );
    const todaySessions = useLiveQuery(
        () => db.workoutSessions.where('date').equals(selectedDate).toArray(),
        [selectedDate]
    );
    const recentSessions = useLiveQuery(
        () => db.workoutSessions.orderBy('id').reverse().limit(5).toArray(),
        []
    );

    // ─── Build daily score map (all days) ──────────────────────
    const dailyScores = useMemo<Map<string, number>>(() => {
        const scores = new Map<string, number>();
        if (!allWorkoutSessions || !allNutritionLogs || !allMentalLogs || !allFoods) return scores;

        const allDates = new Set<string>();
        allWorkoutSessions.forEach((s) => allDates.add(s.date));
        allNutritionLogs.forEach((l) => allDates.add(l.date));
        allMentalLogs.forEach((l) => allDates.add(l.date));

        allDates.forEach((date) => {
            const mental = allMentalLogs.find((l) => l.date === date);
            const workoutFinished = allWorkoutSessions.some(
                (s) => s.date === date && s.isCompleted
            );
            const nutLogs = allNutritionLogs.filter((l) => l.date === date);
            const totalProtein = nutLogs.reduce((sum, log) => {
                const food = allFoods.find((f) => f.id === log.foodId);
                return sum + (food?.protein ?? 0);
            }, 0);

            const score = calcDayScore({
                sleepHours: mental?.sleepHours ?? 0,
                workoutFinished,
                totalProtein,
                proteinTarget,
                moodScore: mental?.moodScore ?? 0,
            });
            scores.set(date, score);
        });
        return scores;
    }, [allWorkoutSessions, allNutritionLogs, allMentalLogs, allFoods, proteinTarget]);

    // ─── Today's score breakdown ────────────────────────────────
    const todayScore = useMemo(() => {
        if (!allWorkoutSessions || !allNutritionLogs || !allMentalLogs || !allFoods) {
            return { total: 0, sleep: 0, workout: 0, protein: 0, mood: 0 };
        }
        const date = selectedDate;
        const mental = allMentalLogs.find((l) => l.date === date);
        const workoutFinished = allWorkoutSessions.some((s) => s.date === date && s.isCompleted);
        const nutLogs = allNutritionLogs.filter((l) => l.date === date);
        const totalProtein = nutLogs.reduce((sum, log) => {
            const food = allFoods.find((f) => f.id === log.foodId);
            return sum + (food?.protein ?? 0);
        }, 0);

        const sleepPts = (mental?.sleepHours ?? 0) >= 8 ? 2 : (mental?.sleepHours ?? 0) > 0 ? 1 : 0;
        const workoutPts = workoutFinished ? 5 : 0;
        const proteinPts = totalProtein >= proteinTarget && totalProtein > 0 ? 3 : totalProtein > 0 ? 1 : 0;
        const moodPts = mental?.moodScore ?? 0;

        return {
            total: sleepPts + workoutPts + proteinPts + moodPts,
            sleep: sleepPts,
            workout: workoutPts,
            protein: proteinPts,
            mood: moodPts,
        };
    }, [selectedDate, allWorkoutSessions, allNutritionLogs, allMentalLogs, allFoods, proteinTarget]);

    // ─── Streak & Freezes ──────────────────────────────────────
    const { flawlessDays, freezes, streak } = useMemo(() => {
        let flawless = 0;
        dailyScores.forEach((score) => { if (score === 15) flawless++; });
        const fr = Math.floor(flawless / 7);
        let count = 0;
        const d = new Date(today + 'T12:00:00');
        while (true) {
            const dateStr = d.toISOString().split('T')[0];
            const score = dailyScores.get(dateStr) ?? 0;
            if (score > 0) { count++; d.setDate(d.getDate() - 1); }
            else break;
        }
        return { flawlessDays: flawless, freezes: fr, streak: count };
    }, [dailyScores, today]);

    // Other computed
    const totalCalories = useMemo(() => {
        if (!todayNutrition || !allFoods) return 0;
        return todayNutrition.reduce((sum, log) => {
            const food = allFoods.find((f) => f.id === log.foodId);
            return sum + (food?.calories ?? 0);
        }, 0);
    }, [todayNutrition, allFoods]);

    const workoutFinishedToday = todaySessions?.some((s) => s.isCompleted) ?? false;

    // Calendar navigation
    const prevMonth = () => {
        const d = new Date(calYear, calMonth - 1, 1);
        setSelectedDate(fmtDate(d.getFullYear(), d.getMonth(), 1));
    };
    const nextMonth = () => {
        const d = new Date(calYear, calMonth + 1, 1);
        setSelectedDate(fmtDate(d.getFullYear(), d.getMonth(), 1));
    };

    const daysInMonth = getDaysInMonth(calYear, calMonth);
    const firstDay = getFirstDayOfMonth(calYear, calMonth);
    const calendarDays: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) calendarDays.push(null);
    for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

    const todayParts = today.split('-').map(Number);
    const isCurrentMonth = calYear === todayParts[0] && calMonth === todayParts[1] - 1;

    // Pt badge styling
    const ptsBadgeStyle = todayScore.total === 15
        ? 'bg-amber-400 text-white'
        : todayScore.total >= 11 ? 'bg-blue-600 text-white'
            : todayScore.total >= 6 ? 'bg-blue-400 text-white'
                : todayScore.total >= 1 ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-text-muted';

    return (
        <div className="pb-4 animate-fade-in">
            {/* Header with pts badge */}
            <div className="px-5 pt-5 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-text-primary">
                    {getGreeting()}{userName ? `, ${userName}` : ''} 👋
                </h1>
                <div className={`px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1 ${ptsBadgeStyle}`}>
                    <Star className="w-3.5 h-3.5" />
                    {todayScore.total} / 15
                </div>
            </div>

            <DateNavigator />

            <div className="px-5 space-y-4 mt-2">
                {/* Monthly Calendar Heatmap */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                        <button onClick={prevMonth} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
                            <ChevronLeft className="w-4 h-4 text-text-secondary" />
                        </button>
                        <h3 className="text-sm font-semibold text-text-primary">
                            {MONTH_NAMES[calMonth]} {calYear}
                        </h3>
                        <button onClick={nextMonth} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
                            <ChevronRight className="w-4 h-4 text-text-secondary" />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-1">
                        {DAY_LABELS.map((d, i) => (
                            <span key={i} className="text-[10px] text-text-muted font-semibold text-center uppercase">{d}</span>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, i) => {
                            if (day === null) return <div key={`e-${i}`} className="aspect-square" />;
                            const dateStr = fmtDate(calYear, calMonth, day);
                            const isTodayCell = isCurrentMonth && day === todayParts[2];
                            const isSelected = dateStr === selectedDate;
                            const score = dailyScores.get(dateStr) ?? 0;
                            const isFuture = dateStr > today;
                            const isFlawless = score === 15;

                            return (
                                <button
                                    key={dateStr}
                                    disabled={isFuture}
                                    onClick={() => !isFuture && setSelectedDate(dateStr)}
                                    className={`aspect-square rounded-lg flex items-center justify-center relative transition-all text-xs ${isFuture
                                        ? 'text-gray-300 cursor-not-allowed'
                                        : `cursor-pointer active:scale-90 ${getHeatStyle(score, isSelected, isTodayCell)}`
                                        }`}
                                >
                                    {day}
                                    {isFlawless && !isSelected && (
                                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full border border-white" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-center gap-1.5 mt-3">
                        <span className="text-[9px] text-text-muted">0</span>
                        {[
                            { bg: '#f3f4f6', label: '' },
                            { bg: '#dbeafe', label: '1' },
                            { bg: '#60a5fa', label: '6' },
                            { bg: '#2563eb', label: '11' },
                            { bg: '#f59e0b', label: '⭐' },
                        ].map((c) => (
                            <div key={c.bg} className="flex items-center gap-0.5">
                                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: c.bg }} />
                                {c.label && <span className="text-[8px] text-text-muted">{c.label}</span>}
                            </div>
                        ))}
                        <span className="text-[9px] text-text-muted">15</span>
                    </div>
                </div>

                {/* Daily Summary — 4 items with RPG pts */}
                <div className="grid grid-cols-4 gap-2">
                    {/* Mood */}
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-2.5 border border-purple-100 text-center">
                        <Smile className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                        <p className="text-[9px] text-text-muted font-medium uppercase tracking-wide">Mood</p>
                        <p className="text-lg font-bold text-text-primary mt-0.5">
                            {mentalLog?.moodScore ? ['😢', '😟', '😐', '🙂', '😄'][mentalLog.moodScore - 1] : '—'}
                        </p>
                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full ${todayScore.mood > 0 ? 'bg-purple-100 text-purple-700' : 'text-transparent'
                            }`}>
                            +{todayScore.mood}
                        </span>
                    </div>
                    {/* Sleep */}
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-2.5 border border-indigo-100 text-center">
                        <Moon className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
                        <p className="text-[9px] text-text-muted font-medium uppercase tracking-wide">Sleep</p>
                        <p className="text-lg font-bold text-text-primary mt-0.5">
                            {mentalLog?.sleepHours ? `${mentalLog.sleepHours}h` : '—'}
                        </p>
                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full ${todayScore.sleep > 0 ? 'bg-indigo-100 text-indigo-700' : 'text-transparent'
                            }`}>
                            +{todayScore.sleep}
                        </span>
                    </div>
                    {/* Workout */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-2.5 border border-amber-100 text-center">
                        <Dumbbell className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                        <p className="text-[9px] text-text-muted font-medium uppercase tracking-wide">Gym</p>
                        <p className="text-lg font-bold text-text-primary mt-0.5">
                            {workoutFinishedToday ? '✓' : '—'}
                        </p>
                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full ${todayScore.workout > 0 ? 'bg-amber-100 text-amber-700' : 'text-transparent'
                            }`}>
                            +{todayScore.workout}
                        </span>
                    </div>
                    {/* Food */}
                    <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-2.5 border border-emerald-100 text-center">
                        <Utensils className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                        <p className="text-[9px] text-text-muted font-medium uppercase tracking-wide">Food</p>
                        <p className="text-sm font-bold text-text-primary mt-0.5 leading-tight">
                            {totalCalories > 0 ? (
                                <>{totalCalories}<span className="text-[8px] font-normal text-text-muted">/{dailyCalorieTarget}</span></>
                            ) : '—'}
                        </p>
                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full ${todayScore.protein > 0 ? 'bg-emerald-100 text-emerald-700' : 'text-transparent'
                            }`}>
                            +{todayScore.protein}
                        </span>
                    </div>
                </div>

                {/* Today's RPG Progress Bar */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                            Today's Score
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ptsBadgeStyle}`}>
                            {todayScore.total === 15 ? '⭐ FLAWLESS!' : `${todayScore.total} / 15`}
                        </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ${todayScore.total === 15
                                ? 'bg-gradient-to-r from-amber-400 to-yellow-300'
                                : 'bg-gradient-to-r from-royal-600 to-royal-400'
                                }`}
                            style={{ width: `${(todayScore.total / 15) * 100}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1.5 text-[10px] text-text-muted">
                        <span>Sleep +{todayScore.sleep}/2</span>
                        <span>Gym +{todayScore.workout}/5</span>
                        <span>Protein +{todayScore.protein}/3</span>
                        <span>Mood +{todayScore.mood}/5</span>
                    </div>
                </div>

                {/* Rewards / Inventory Card */}
                <div className="bg-gradient-to-r from-royal-800 to-royal-600 rounded-2xl p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-6 translate-x-6" />
                    <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-4 -translate-x-4" />
                    <div className="relative z-10">
                        <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Shield className="w-3 h-3" />
                            Rewards / Inventory
                        </p>
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                                <span className="text-2xl">🛡️</span>
                            </div>
                            <div className="flex-1">
                                <p className="text-white text-2xl font-bold">
                                    {freezes}
                                    <span className="text-sm font-medium text-white/70 ml-1.5">
                                        {freezes === 1 ? 'Freeze' : 'Freezes'}
                                    </span>
                                </p>
                                <p className="text-white/50 text-[11px] mt-0.5">
                                    ⭐ {flawlessDays} Flawless Days · 🔥 {streak} Day Streak
                                </p>
                            </div>
                        </div>
                        <div className="mt-3">
                            <div className="flex justify-between text-[10px] text-white/50 mb-1">
                                <span>Next freeze</span>
                                <span>{flawlessDays % 7}/7 flawless days</span>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-amber-300 to-amber-400 rounded-full transition-all"
                                    style={{ width: `${((flawlessDays % 7) / 7) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Hero CTA */}
                <button
                    onClick={() => setActiveTab('gym')}
                    className="w-full bg-gradient-to-r from-royal-700 to-royal-500 text-white py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 shadow-lg shadow-royal-500/25 active:scale-[0.98] transition-transform"
                >
                    <Dumbbell className="w-5 h-5" />
                    Start Today's Workout
                </button>

                {/* Recent Activity */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-royal-500" />
                            Recent Activity
                        </h2>
                    </div>
                    {recentSessions && recentSessions.length > 0 ? (
                        <div className="space-y-2">
                            {recentSessions.map((session) => {
                                const sessScore = dailyScores.get(session.date) ?? 0;
                                return (
                                    <div key={session.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${session.isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                                            }`}>
                                            <Dumbbell className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-text-primary">Workout Session</p>
                                            <p className="text-xs text-text-muted">{session.date}</p>
                                        </div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${sessScore === 15 ? 'bg-amber-100 text-amber-700'
                                            : sessScore >= 11 ? 'bg-blue-100 text-blue-700'
                                                : sessScore >= 1 ? 'bg-blue-50 text-blue-500'
                                                    : 'bg-gray-100 text-text-muted'
                                            }`}>
                                            {sessScore > 0 ? `${sessScore} pts` : session.isCompleted ? 'Done' : 'Active'}
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-text-muted" />
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-text-muted">
                            <Dumbbell className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">No activity yet</p>
                            <p className="text-xs mt-1">Start a workout to see it here!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
