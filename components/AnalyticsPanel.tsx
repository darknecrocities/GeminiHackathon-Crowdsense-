
import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface AnalyticsPanelProps {
  history: any[];
}

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ history }) => {
  const chartData = useMemo(() => {
    return history.slice(-30).map((h, i) => ({
      time: i,
      density: h.density,
      people: h.peopleCount,
      risk: h.stampedeProbability * 100
    }));
  }, [history]);

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      <div className="glass p-6 rounded-2xl flex flex-col">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">Density Over Time</h3>
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorDensity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis domain={[0, 5]} hide />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px' }}
                itemStyle={{ color: '#22d3ee' }}
              />
              <Area type="monotone" dataKey="density" stroke="#22d3ee" fillOpacity={1} fill="url(#colorDensity)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass p-6 rounded-2xl flex flex-col">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">Risk Index Trend</h3>
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px' }}
                itemStyle={{ color: '#f87171' }}
              />
              <Line type="monotone" dataKey="risk" stroke="#f87171" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
