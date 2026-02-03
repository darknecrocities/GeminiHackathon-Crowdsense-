
import React, { useState } from 'react';

interface Task {
  id: string;
  label: string;
  completed: boolean;
}

export const CountermeasureChecklist: React.FC<{ suggestions: string[] }> = ({ suggestions }) => {
  const [tasks, setTasks] = useState<Task[]>([]);

  React.useEffect(() => {
    if (suggestions.length > 0) {
      setTasks(suggestions.map((s, i) => ({ id: `t-${i}`, label: s, completed: false })));
    }
  }, [suggestions]);

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Response Protocol</h4>
      {tasks.length > 0 ? (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div 
              key={task.id} 
              onClick={() => toggleTask(task.id)}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all ${
                task.completed 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-slate-800/50 border-white/5 text-slate-300 hover:border-cyan-500/30'
              }`}
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500'
              }`}>
                {task.completed && <span className="text-[10px] text-white">✓</span>}
              </div>
              <span className="text-xs font-medium">{task.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-slate-600 font-mono">Standby for AI suggestions...</p>
      )}
    </div>
  );
};
