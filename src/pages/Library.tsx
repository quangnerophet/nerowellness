import { useState, useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db';
import { useAppStore } from '../store';
import {
    Plus,
    Trash2,
    X,
    BookOpen,
    Dumbbell,
    Utensils,
    Search,
    User,
    Save,
    Check,
    Ruler,
    Weight,
    Zap,
    Edit2,
} from 'lucide-react';

type LibTab = 'exercises' | 'foods' | 'profile';

export default function Library() {
    const [activeTab, setActiveTab] = useState<LibTab>('exercises');
    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState('');
    const [exName, setExName] = useState('');
    const [editExId, setEditExId] = useState<number | null>(null);
    const [foodForm, setFoodForm] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' });
    const [editFoodId, setEditFoodId] = useState<number | null>(null);

    // Profile state
    const [nameInput, setNameInput] = useState('');
    const [weightInput, setWeightInput] = useState('');
    const [heightInput, setHeightInput] = useState('');
    const [calorieInput, setCalorieInput] = useState('2000');
    const [profileSaved, setProfileSaved] = useState(false);
    const { setUserName, setUserWeightKg, setDailyCalorieTarget } = useAppStore();

    // Live queries
    const exercises = useLiveQuery(() => db.exercises.toArray(), []);
    const foods = useLiveQuery(() => db.foods.toArray(), []);
    const profileRecord = useLiveQuery(() => db.userProfile.toCollection().first(), []);

    // Populate inputs from DB
    useEffect(() => {
        if (profileRecord) {
            setNameInput(profileRecord.userName ?? '');
            setWeightInput(profileRecord.weightKg > 0 ? String(profileRecord.weightKg) : '');
            setHeightInput(profileRecord.heightCm > 0 ? String(profileRecord.heightCm) : '');
            setCalorieInput(String(profileRecord.dailyCalorieTarget ?? 2000));
            setUserName(profileRecord.userName ?? '');
            setUserWeightKg(profileRecord.weightKg);
            setDailyCalorieTarget(profileRecord.dailyCalorieTarget ?? 2000);
        }
    }, [profileRecord, setUserName, setUserWeightKg, setDailyCalorieTarget]);

    const filteredExercises =
        exercises?.filter((e) => e.name.toLowerCase().includes(search.toLowerCase())) ?? [];
    const filteredFoods =
        foods?.filter((f) => f.name.toLowerCase().includes(search.toLowerCase())) ?? [];

    const saveExercise = useCallback(async () => {
        if (!exName.trim()) return;
        if (editExId) {
            await db.exercises.update(editExId, { name: exName.trim() });
        } else {
            await db.exercises.add({ name: exName.trim() });
        }
        setExName('');
        setEditExId(null);
        setShowModal(false);
    }, [exName, editExId]);

    const saveFood = useCallback(async () => {
        if (!foodForm.name.trim()) return;
        const foodData = {
            name: foodForm.name.trim(),
            calories: Number(foodForm.calories) || 0,
            protein: Number(foodForm.protein) || 0,
            carbs: Number(foodForm.carbs) || 0,
            fat: Number(foodForm.fat) || 0,
        };
        if (editFoodId) {
            await db.foods.update(editFoodId, foodData);
        } else {
            await db.foods.add(foodData);
        }
        setFoodForm({ name: '', calories: '', protein: '', carbs: '', fat: '' });
        setEditFoodId(null);
        setShowModal(false);
    }, [foodForm, editFoodId]);

    const saveProfile = useCallback(async () => {
        const name = nameInput.trim();
        const w = Number(weightInput) || 0;
        const h = Number(heightInput) || 0;
        const cal = Number(calorieInput) || 2000;
        const existing = await db.userProfile.toCollection().first();
        if (existing?.id) {
            await db.userProfile.update(existing.id, { userName: name, weightKg: w, heightCm: h, dailyCalorieTarget: cal });
        } else {
            await db.userProfile.add({ userName: name, weightKg: w, heightCm: h, dailyCalorieTarget: cal });
        }
        setUserName(name);
        setUserWeightKg(w);
        setDailyCalorieTarget(cal);
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 2000);
    }, [nameInput, weightInput, heightInput, calorieInput, setUserName, setUserWeightKg, setDailyCalorieTarget]);

    const deleteExercise = useCallback(async (id: number) => {
        await db.exercises.delete(id);
    }, []);

    const deleteFood = useCallback(async (id: number) => {
        await db.foods.delete(id);
    }, []);

    // BMI helper
    const weightKg = Number(weightInput) || 0;
    const heightCm = Number(heightInput) || 0;
    const bmi = weightKg > 0 && heightCm > 0
        ? (weightKg / ((heightCm / 100) ** 2)).toFixed(1)
        : null;
    const proteinTarget = weightKg > 0 ? Math.round(weightKg * 2) : 150;

    const tabConfig: { key: LibTab; label: string; Icon: React.ElementType }[] = [
        { key: 'exercises', label: 'Exercises', Icon: Dumbbell },
        { key: 'foods', label: 'Foods', Icon: Utensils },
        { key: 'profile', label: 'Profile', Icon: User },
    ];

    return (
        <div className="flex flex-col h-full animate-fade-in">
            {/* Header */}
            <div className="px-5 pt-5 pb-3">
                <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-royal-500" />
                    Library
                </h1>
                <p className="text-xs text-text-muted mt-0.5">Manage exercises, foods, and your profile</p>
            </div>

            {/* 3-Segment Control */}
            <div className="px-5 mb-3">
                <div className="bg-gray-100 rounded-xl p-1 flex">
                    {tabConfig.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => { setActiveTab(t.key); setSearch(''); }}
                            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${activeTab === t.key
                                ? 'bg-white text-royal-700 shadow-sm'
                                : 'text-text-muted'
                                }`}
                        >
                            <t.Icon className="w-3.5 h-3.5" />
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' ? (
                <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pb-6 space-y-4">
                    {/* Body Metrics Card */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                            <User className="w-4 h-4 text-royal-500" />
                            Body Metrics
                        </h2>

                        {/* Name */}
                        <div className="mb-3">
                            <label className="text-[10px] text-text-muted font-medium uppercase tracking-wider flex items-center gap-1 mb-1.5">
                                <User className="w-3 h-3" />
                                Your Name
                            </label>
                            <input
                                type="text"
                                value={nameInput}
                                onChange={(e) => setNameInput(e.target.value)}
                                placeholder="e.g. Alex"
                                className="w-full bg-gray-50 rounded-xl px-3 py-3 text-sm font-semibold text-text-primary border border-gray-200 focus:outline-none focus:border-royal-500 focus:ring-2 focus:ring-royal-500/10"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className="text-[10px] text-text-muted font-medium uppercase tracking-wider flex items-center gap-1 mb-1.5">
                                    <Weight className="w-3 h-3" />
                                    Weight (kg)
                                </label>
                                <input
                                    type="number"
                                    value={weightInput}
                                    onChange={(e) => setWeightInput(e.target.value)}
                                    placeholder="e.g. 70"
                                    className="w-full bg-gray-50 rounded-xl px-3 py-3 text-sm font-semibold text-text-primary border border-gray-200 focus:outline-none focus:border-royal-500 focus:ring-2 focus:ring-royal-500/10"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-text-muted font-medium uppercase tracking-wider flex items-center gap-1 mb-1.5">
                                    <Ruler className="w-3 h-3" />
                                    Height (cm)
                                </label>
                                <input
                                    type="number"
                                    value={heightInput}
                                    onChange={(e) => setHeightInput(e.target.value)}
                                    placeholder="e.g. 175"
                                    className="w-full bg-gray-50 rounded-xl px-3 py-3 text-sm font-semibold text-text-primary border border-gray-200 focus:outline-none focus:border-royal-500 focus:ring-2 focus:ring-royal-500/10"
                                />
                            </div>
                        </div>

                        {/* Daily Calorie Goal */}
                        <div className="mb-4">
                            <label className="text-[10px] text-text-muted font-medium uppercase tracking-wider flex items-center gap-1 mb-1.5">
                                <Zap className="w-3 h-3" />
                                Daily Calorie Goal (kcal)
                            </label>
                            <input
                                type="number"
                                value={calorieInput}
                                onChange={(e) => setCalorieInput(e.target.value)}
                                placeholder="e.g. 2000"
                                className="w-full bg-gray-50 rounded-xl px-3 py-3 text-sm font-semibold text-text-primary border border-gray-200 focus:outline-none focus:border-royal-500 focus:ring-2 focus:ring-royal-500/10"
                            />
                        </div>

                        <button
                            onClick={saveProfile}
                            className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${profileSaved
                                ? 'bg-emerald-500 text-white'
                                : 'bg-royal-600 text-white'
                                }`}
                        >
                            {profileSaved ? (
                                <><Check className="w-4 h-4" /> Saved!</>
                            ) : (
                                <><Save className="w-4 h-4" /> Save Profile</>
                            )}
                        </button>
                    </div>

                    {/* Calculated Stats */}
                    {(weightKg > 0 || heightCm > 0) && (
                        <div className="space-y-2">
                            {bmi && (
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl px-4 py-3.5 border border-blue-100 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider">BMI</p>
                                        <p className="text-xl font-bold text-text-primary">{bmi}</p>
                                    </div>
                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${Number(bmi) < 18.5 ? 'bg-blue-100 text-blue-700'
                                        : Number(bmi) < 25 ? 'bg-emerald-100 text-emerald-700'
                                            : Number(bmi) < 30 ? 'bg-amber-100 text-amber-700'
                                                : 'bg-red-100 text-red-700'
                                        }`}>
                                        {Number(bmi) < 18.5 ? 'Underweight'
                                            : Number(bmi) < 25 ? 'Normal'
                                                : Number(bmi) < 30 ? 'Overweight'
                                                    : 'Obese'}
                                    </span>
                                </div>
                            )}
                            <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl px-4 py-3.5 border border-red-100 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider">Daily Protein Target</p>
                                    <p className="text-xl font-bold text-text-primary">
                                        {proteinTarget}g
                                        <span className="text-xs text-text-muted font-normal ml-1.5">/ day</span>
                                    </p>
                                </div>
                                <span className="text-xs text-text-muted">Weight × 2</span>
                            </div>
                        </div>
                    )}
                    {weightKg === 0 && heightCm === 0 && (
                        <div className="text-center py-8 text-text-muted">
                            <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="text-sm font-medium">No profile set</p>
                            <p className="text-xs mt-1">Enter your weight and height above to get personalized targets.</p>
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {/* Search & Add */}
                    <div className="px-5 flex gap-2 mb-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <input
                                type="text"
                                placeholder={`Search ${activeTab}...`}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-royal-500"
                            />
                        </div>
                        <button
                            onClick={() => setShowModal(true)}
                            className="w-10 h-10 bg-royal-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-royal-500/25 active:scale-90 transition-transform"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pb-6 space-y-2">
                        {activeTab === 'exercises' ? (
                            filteredExercises.length > 0 ? (
                                filteredExercises.map((ex) => (
                                    <div key={ex.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3.5 border border-gray-100 shadow-sm">
                                        <div className="w-9 h-9 rounded-xl bg-royal-50 flex items-center justify-center">
                                            <Dumbbell className="w-4 h-4 text-royal-600" />
                                        </div>
                                        <p className="flex-1 text-sm font-medium text-text-primary">{ex.name}</p>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => {
                                                    setEditExId(ex.id!);
                                                    setExName(ex.name);
                                                    setShowModal(true);
                                                }}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-royal-600 hover:bg-royal-50 transition-colors"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => deleteExercise(ex.id!)}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-danger hover:bg-red-50 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : <EmptyState type="exercises" />
                        ) : (
                            filteredFoods.length > 0 ? (
                                filteredFoods.map((food) => (
                                    <div key={food.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3.5 border border-gray-100 shadow-sm">
                                        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                                            <Utensils className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-text-primary">{food.name}</p>
                                            <p className="text-[11px] text-text-muted mt-0.5">
                                                {food.calories}cal · {food.protein}p · {food.carbs}c · {food.fat}f
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => {
                                                    setEditFoodId(food.id!);
                                                    setFoodForm({
                                                        name: food.name,
                                                        calories: String(food.calories),
                                                        protein: String(food.protein),
                                                        carbs: String(food.carbs),
                                                        fat: String(food.fat)
                                                    });
                                                    setShowModal(true);
                                                }}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-royal-600 hover:bg-royal-50 transition-colors"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => deleteFood(food.id!)}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-danger hover:bg-red-50 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : <EmptyState type="foods" />
                        )}
                    </div>
                </>
            )}

            {/* Modal (Exercise / Food) */}
            {showModal && activeTab !== 'profile' && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
                    <div className="bg-white w-full max-w-[400px] rounded-t-3xl animate-slide-up">
                        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-100">
                            <h2 className="text-lg font-bold text-text-primary">
                                {activeTab === 'exercises' ? (editExId ? 'Edit Exercise' : 'Add Exercise') : (editFoodId ? 'Edit Food' : 'Add Food')}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setExName('');
                                    setEditExId(null);
                                    setFoodForm({ name: '', calories: '', protein: '', carbs: '', fat: '' });
                                    setEditFoodId(null);
                                }}
                                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                            >
                                <X className="w-4 h-4 text-text-secondary" />
                            </button>
                        </div>
                        <div className="px-5 py-4 space-y-3">
                            {activeTab === 'exercises' ? (
                                <>
                                    <div>
                                        <label className="text-[11px] text-text-muted font-medium uppercase tracking-wide">Exercise Name</label>
                                        <input
                                            type="text"
                                            value={exName}
                                            onChange={(e) => setExName(e.target.value)}
                                            className="w-full mt-1 px-4 py-3 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-royal-500"
                                            placeholder="e.g. Bench Press"
                                            autoFocus
                                        />
                                    </div>
                                    <button
                                        onClick={saveExercise}
                                        disabled={!exName.trim()}
                                        className="w-full bg-royal-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-40 active:scale-[0.98] transition-transform"
                                    >
                                        {editExId ? 'Save Changes' : 'Add Exercise'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="text-[11px] text-text-muted font-medium uppercase tracking-wide">Food Name</label>
                                        <input
                                            type="text"
                                            value={foodForm.name}
                                            onChange={(e) => setFoodForm({ ...foodForm, name: e.target.value })}
                                            className="w-full mt-1 px-4 py-3 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-royal-500"
                                            placeholder="e.g. Chicken Breast"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {(['calories', 'protein', 'carbs', 'fat'] as const).map((field) => (
                                            <div key={field}>
                                                <label className="text-[11px] text-text-muted font-medium uppercase tracking-wide">
                                                    {field === 'calories' ? 'Calories (kcal)' : `${field} (g)`}
                                                </label>
                                                <input
                                                    type="number"
                                                    value={foodForm[field]}
                                                    onChange={(e) => setFoodForm({ ...foodForm, [field]: e.target.value })}
                                                    className="w-full mt-1 px-3 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-royal-500"
                                                    placeholder="0"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={saveFood}
                                        disabled={!foodForm.name.trim()}
                                        className="w-full bg-royal-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-40 active:scale-[0.98] transition-transform"
                                    >
                                        {editFoodId ? 'Save Changes' : 'Add Food'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function EmptyState({ type }: { type: string }) {
    return (
        <div className="text-center py-12 text-text-muted">
            {type === 'exercises' ? (
                <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-20" />
            ) : (
                <Utensils className="w-12 h-12 mx-auto mb-3 opacity-20" />
            )}
            <p className="text-sm font-medium">No {type} yet</p>
            <p className="text-xs mt-1">Add your first {type === 'exercises' ? 'exercise' : 'food item'}!</p>
        </div>
    );
}
