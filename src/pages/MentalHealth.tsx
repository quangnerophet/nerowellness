import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db';
import { useAppStore } from '../store';
import { getToday } from '../utils';
import DateNavigator from '../components/DateNavigator';
import {
    Moon,
    Brain,
    BookHeart,
    Save,
    Check,
    Clock,
    Sunrise,
} from 'lucide-react';

const MOODS = [
    { score: 1, emoji: '😢', label: 'Awful' },
    { score: 2, emoji: '😟', label: 'Bad' },
    { score: 3, emoji: '😐', label: 'Okay' },
    { score: 4, emoji: '🙂', label: 'Good' },
    { score: 5, emoji: '😄', label: 'Great' },
];

function calcSleepDuration(
    bedtime: string,
    wakeUp: string
): { hours: number; minutes: number; totalHours: number } {
    if (!bedtime || !wakeUp) return { hours: 0, minutes: 0, totalHours: 0 };
    const [bH, bM] = bedtime.split(':').map(Number);
    const [wH, wM] = wakeUp.split(':').map(Number);
    let totalMin = wH * 60 + wM - (bH * 60 + bM);
    if (totalMin < 0) totalMin += 24 * 60;
    const hours = Math.floor(totalMin / 60);
    const minutes = totalMin % 60;
    return { hours, minutes, totalHours: +(totalMin / 60).toFixed(1) };
}

export default function MentalHealth() {
    const { selectedDate } = useAppStore();
    const today = getToday();
    const readOnly = selectedDate < today;

    const [moodScore, setMoodScore] = useState(0);
    const [bedtime, setBedtime] = useState('23:00');
    const [wakeUpTime, setWakeUpTime] = useState('07:00');
    const [journal, setJournal] = useState('');
    const [saved, setSaved] = useState(false);

    const existingLog = useLiveQuery(
        () => db.mentalHealthLogs.where('date').equals(selectedDate).first(),
        [selectedDate]
    );

    useEffect(() => {
        if (existingLog) {
            setMoodScore(existingLog.moodScore);
            setBedtime(existingLog.bedtime || '23:00');
            setWakeUpTime(existingLog.wakeUpTime || '07:00');
            setJournal(existingLog.journalNote);
        } else {
            setMoodScore(0);
            setBedtime('23:00');
            setWakeUpTime('07:00');
            setJournal('');
        }
    }, [existingLog, selectedDate]);

    const sleepDuration = useMemo(
        () => calcSleepDuration(bedtime, wakeUpTime),
        [bedtime, wakeUpTime]
    );

    const saveEntry = useCallback(async () => {
        if (readOnly) return;
        const data = {
            moodScore,
            sleepHours: sleepDuration.totalHours,
            bedtime,
            wakeUpTime,
            journalNote: journal,
        };
        if (existingLog?.id) {
            await db.mentalHealthLogs.update(existingLog.id, data);
        } else {
            await db.mentalHealthLogs.add({ date: selectedDate, ...data });
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }, [existingLog, moodScore, sleepDuration, bedtime, wakeUpTime, journal, selectedDate, readOnly]);

    return (
        <div className="pb-4 animate-fade-in">
            <div className="px-5 pt-4">
                <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
                    <Brain className="w-5 h-5 text-royal-500" />
                    Mental Health
                </h1>
            </div>

            <DateNavigator />

            <div className="px-5 space-y-6 mt-2">
                {/* Mood Check-in */}
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-5 border border-purple-100">
                    <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                        <span className="text-lg">✨</span>
                        How are you feeling?
                    </h2>
                    <div className="flex justify-between gap-2">
                        {MOODS.map((m) => (
                            <button
                                key={m.score}
                                onClick={() => !readOnly && setMoodScore(m.score)}
                                disabled={readOnly}
                                className={`flex flex-col items-center gap-1.5 flex-1 py-3 rounded-xl transition-all ${readOnly ? 'cursor-not-allowed' : 'active:scale-95'
                                    } ${moodScore === m.score
                                        ? 'bg-white shadow-lg shadow-purple-200/50 scale-105 ring-2 ring-purple-300'
                                        : readOnly
                                            ? 'opacity-40'
                                            : 'hover:bg-white/50'
                                    }`}
                            >
                                <span className="text-2xl">{m.emoji}</span>
                                <span className={`text-[10px] font-medium ${moodScore === m.score ? 'text-purple-700' : 'text-text-muted'
                                    }`}>
                                    {m.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sleep Tracker */}
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-5 border border-indigo-100">
                    <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                        <Moon className="w-4 h-4 text-indigo-500" />
                        Sleep Tracker
                    </h2>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-white rounded-xl p-3 border border-indigo-100">
                            <label className="text-[10px] text-text-muted font-medium uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                <Moon className="w-3 h-3" />
                                Bedtime
                            </label>
                            <input
                                type="time"
                                value={bedtime}
                                onChange={(e) => setBedtime(e.target.value)}
                                disabled={readOnly}
                                className="w-full bg-indigo-50/60 rounded-lg px-3 py-2.5 text-base font-semibold text-text-primary border border-indigo-100 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/50 disabled:opacity-40 disabled:cursor-not-allowed"
                            />
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-indigo-100">
                            <label className="text-[10px] text-text-muted font-medium uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                <Sunrise className="w-3 h-3" />
                                Wake-up
                            </label>
                            <input
                                type="time"
                                value={wakeUpTime}
                                onChange={(e) => setWakeUpTime(e.target.value)}
                                disabled={readOnly}
                                className="w-full bg-indigo-50/60 rounded-lg px-3 py-2.5 text-base font-semibold text-text-primary border border-indigo-100 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/50 disabled:opacity-40 disabled:cursor-not-allowed"
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-3.5 flex items-center gap-3 border border-indigo-100">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center shrink-0">
                            <Clock className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider">
                                Total Sleep Duration
                            </p>
                            <p className="text-xl font-bold text-text-primary">
                                {sleepDuration.hours > 0 && `${sleepDuration.hours}h `}
                                {sleepDuration.minutes > 0 && `${sleepDuration.minutes}m`}
                                {sleepDuration.hours === 0 && sleepDuration.minutes === 0 && '—'}
                            </p>
                        </div>
                        <div className="w-16">
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-400 to-blue-500 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min((sleepDuration.totalHours / 10) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Journal */}
                <div>
                    <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                        <BookHeart className="w-4 h-4 text-rose-400" />
                        Journal & Reflections
                    </h2>
                    <textarea
                        value={journal}
                        onChange={(e) => setJournal(e.target.value)}
                        placeholder={readOnly ? 'No journal entry for this date' : "How was your day? What's on your mind? Write freely..."}
                        rows={5}
                        disabled={readOnly}
                        className="w-full bg-gray-50 rounded-2xl px-4 py-3.5 text-sm border border-gray-200 resize-none focus:outline-none focus:border-royal-500 focus:ring-2 focus:ring-royal-500/10 placeholder:text-text-muted/60 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                </div>

                {/* Save Button — hidden in read-only */}
                {!readOnly && (
                    <button
                        onClick={saveEntry}
                        className={`w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg ${saved
                                ? 'bg-emerald-500 text-white shadow-emerald-500/25'
                                : 'bg-gradient-to-r from-royal-700 to-royal-500 text-white shadow-royal-500/25'
                            }`}
                    >
                        {saved ? (
                            <>
                                <Check className="w-4 h-4" />
                                Saved!
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Entry
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
