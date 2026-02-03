
import React from 'react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'camera', icon: '📹', label: 'Live Vision' },
    { id: 'risk', icon: '⚠️', label: 'Risk Analysis' },
    { id: 'map', icon: '🗺️', label: 'Geo Mapping' },
    { id: 'analytics', icon: '📈', label: 'Analytics' },
    { id: 'simulation', icon: '🧪', label: 'Simulation' },
  ];

  return (
    <aside className="w-20 border-r border-white/5 bg-slate-900/30 flex flex-col items-center py-6 gap-8">
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={`group relative flex flex-col items-center gap-1 transition-all ${
            activeTab === item.id ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all ${
            activeTab === item.id ? 'bg-cyan-500/10 border border-cyan-500/30' : 'bg-transparent border border-transparent'
          }`}>
            {item.icon}
          </div>
          <span className="text-[10px] font-medium uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
            {item.label}
          </span>
          {activeTab === item.id && (
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-500 rounded-r-full shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
          )}
        </button>
      ))}
    </aside>
  );
};
