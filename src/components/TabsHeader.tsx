import React from 'react';
import { LayoutGrid, Newspaper, Settings, Calculator } from 'lucide-react';

export type TabId = 'general' | 'news' | 'config' | 'generate';

interface TabsHeaderProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function TabsHeader({ activeTab, onTabChange }: TabsHeaderProps) {
  const tabs = [
    { id: 'general', label: 'Panel General', icon: LayoutGrid },
    { id: 'news', label: 'Noticias y Bajas', icon: Newspaper },
    { id: 'config', label: 'Configuración', icon: Settings },
    { id: 'generate', label: 'Generación', icon: Calculator },
  ] as const;

  return (
    <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-xl mb-6 overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center whitespace-nowrap
              ${isActive 
                ? 'bg-white text-blue-700 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
