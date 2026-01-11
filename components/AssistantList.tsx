import React, { useState } from 'react';
import { Assistant } from '../types';
import { ChevronLeft, Check, Edit3, X, Save } from 'lucide-react';

interface AssistantListProps {
  assistants: Assistant[];
  selectedId: string;
  onSelect: (assistant: Assistant) => void;
  onUpdate: (assistant: Assistant) => void;
  onBack: () => void;
}

const AssistantEditor: React.FC<{ assistant: Assistant; onSave: (instruction: string) => void; onCancel: () => void }> = ({ assistant, onSave, onCancel }) => {
  const [instruction, setInstruction] = useState(assistant.instruction);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-t-[40px] sm:rounded-[40px] shadow-2xl p-8 animate-in slide-in-from-bottom duration-500 overflow-hidden relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-gray-100 rounded-full mt-3 sm:hidden" />
        
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl ${assistant.avatar} flex items-center justify-center text-white font-bold`}>
              {assistant.name.charAt(0)}
            </div>
            <div>
              <h2 className="font-outfit text-xl font-bold text-gray-900">编辑提示词</h2>
              <p className="text-[11px] text-gray-400 uppercase tracking-widest font-bold">Assistant Prompt</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 bg-gray-50 text-gray-400 rounded-full hover:text-gray-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="mb-8">
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            className="w-full h-64 p-6 bg-gray-50/50 border border-gray-100 rounded-[32px] text-sm text-gray-700 font-light leading-relaxed focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/20 outline-none resize-none no-scrollbar transition-all"
            placeholder="输入此助手的系统指令..."
          />
        </div>

        <div className="flex gap-4">
          <button 
            onClick={onCancel}
            className="flex-1 py-4 px-6 rounded-[24px] text-sm font-bold text-gray-400 hover:text-gray-600 transition-all active:scale-95"
          >
            取消
          </button>
          <button 
            onClick={() => onSave(instruction)}
            className="flex-[2] py-4 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-[24px] text-sm font-bold shadow-xl shadow-blue-200 hover:shadow-2xl hover:shadow-blue-300 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Save size={18} />
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
};

export const AssistantList: React.FC<AssistantListProps> = ({ assistants, selectedId, onSelect, onUpdate, onBack }) => {
  const [editingAssistant, setEditingAssistant] = useState<Assistant | null>(null);

  const handleEditClick = (e: React.MouseEvent, assistant: Assistant) => {
    e.stopPropagation();
    setEditingAssistant(assistant);
  };

  const handleSaveInstruction = (instruction: string) => {
    if (editingAssistant) {
      onUpdate({ ...editingAssistant, instruction });
      setEditingAssistant(null);
    }
  };

  return (
    <div className="absolute inset-0 h-full w-full bg-[#fafafa] flex flex-col animate-slide-in-left z-50">
      <header className="px-6 py-4 flex items-center gap-4 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-500 hover:text-black transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-outfit text-xl font-medium text-gray-800">切换助手</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 no-scrollbar">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest px-1">可用助手</p>
        
        <div className="grid gap-4 pb-10">
          {assistants.map((assistant) => (
            <div key={assistant.id} className="relative group">
              <button
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
                
                <div className="flex-1 text-left pr-10">
                  <h3 className="font-outfit font-medium text-gray-800 text-[16px]">{assistant.name}</h3>
                  <p className="text-[13px] text-gray-400 line-clamp-1 font-light">{assistant.description}</p>
                </div>

                {selectedId === assistant.id && (
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                    <Check size={18} strokeWidth={3} />
                  </div>
                )}
              </button>
              
              <button 
                onClick={(e) => handleEditClick(e, assistant)}
                className={`absolute top-1/2 -translate-y-1/2 right-4 p-3 rounded-2xl text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-all duration-300 ${selectedId === assistant.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              >
                <Edit3 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
      
      {editingAssistant && (
        <AssistantEditor 
          assistant={editingAssistant} 
          onSave={handleSaveInstruction} 
          onCancel={() => setEditingAssistant(null)} 
        />
      )}

      <div className="p-10 text-center opacity-30 mt-auto">
        <p className="text-[10px] text-gray-400 tracking-[0.3em] uppercase">Powered by Aura Intelligence</p>
      </div>
    </div>
  );
};