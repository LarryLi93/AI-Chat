
import React from 'react';
import { LayoutGrid } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  assistantName: string;
  assistantAvatar: string;
  onSwitchClick: () => void;
  onUserClick?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  assistantName, 
  assistantAvatar, 
  onSwitchClick,
  onUserClick 
}) => {
  return (
    <div className="flex flex-col h-full w-full animate-slide-in-right">
      <header className="z-30 px-5 py-3 flex items-center justify-between glass-effect border-b border-gray-100/50">
        <button 
          onClick={onSwitchClick}
          className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors bg-white/40 rounded-full backdrop-blur-sm"
        >
          <LayoutGrid size={20} strokeWidth={1.5} />
        </button>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full ${assistantAvatar} flex items-center justify-center text-white font-bold text-[10px] shadow-sm shadow-blue-100`}>
              {assistantName.charAt(0)}
            </div>
            <h1 className="font-outfit text-sm font-medium text-gray-800 tracking-tight">{assistantName}</h1>
          </div>
        </div>

        <button 
          onClick={onUserClick}
          className="px-2 text-gray-500 hover:text-gray-800 transition-colors text-[11px] font-medium tracking-widest uppercase outline-none"
        >
          User
        </button>
      </header>

      <div className="flex-1 relative overflow-hidden flex flex-col">
        {children}
      </div>
    </div>
  );
};
