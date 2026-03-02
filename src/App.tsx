import { useAppStore } from './store';
import Dashboard from './pages/Dashboard';
import GymTracker from './pages/GymTracker';
import Nutrition from './pages/Nutrition';
import MentalHealth from './pages/MentalHealth';
import Library from './pages/Library';
import SyncManager from './components/SyncManager';
import {
  LayoutDashboard,
  Dumbbell,
  Utensils,
  Brain,
  BookOpen,
  Heart,
} from 'lucide-react';

const TABS = [
  { key: 'dashboard' as const, label: 'Home', Icon: LayoutDashboard },
  { key: 'gym' as const, label: 'Gym', Icon: Dumbbell },
  { key: 'nutrition' as const, label: 'Nutrition', Icon: Utensils },
  { key: 'mental' as const, label: 'Mind', Icon: Brain },
  { key: 'library' as const, label: 'Library', Icon: BookOpen },
];

function App() {
  const { activeTab, setActiveTab } = useAppStore();

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'gym': return <GymTracker />;
      case 'nutrition': return <Nutrition />;
      case 'mental': return <MentalHealth />;
      case 'library': return <Library />;
    }
  };

  return (
    <div className="flex h-[100dvh] w-full bg-gray-50 overflow-hidden">
      <SyncManager />

      {/* ── Desktop Left Sidebar ─────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 h-full bg-white border-r border-gray-100 shadow-sm flex-shrink-0">
        {/* Brand */}
        <div className="px-6 py-6 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-royal-600 flex items-center justify-center shadow-md shadow-royal-500/30">
              <Heart className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary leading-tight">NeroWellness</p>
              <p className="text-[10px] text-text-muted">Your health companion</p>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                    ? 'bg-royal-50 text-royal-700 font-semibold'
                    : 'text-text-muted hover:bg-gray-50 hover:text-text-primary'
                  }`}
              >
                <tab.Icon
                  className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-royal-600' : ''}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {tab.label}
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-royal-600" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100">
          <p className="text-[10px] text-text-muted text-center">
            Stay consistent, stay healthy 💪
          </p>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto custom-scrollbar pb-20 md:pb-0 bg-surface">
          {renderTab()}
        </main>

        {/* ── Mobile Bottom Navigation ──────────────────── */}
        <nav className="md:hidden flex-shrink-0 bg-white border-t border-gray-100 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-around">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex flex-col items-center gap-0.5 py-2.5 px-3 transition-all relative ${isActive ? 'text-royal-800' : 'text-text-muted'
                    }`}
                >
                  {isActive && (
                    <span className="absolute -top-0.5 w-8 h-0.5 bg-royal-800 rounded-full" />
                  )}
                  <tab.Icon
                    className={`w-5 h-5 transition-all ${isActive ? 'scale-110' : ''}`}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

export default App;
