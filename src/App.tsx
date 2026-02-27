import { useAppStore } from './store';
import Dashboard from './pages/Dashboard';
import GymTracker from './pages/GymTracker';
import Nutrition from './pages/Nutrition';
import MentalHealth from './pages/MentalHealth';
import Library from './pages/Library';
import {
  LayoutDashboard,
  Dumbbell,
  Utensils,
  Brain,
  BookOpen,
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
      case 'dashboard':
        return <Dashboard />;
      case 'gym':
        return <GymTracker />;
      case 'nutrition':
        return <Nutrition />;
      case 'mental':
        return <MentalHealth />;
      case 'library':
        return <Library />;
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-gray-900 flex items-center justify-center overflow-hidden">
      {/* Mobile Frame */}
      <div className="w-full max-w-[400px] h-[100dvh] bg-white relative flex flex-col overflow-hidden shadow-2xl">
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-20 bg-surface">
          {renderTab()}
        </div>

        {/* Bottom Navigation */}
        <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
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
                    className={`w-5 h-5 transition-all ${isActive ? 'scale-110' : ''
                      }`}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span
                    className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''
                      }`}
                  >
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
