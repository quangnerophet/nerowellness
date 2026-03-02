import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db, { type Exercise, type WorkoutSet } from '../db';
import { useAppStore } from '../store';
import { getToday } from '../utils';
import DateNavigator from '../components/DateNavigator';
import {
    Plus,
    Check,
    X,
    Search,
    Dumbbell,
    Trophy,
    ChevronDown,
    ChevronUp,
    Trash2,
    Clock,
    Lock,
    Timer,
    BarChart3,
} from 'lucide-react';

export default function GymTracker() {
    const { selectedDate } = useAppStore();
    const today = getToday();
    const readOnly = selectedDate < today;

    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState('');
    const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

    const todaySessions = useLiveQuery(
        () => db.workoutSessions.where('date').equals(selectedDate).toArray(),
        [selectedDate]
    );
    const allExercises = useLiveQuery(() => db.exercises.toArray(), []);
    const allTodaySets = useLiveQuery(
        () => {
            const ids = todaySessions?.map((s) => s.id!).filter(Boolean) ?? [];
            if (ids.length === 0) return Promise.resolve([] as WorkoutSet[]);
            return db.workoutSets.where('sessionId').anyOf(ids).toArray();
        },
        [todaySessions]
    );

    useEffect(() => {
        if (todaySessions && todaySessions.length > 0) {
            const incomplete = todaySessions.find((s) => !s.isCompleted);
            setActiveSessionId(incomplete?.id ?? todaySessions[todaySessions.length - 1].id!);
        } else {
            setActiveSessionId(null);
        }
    }, [todaySessions]);

    const activeSession = todaySessions?.find((s) => s.id === activeSessionId);
    const sessionSets: WorkoutSet[] = allTodaySets?.filter((s) => s.sessionId === activeSessionId) ?? [];

    const exercisesInSession = useMemo(() => {
        const unique = [...new Set(sessionSets.map((s) => s.exerciseId))];
        return unique.map((eid) => ({
            exerciseId: eid,
            exercise: allExercises?.find((e) => e.id === eid),
            sets: sessionSets.filter((s) => s.exerciseId === eid),
        }));
    }, [sessionSets, allExercises]);

    const isLocked = readOnly || (activeSession?.isCompleted ?? false);

    const createSession = useCallback(async () => {
        if (readOnly) return;
        const id = await db.workoutSessions.add({
            date: selectedDate,
            isCompleted: false,
            startTime: '',
            endTime: '',
        });
        setActiveSessionId(id as number);
    }, [selectedDate, readOnly]);

    // Auto-create first session only for today
    useEffect(() => {
        if (!readOnly && todaySessions && todaySessions.length === 0) {
            createSession();
        }
    }, [todaySessions, createSession, readOnly]);

    const addExerciseToSession = useCallback(
        async (exercise: Exercise) => {
            if (!activeSessionId || isLocked) return;
            await db.workoutSets.add({
                sessionId: activeSessionId,
                exerciseId: exercise.id!,
                weight: 0,
                reps: 0,
                isCompleted: false,
            });
            setShowModal(false);
            setSearch('');
        },
        [activeSessionId, isLocked]
    );

    const createAndAddExercise = useCallback(
        async (name: string) => {
            const id = await db.exercises.add({ name });
            await addExerciseToSession({ id: id as number, name });
        },
        [addExerciseToSession]
    );

    const addSet = useCallback(
        async (exerciseId: number) => {
            if (!activeSessionId || isLocked) return;
            await db.workoutSets.add({
                sessionId: activeSessionId,
                exerciseId,
                weight: 0,
                reps: 0,
                isCompleted: false,
            });
        },
        [activeSessionId, isLocked]
    );

    const updateSet = useCallback(
        async (setId: number, field: 'weight' | 'reps', value: number) => {
            await db.workoutSets.update(setId, { [field]: value });
        },
        []
    );

    const toggleSetComplete = useCallback(async (set: WorkoutSet) => {
        await db.workoutSets.update(set.id!, { isCompleted: !set.isCompleted });
    }, []);

    const removeExercise = useCallback(
        async (exerciseId: number) => {
            if (!activeSessionId || isLocked) return;
            await db.workoutSets
                .where('sessionId')
                .equals(activeSessionId)
                .and((s) => s.exerciseId === exerciseId)
                .delete();
        },
        [activeSessionId, isLocked]
    );

    const updateSessionTime = useCallback(
        async (field: 'startTime' | 'endTime', value: string) => {
            if (!activeSessionId || readOnly) return;
            await db.workoutSessions.update(activeSessionId, { [field]: value });
        },
        [activeSessionId, readOnly]
    );

    const finishWorkout = useCallback(async () => {
        if (!activeSessionId || readOnly) return;
        await db.workoutSessions.update(activeSessionId, { isCompleted: true });
    }, [activeSessionId, readOnly]);

    const sessionSummary = useMemo(() => {
        if (!activeSession) return null;
        const totalReps = sessionSets.reduce((sum, s) => sum + (s.isCompleted ? s.reps : 0), 0);
        const exercises = new Set(sessionSets.map((s) => s.exerciseId)).size;
        let durationStr = '';
        if (activeSession.startTime && activeSession.endTime) {
            const [sH, sM] = activeSession.startTime.split(':').map(Number);
            const [eH, eM] = activeSession.endTime.split(':').map(Number);
            let diffMin = eH * 60 + eM - (sH * 60 + sM);
            if (diffMin < 0) diffMin += 24 * 60;
            const h = Math.floor(diffMin / 60);
            const m = diffMin % 60;
            durationStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
        }
        return { totalReps, exercises, durationStr };
    }, [activeSession, sessionSets]);

    const filteredExercises =
        allExercises?.filter((e) => e.name.toLowerCase().includes(search.toLowerCase())) ?? [];
    const exactMatch = allExercises?.some(
        (e) => e.name.toLowerCase() === search.toLowerCase()
    );

    return (
        <div className="flex flex-col h-full animate-fade-in">
            {/* Header */}
            <div className="px-5 pt-4 pb-1 flex items-center justify-between max-w-4xl mx-auto w-full">
                <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
                    <Dumbbell className="w-5 h-5 text-royal-500" />
                    Workout
                </h1>
                {activeSession && !isLocked && (
                    <button
                        onClick={finishWorkout}
                        className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 active:scale-95 transition-transform shadow-md shadow-emerald-500/25"
                    >
                        <Trophy className="w-4 h-4" />
                        Finish
                    </button>
                )}
                {activeSession?.isCompleted && (
                    <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" />
                        Locked
                    </span>
                )}
            </div>

            <div className="max-w-4xl mx-auto w-full">
                <DateNavigator />
            </div>

            {/* Session Tabs */}
            {todaySessions && todaySessions.length > 0 && (
                <div className="px-5 pb-3 flex gap-2 items-center">
                    <div className="flex-1 flex gap-1.5 overflow-x-auto custom-scrollbar">
                        {todaySessions.map((s, idx) => (
                            <button
                                key={s.id}
                                onClick={() => setActiveSessionId(s.id!)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${activeSessionId === s.id
                                    ? 'bg-royal-100 text-royal-800 ring-1 ring-royal-200'
                                    : 'bg-gray-100 text-text-muted hover:bg-gray-200'
                                    }`}
                            >
                                Session {idx + 1}
                                {s.isCompleted && <Check className="w-3 h-3 inline ml-1 text-emerald-500" />}
                            </button>
                        ))}
                    </div>
                    {!readOnly && (
                        <button
                            onClick={createSession}
                            className="w-8 h-8 bg-royal-600 text-white rounded-lg flex items-center justify-center shadow-sm active:scale-90 transition-transform shrink-0"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    )}
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pb-6 space-y-4">
                {/* Time Pickers */}
                {activeSession && (
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] text-text-muted font-medium uppercase tracking-wider flex items-center gap-1 mb-1.5">
                                    <Clock className="w-3 h-3" /> Start Time
                                </label>
                                <input
                                    type="time"
                                    value={activeSession.startTime || ''}
                                    onChange={(e) => updateSessionTime('startTime', e.target.value)}
                                    disabled={isLocked}
                                    className="w-full bg-white rounded-lg px-3 py-2 text-sm font-semibold text-text-primary border border-gray-200 focus:outline-none focus:border-royal-500 focus:ring-1 focus:ring-royal-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-text-muted font-medium uppercase tracking-wider flex items-center gap-1 mb-1.5">
                                    <Clock className="w-3 h-3" /> End Time
                                </label>
                                <input
                                    type="time"
                                    value={activeSession.endTime || ''}
                                    onChange={(e) => updateSessionTime('endTime', e.target.value)}
                                    disabled={isLocked}
                                    className="w-full bg-white rounded-lg px-3 py-2 text-sm font-semibold text-text-primary border border-gray-200 focus:outline-none focus:border-royal-500 focus:ring-1 focus:ring-royal-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Finished Session Summary */}
                {activeSession?.isCompleted && sessionSummary && (
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-100 animate-scale-in">
                        <h3 className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Trophy className="w-3.5 h-3.5" />
                            Session Summary
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="text-center">
                                <Timer className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                                <p className="text-lg font-bold text-text-primary">{sessionSummary.durationStr || '—'}</p>
                                <p className="text-[10px] text-text-muted">Duration</p>
                            </div>
                            <div className="text-center">
                                <Dumbbell className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                                <p className="text-lg font-bold text-text-primary">{sessionSummary.exercises}</p>
                                <p className="text-[10px] text-text-muted">Exercises</p>
                            </div>
                            <div className="text-center">
                                <BarChart3 className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                                <p className="text-lg font-bold text-text-primary">{sessionSummary.totalReps}</p>
                                <p className="text-[10px] text-text-muted">Total Reps</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Exercises */}
                {exercisesInSession.map((item) => (
                    <ExerciseCard
                        key={item.exerciseId}
                        exerciseName={item.exercise?.name ?? 'Unknown'}
                        exerciseId={item.exerciseId}
                        sets={item.sets}
                        onAddSet={() => addSet(item.exerciseId)}
                        onUpdateSet={updateSet}
                        onToggleComplete={toggleSetComplete}
                        onRemove={() => removeExercise(item.exerciseId)}
                        locked={isLocked}
                    />
                ))}

                {/* Add Exercise Button */}
                {activeSession && !isLocked && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-5 flex flex-col items-center gap-2 text-text-muted hover:border-royal-500 hover:text-royal-500 transition-colors active:scale-[0.98]"
                    >
                        <Plus className="w-8 h-8" />
                        <span className="text-sm font-semibold">Add Exercise</span>
                    </button>
                )}

                {exercisesInSession.length === 0 && !isLocked && !readOnly && (
                    <div className="text-center py-12 text-text-muted">
                        <Dumbbell className="w-14 h-14 mx-auto mb-3 opacity-20" />
                        <p className="text-sm font-medium">No exercises yet</p>
                        <p className="text-xs mt-1">Tap "Add Exercise" to get started</p>
                    </div>
                )}

                {readOnly && exercisesInSession.length === 0 && (
                    <div className="text-center py-12 text-text-muted">
                        <Dumbbell className="w-14 h-14 mx-auto mb-3 opacity-20" />
                        <p className="text-sm font-medium">No workout recorded</p>
                        <p className="text-xs mt-1">Nothing was logged on this date</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && !readOnly && (
                <div className="absolute inset-0 bg-black/40 z-50 flex items-end">
                    <div className="bg-white w-full rounded-t-3xl animate-slide-up max-h-[75%] flex flex-col">
                        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-100">
                            <h2 className="text-lg font-bold text-text-primary">Add Exercise</h2>
                            <button
                                onClick={() => { setShowModal(false); setSearch(''); }}
                                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                            >
                                <X className="w-4 h-4 text-text-secondary" />
                            </button>
                        </div>
                        <div className="px-5 py-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                <input
                                    type="text"
                                    placeholder="Search or type new exercise..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-royal-500 focus:ring-2 focus:ring-royal-500/10"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2">
                            {search && !exactMatch && (
                                <button
                                    onClick={() => createAndAddExercise(search.trim())}
                                    className="w-full bg-royal-50 text-royal-700 rounded-xl px-4 py-3.5 text-sm font-semibold flex items-center gap-2 border border-royal-200 active:scale-[0.98] transition-transform"
                                >
                                    <Plus className="w-4 h-4" />
                                    Create "{search.trim()}"
                                </button>
                            )}
                            {filteredExercises.map((ex) => (
                                <button
                                    key={ex.id}
                                    onClick={() => addExerciseToSession(ex)}
                                    className="w-full bg-gray-50 rounded-xl px-4 py-3.5 text-sm font-medium text-text-primary text-left hover:bg-gray-100 active:scale-[0.98] transition-all border border-gray-100"
                                >
                                    {ex.name}
                                </button>
                            ))}
                            {filteredExercises.length === 0 && !search && (
                                <p className="text-center text-text-muted text-sm py-6">
                                    No exercises yet. Type a name to create one!
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Exercise Card ─────────────────────────────────────────────
interface ExerciseCardProps {
    exerciseName: string;
    exerciseId: number;
    sets: WorkoutSet[];
    onAddSet: () => void;
    onUpdateSet: (setId: number, field: 'weight' | 'reps', value: number) => void;
    onToggleComplete: (set: WorkoutSet) => void;
    onRemove: () => void;
    locked: boolean;
}

function ExerciseCard({
    exerciseName,
    exerciseId,
    sets,
    onAddSet,
    onUpdateSet,
    onToggleComplete,
    onRemove,
    locked,
}: ExerciseCardProps) {
    const [collapsed, setCollapsed] = useState(false);
    const [prevData, setPrevData] = useState<{ weight: number; reps: number } | null>(null);

    useEffect(() => {
        const fetchPrev = async () => {
            const pastSets = await db.workoutSets
                .where('exerciseId')
                .equals(exerciseId)
                .and((s) => s.isCompleted)
                .reverse()
                .sortBy('id');
            if (pastSets.length > 0) {
                const last = pastSets[0];
                setPrevData({ weight: last.weight, reps: last.reps });
            }
        };
        fetchPrev();
    }, [exerciseId]);

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-scale-in">
            <div className="px-4 py-3 flex items-center gap-3 bg-gray-50/50">
                <div className="w-9 h-9 rounded-xl bg-royal-100 flex items-center justify-center shrink-0">
                    <Dumbbell className="w-4 h-4 text-royal-700" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-text-primary truncate">{exerciseName}</h3>
                    <p className="text-[11px] text-text-muted">
                        {sets.length} {sets.length === 1 ? 'set' : 'sets'}
                        {prevData && (
                            <span className="ml-2 text-royal-500">Prev: {prevData.weight}kg × {prevData.reps}</span>
                        )}
                    </p>
                </div>
                {!locked && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-danger hover:bg-red-50 transition-colors shrink-0"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:bg-gray-100 shrink-0"
                >
                    {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
            </div>

            {!collapsed && (
                <div className="px-4 pb-3">
                    <div className="flex items-center gap-2 px-1 py-2 text-[10px] text-text-muted font-medium uppercase tracking-wider">
                        <span className="w-8 text-center">Set</span>
                        <span className="w-20 text-center">KG</span>
                        <span className="w-20 text-center">Reps</span>
                        <span className="w-7"></span>
                    </div>

                    {sets.map((set, idx) => (
                        <div key={set.id} className={`flex items-center gap-2 py-1.5 ${set.isCompleted ? 'opacity-50' : ''}`}>
                            <span className="w-8 text-center text-xs font-semibold text-text-muted shrink-0">{idx + 1}</span>
                            <input
                                type="number"
                                value={set.weight || ''}
                                placeholder={prevData ? String(prevData.weight) : '0'}
                                onChange={(e) => onUpdateSet(set.id!, 'weight', Number(e.target.value))}
                                disabled={locked}
                                className="w-20 shrink-0 bg-gray-50 rounded-lg px-2 py-2 text-sm font-medium text-center border border-gray-200 focus:outline-none focus:border-royal-500 focus:ring-1 focus:ring-royal-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                            />
                            <input
                                type="number"
                                value={set.reps || ''}
                                placeholder={prevData ? String(prevData.reps) : '0'}
                                onChange={(e) => onUpdateSet(set.id!, 'reps', Number(e.target.value))}
                                disabled={locked}
                                className="w-20 shrink-0 bg-gray-50 rounded-lg px-2 py-2 text-sm font-medium text-center border border-gray-200 focus:outline-none focus:border-royal-500 focus:ring-1 focus:ring-royal-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                            />
                            <button
                                onClick={() => !locked && onToggleComplete(set)}
                                disabled={locked}
                                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${set.isCompleted
                                    ? 'border-emerald-500 bg-emerald-500 text-white'
                                    : 'border-gray-200 hover:border-emerald-400'
                                    } ${locked ? 'cursor-not-allowed opacity-40' : ''}`}
                            >
                                {set.isCompleted && <Check className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    ))}

                    {!locked && (
                        <button
                            onClick={onAddSet}
                            className="w-full mt-2 py-2 text-xs font-semibold text-royal-500 flex items-center justify-center gap-1 rounded-lg hover:bg-royal-50 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add Set
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
