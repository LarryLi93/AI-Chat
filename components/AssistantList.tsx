
import React from 'react';
import { Assistant } from '../types';
import { ChevronLeft, Check } from 'lucide-react';

interface AssistantListProps {
  assistants: Assistant[];
  selectedId: string;
  onSelect: (assistant: Assistant) => void;
  onBack: () => void;
}

export const AssistantList: React.FC<AssistantListProps> = ({ assistants, selectedId, onSelect, onBack }) => {
  return (
    <div className="h-full w-full bg-[#fafafa] flex flex-col animate-slide-in-left">
      <header className="px-6 py-4 flex items-center gap-4 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-500 hover:text-black transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-outfit text-xl font-medium text-gray-800">切换助手</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 no-scrollbar">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest px-1">可用助手</p>
        
        <div className="grid gap-4">
          {assistants.map((assistant) => (
            <button
              key={assistant.id}
              onClick={() => onSelect(assistant)}
              className={`w-full flex items-center gap-4 p-4 rounded-[32px] transition-all duration-300 border ${
                selectedId === assistant.id 
                  ? 'bg-white border-blue-200 shadow-xl shadow-blue-50/50 translate-x-1' 
                  : 'bg-white/40 border-gray-100 hover:bg-white hover:border-gray-200'
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl ${assistant.avatar} flex items-center justify-center text-white text-xl font-bold shadow-sm`}>
                {assistant.name.charAt(0)}
              </div>
              
              <div className="flex-1 text-left">
                <h3 className="font-outfit font-medium text-gray-800 text-[16px]">{assistant.name}</h3>
                <p className="text-[13px] text-gray-400 line-clamp-1 font-light">{assistant.description}</p>
              </div>

              {selectedId === assistant.id && (
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                  <Check size={18} strokeWidth={3} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
      
      <div className="p-10 text-center opacity-30">
        <p className="text-[10px] text-gray-400 tracking-[0.3em] uppercase">Powered by Aura Intelligence</p>
      </div>
    </div>
  );
};
