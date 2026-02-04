import React from 'react';
import { HelpCircle, ChevronRight } from 'lucide-react';
import { QuestionListData } from '../types';

interface QuestionListRendererProps extends QuestionListData {
  onAction?: (action: string, data: any) => void;
  onSendSuggestion?: (suggestion: string) => void;
}

const QuestionListRenderer: React.FC<QuestionListRendererProps> = ({ list, onSendSuggestion }) => {
  if (!list || list.length === 0) return null;

  return (
    <div className="w-full bg-white rounded-[26px] overflow-hidden border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-purple-50/30 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-500 flex items-center justify-center text-white shadow-sm shadow-purple-200">
            <HelpCircle size={16} />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-gray-900 tracking-tight">建议</h3>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mt-0.5">
              Question List
            </p>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="p-2">
        <div className="flex flex-col gap-1">
          {list.map((item, index) => (
            <button
              key={index}
              onClick={() => onSendSuggestion && onSendSuggestion(item)}
              className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-gray-50 transition-all group text-left border border-transparent hover:border-gray-100"
            >
              <span className="text-[14px] text-gray-700 font-medium leading-relaxed pr-4">
                {item}
              </span>
              <div className="shrink-0 w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-colors">
                <ChevronRight size={14} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-50 flex items-center justify-center">
        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em]">
          Please select a question
        </span>
      </div>
    </div>
  );
};

export default QuestionListRenderer;
