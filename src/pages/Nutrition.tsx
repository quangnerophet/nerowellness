import { useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db, { type Food } from '../db';
import { useAppStore } from '../store';
import { getToday } from '../utils';
import DateNavigator from '../components/DateNavigator';
import {
    Plus,
    X,
    Search,
    Utensils,
    Flame,
    Beef,
    Wheat,
    Droplets,
    Trash2,
    Target,
} from 'lucide-react';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';
const MEAL_TYPES: { key: MealType; label: string; icon: string }[] = [
    { key: 'breakfast', label: 'Breakfast', icon: '🌅' },
    { key: 'lunch', label: 'Lunch', icon: '☀️' },
    { key: 'dinner', label: 'Dinner', icon: '🌙' },
    { key: 'snacks', label: 'Snacks', icon: '🍿' },
];

export default function Nutrition() {
    const { selectedDate, dailyProteinTarget, dailyCalorieTarget } = useAppStore();
    const today = getToday();
    const readOnly = selectedDate < today;
    const proteinTarget = dailyProteinTarget();

    const [showModal, setShowModal] = useState(false);
    const [activeMeal, setActiveMeal] = useState<MealType>('breakfast');
    const [search, setSearch] = useState('');
    const [newFood, setNewFood] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' });
    const [showCreateForm, setShowCreateForm] = useState(false);

    const todayLogs = useLiveQuery(
        () => db.nutritionLogs.where('date').equals(selectedDate).toArray(),
        [selectedDate]
    );
    const allFoods = useLiveQuery(() => db.foods.toArray(), []);

    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    todayLogs?.forEach((log) => {
        const food = allFoods?.find((f) => f.id === log.foodId);
        if (food) {
            totals.calories += food.calories;
            totals.protein += food.protein;
            totals.carbs += food.carbs;
            totals.fat += food.fat;
        }
    });

    const getMealLogs = (meal: MealType) =>
        todayLogs?.filter((l) => l.mealType === meal) ?? [];

    const addFoodToMeal = useCallback(
        async (food: Food) => {
            if (readOnly) return;
            await db.nutritionLogs.add({
                date: selectedDate,
                foodId: food.id!,
                mealType: activeMeal,
            });
            setShowModal(false);
            setSearch('');
        },
        [selectedDate, activeMeal, readOnly]
    );

    const createAndAddFood = useCallback(async () => {
        if (readOnly) return;
        const id = await db.foods.add({
            name: newFood.name,
            calories: Number(newFood.calories) || 0,
            protein: Number(newFood.protein) || 0,
            carbs: Number(newFood.carbs) || 0,
            fat: Number(newFood.fat) || 0,
        });
        await db.nutritionLogs.add({
            date: selectedDate,
            foodId: id as number,
            mealType: activeMeal,
        });
        setShowModal(false);
        setSearch('');
        setNewFood({ name: '', calories: '', protein: '', carbs: '', fat: '' });
        setShowCreateForm(false);
    }, [newFood, selectedDate, activeMeal, readOnly]);

    const removeLog = useCallback(async (logId: number) => {
        if (readOnly) return;
        await db.nutritionLogs.delete(logId);
    }, [readOnly]);

    const filteredFoods =
        allFoods?.filter((f) => f.name.toLowerCase().includes(search.toLowerCase())) ?? [];
    const exactMatch = allFoods?.some(
        (f) => f.name.toLowerCase() === search.toLowerCase()
    );

    // Calorie progress
    const caloriePct = dailyCalorieTarget > 0 ? Math.min((totals.calories / dailyCalorieTarget) * 100, 100) : 0;
    const calorieMet = totals.calories >= dailyCalorieTarget;
    const calorieNear = caloriePct >= 90 && !calorieMet;

    // Protein progress
    const proteinPct = proteinTarget > 0 ? Math.min((totals.protein / proteinTarget) * 100, 100) : 0;
    const proteinMet = totals.protein >= proteinTarget;

    return (
        <div className="pb-4 animate-fade-in">
            <div className="px-5 pt-4">
                <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
                    <Utensils className="w-5 h-5 text-royal-500" />
                    Nutrition
                </h1>
            </div>

            <DateNavigator />

            <div className="px-5 space-y-4 mt-2">
                {/* Macro Summary */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Calories with target + progress bar */}
                    <div className={`rounded-2xl p-3.5 border ${calorieMet ? 'bg-emerald-50 border-emerald-100' : calorieNear ? 'bg-amber-50 border-amber-100' : 'bg-orange-50 border-orange-100'}`}>
                        <div className="flex items-center justify-between mb-1.5">
                            <Flame className={`w-5 h-5 ${calorieMet ? 'text-emerald-500' : calorieNear ? 'text-amber-500' : 'text-orange-500'}`} />
                            <Target className="w-3.5 h-3.5 text-text-muted" />
                        </div>
                        <p className="text-[11px] text-text-muted font-medium uppercase tracking-wide">Calories</p>
                        <p className="text-lg font-bold text-text-primary mt-0.5">
                            {totals.calories}
                            <span className="text-xs font-normal text-text-muted">/{dailyCalorieTarget}kcal</span>
                        </p>
                        {/* Progress bar */}
                        <div className="h-1.5 bg-white/60 rounded-full overflow-hidden mt-1.5">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${calorieMet ? 'bg-emerald-500' : calorieNear ? 'bg-amber-400' : 'bg-orange-400'}`}
                                style={{ width: `${caloriePct}%` }}
                            />
                        </div>
                    </div>

                    {/* Protein with dynamic target */}
                    <div className={`rounded-2xl p-3.5 border ${proteinMet && totals.protein > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                        <div className="flex items-center justify-between mb-1.5">
                            <Beef className={`w-5 h-5 ${proteinMet && totals.protein > 0 ? 'text-emerald-500' : 'text-red-400'}`} />
                            <Target className="w-3.5 h-3.5 text-text-muted" />
                        </div>
                        <p className="text-[11px] text-text-muted font-medium uppercase tracking-wide">Protein</p>
                        <p className="text-lg font-bold text-text-primary mt-0.5">
                            {totals.protein}
                            <span className="text-xs font-normal text-text-muted">/{proteinTarget}g</span>
                        </p>
                        {/* Progress bar */}
                        <div className="h-1.5 bg-white/60 rounded-full overflow-hidden mt-1.5">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${proteinMet ? 'bg-emerald-500' : 'bg-red-400'}`}
                                style={{ width: `${proteinPct}%` }}
                            />
                        </div>
                    </div>

                    <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-100">
                        <Wheat className="w-5 h-5 text-amber-500 mb-1.5" />
                        <p className="text-[11px] text-text-muted font-medium uppercase tracking-wide">Carbs</p>
                        <p className="text-xl font-bold text-text-primary mt-0.5">
                            {totals.carbs}<span className="text-xs font-normal text-text-muted ml-1">g</span>
                        </p>
                    </div>

                    <div className="bg-blue-50 rounded-2xl p-3.5 border border-blue-100">
                        <Droplets className="w-5 h-5 text-blue-500 mb-1.5" />
                        <p className="text-[11px] text-text-muted font-medium uppercase tracking-wide">Fats</p>
                        <p className="text-xl font-bold text-text-primary mt-0.5">
                            {totals.fat}<span className="text-xs font-normal text-text-muted ml-1">g</span>
                        </p>
                    </div>
                </div>

                {/* Meals */}
                {MEAL_TYPES.map((meal) => {
                    const logs = getMealLogs(meal.key);
                    return (
                        <div key={meal.key}>
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                                    <span>{meal.icon}</span>
                                    {meal.label}
                                    {logs.length > 0 && (
                                        <span className="text-[11px] text-text-muted font-normal">({logs.length})</span>
                                    )}
                                </h2>
                                {!readOnly && (
                                    <button
                                        onClick={() => { setActiveMeal(meal.key); setShowModal(true); }}
                                        className="text-royal-500 text-xs font-semibold flex items-center gap-0.5 active:scale-95 transition-transform"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add
                                    </button>
                                )}
                            </div>
                            {logs.length > 0 ? (
                                <div className="space-y-1.5">
                                    {logs.map((log) => {
                                        const food = allFoods?.find((f) => f.id === log.foodId);
                                        return (
                                            <div key={log.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-text-primary">{food?.name ?? 'Unknown'}</p>
                                                    <p className="text-[11px] text-text-muted">
                                                        {food?.calories}cal · {food?.protein}p · {food?.carbs}c · {food?.fat}f
                                                    </p>
                                                </div>
                                                {!readOnly && (
                                                    <button
                                                        onClick={() => removeLog(log.id!)}
                                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-danger hover:bg-red-50 transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-gray-50/50 rounded-xl py-3 text-center border border-dashed border-gray-200">
                                    <p className="text-xs text-text-muted">No food logged</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Modal */}
            {showModal && !readOnly && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
                    <div className="bg-white w-full max-w-[400px] rounded-t-3xl animate-slide-up max-h-[80%] flex flex-col">
                        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-100">
                            <h2 className="text-lg font-bold text-text-primary">
                                Add to {MEAL_TYPES.find((m) => m.key === activeMeal)?.label}
                            </h2>
                            <button
                                onClick={() => { setShowModal(false); setSearch(''); setShowCreateForm(false); }}
                                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                            >
                                <X className="w-4 h-4 text-text-secondary" />
                            </button>
                        </div>

                        {!showCreateForm ? (
                            <>
                                <div className="px-5 py-3">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                        <input
                                            type="text"
                                            placeholder="Search foods..."
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
                                            onClick={() => { setNewFood({ ...newFood, name: search.trim() }); setShowCreateForm(true); }}
                                            className="w-full bg-royal-50 text-royal-700 rounded-xl px-4 py-3.5 text-sm font-semibold flex items-center gap-2 border border-royal-200"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Create "{search.trim()}"
                                        </button>
                                    )}
                                    {filteredFoods.map((food) => (
                                        <button
                                            key={food.id}
                                            onClick={() => addFoodToMeal(food)}
                                            className="w-full bg-gray-50 rounded-xl px-4 py-3 text-left hover:bg-gray-100 active:scale-[0.98] transition-all border border-gray-100"
                                        >
                                            <p className="text-sm font-medium text-text-primary">{food.name}</p>
                                            <p className="text-[11px] text-text-muted mt-0.5">
                                                {food.calories}cal · {food.protein}p · {food.carbs}c · {food.fat}f
                                            </p>
                                        </button>
                                    ))}
                                    {filteredFoods.length === 0 && !search && (
                                        <p className="text-center text-text-muted text-sm py-6">
                                            No foods yet. Type a name to create one!
                                        </p>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="px-5 py-4 space-y-3">
                                <p className="text-sm font-semibold text-text-primary">Create: {newFood.name}</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {(['calories', 'protein', 'carbs', 'fat'] as const).map((field) => (
                                        <div key={field}>
                                            <label className="text-[11px] text-text-muted font-medium uppercase tracking-wide">
                                                {field === 'calories' ? 'Calories (kcal)' : `${field} (g)`}
                                            </label>
                                            <input
                                                type="number"
                                                value={newFood[field]}
                                                onChange={(e) => setNewFood({ ...newFood, [field]: e.target.value })}
                                                className="w-full mt-1 px-3 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-royal-500"
                                                placeholder="0"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={createAndAddFood}
                                    className="w-full bg-royal-600 text-white py-3 rounded-xl font-semibold text-sm mt-2 active:scale-[0.98] transition-transform"
                                >
                                    Create & Add
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
