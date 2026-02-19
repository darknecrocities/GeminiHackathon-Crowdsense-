import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, CrowdMetrics } from '../types';
import { geminiService } from '../services/geminiService';

interface ChatInterfaceProps {
  metrics: CrowdMetrics;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ metrics }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'init', role: 'model', text: 'Tactical Commander online. Awaiting query.', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await geminiService.chatWithCommander(messages, metrics, input);
      const aiMsg: ChatMessage = { id: (Date.now()+1).toString(), role: 'model', text: responseText, timestamp: Date.now() };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[400px] glass rounded-2xl border border-white/5 overflow-hidden">
      <div className="p-3 bg-slate-900/50 border-b border-white/5 flex items-center justify-between">
         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Secure Comms Uplink</span>
         <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-500'}`}></div>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-xl text-xs leading-relaxed ${
              msg.role === 'user' 
              ? 'bg-cyan-500/20 text-cyan-100 rounded-tr-none border border-cyan-500/20' 
              : 'bg-slate-800 text-slate-300 rounded-tl-none border border-white/5'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
           <div className="flex justify-start">
             <div className="bg-slate-800 p-3 rounded-xl rounded-tl-none border border-white/5 flex gap-1">
               <div className="w-1 h-1 bg-slate-500 rounded-full animate-bounce"></div>
               <div className="w-1 h-1 bg-slate-500 rounded-full animate-bounce delay-75"></div>
               <div className="w-1 h-1 bg-slate-500 rounded-full animate-bounce delay-150"></div>
             </div>
           </div>
        )}
      </div>

      <div className="p-3 bg-slate-900/50 border-t border-white/5">
        <div className="relative">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask commander about sector status..."
            className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
          />
          <button 
            onClick={handleSend}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
          >
            <span className="text-xs">SEND</span>
          </button>
        </div>
      </div>
    </div>
  );
};
