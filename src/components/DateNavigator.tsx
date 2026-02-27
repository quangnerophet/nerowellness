import { useAppStore } from '../store';
import { formatDateShort, getToday, shiftDate } from '../utils';
import { ChevronLeft, ChevronRight, RotateCcw, Lock } from 'lucide-react';

export default function DateNavigator() {
    const { selectedDate, setSelectedDate, goToToday } = useAppStore();
    const today = getToday();
    const isToday = selectedDate === today;
    const isPast = selectedDate < today;

    return (
        <div className="px-5 pt-4 pb-1">
            {/* Navigator Row */}
            <div className="flex items-center justify-center gap-3">
                <button
                    onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 active:scale-90 transition-all"
                >
                    <ChevronLeft className="w-4 h-4 text-text-secondary" />
                </button>
                <p
                    className={`text-base font-semibold min-w-[140px] text-center ${isPast ? 'text-text-muted' : 'text-text-primary'
                        }`}
                >
                    {isToday ? `Today — ${formatDateShort(selectedDate)}` : formatDateShort(selectedDate)}
                </p>
                <button
                    onClick={() => {
                        if (selectedDate < today) setSelectedDate(shiftDate(selectedDate, 1));
                    }}
                    disabled={selectedDate >= today}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 active:scale-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <ChevronRight className="w-4 h-4 text-text-secondary" />
                </button>
            </div>

            {/* Back to Today */}
            {!isToday && (
                <button
                    onClick={goToToday}
                    className="flex items-center justify-center gap-1.5 mx-auto mt-2 text-xs font-semibold text-royal-600 hover:text-royal-800 transition-colors active:scale-95"
                >
                    <RotateCcw className="w-3 h-3" />
                    Back to Today
                </button>
            )}

            {/* Read-Only Banner */}
            {isPast && (
                <div className="mt-2 flex items-center justify-center gap-1.5 bg-amber-50 text-amber-700 rounded-xl py-2 px-3 border border-amber-200">
                    <Lock className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-semibold">
                        Viewing Past Record — Read Only
                    </span>
                </div>
            )}
        </div>
    );
}
