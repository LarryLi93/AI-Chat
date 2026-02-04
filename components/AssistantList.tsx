
import React, { useState } from 'react';
import { Assistant } from '../types';
import { ChevronLeft, Check, Edit3, X, Save, Plus, Trash2, Globe, Play, Loader2, Info, AlertCircle } from 'lucide-react';

interface AssistantListProps {
  assistants: Assistant[];
  selectedId: string;
  onSelect: (assistant: Assistant) => void;
  onUpdate: (assistant: Assistant) => void;
  onAdd: (assistant: Assistant) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

const AssistantEditor: React.FC<{ 
  assistant?: Partial<Assistant>; 
  onSave: (data: any) => void; 
  onCancel: () => void;
  isNew?: boolean;
}> = ({ assistant, onSave, onCancel, isNew }) => {
  const [formData, setFormData] = useState<Partial<Assistant>>({
    name: assistant?.name || '',
    description: assistant?.description || '',
    n8nUrl: assistant?.n8nUrl || '',
    n8nParams: assistant?.n8nParams || '{\n  "chatInput": ""\n}',
    detailUrl: assistant?.detailUrl || '',
    detailField: assistant?.detailField || '',
    suggestionUrl: assistant?.suggestionUrl || '',
    suggestionParams: assistant?.suggestionParams || '',
    avatar: assistant?.avatar || 'bg-gradient-to-tr from-indigo-400 to-purple-500',
    color: assistant?.color || 'bg-indigo-500'
  });
  
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{message: string, isError: boolean} | null>(null);

  const handleTest = async () => {
    if (!formData.n8nUrl) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      let body = {};
      try {
        body = formData.n8nParams ? JSON.parse(formData.n8nParams) : {};
      } catch (e) {
        throw new Error("JSON 格式错误，请检查参数设置。");
      }
      
      const response = await fetch(formData.n8nUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, chatInput: "你好" }),
        mode: 'cors'
      });
      const data = await response.text();
      setTestResult({
        message: `状态: ${response.status}\n结果: ${data.substring(0, 150)}${data.length > 150 ? '...' : ''}`,
        isError: !response.ok
      });
    } catch (e: any) {
      let errorMsg = e.message;
      if (e.name === 'TypeError' || e.message.includes('fetch')) {
        errorMsg = "网络请求失败 (Failed to fetch)。\n\n1. N8N 缺少 CORS 配置\n2. HTTPS 环境拦截了 HTTP 请求\n3. Webhook URL 不正确";
      }
      setTestResult({
        message: errorMsg,
        isError: true
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm animate-fade-in text-left">
      <div className="w-full max-w-md bg-white rounded-t-[48px] sm:rounded-[48px] shadow-2xl animate-in slide-in-from-bottom duration-500 flex flex-col max-h-[96vh] overflow-hidden relative">
        
        {/* Mobile Pull Handle */}
        <div className="flex justify-center pt-4 pb-1 sm:hidden">
          <div className="w-12 h-1 bg-gray-100 rounded-full" />
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-8 pt-4 pb-12">
          
          {/* Header */}
          <div className="flex items-center gap-5 mb-10">
            <div className={`w-16 h-16 rounded-[24px] ${formData.avatar} flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-blue-100/30 flex-shrink-0`}>
              {formData.name?.charAt(0) || '?'}
            </div>
            <div className="flex-1">
              <h2 className="font-outfit text-2xl font-bold text-gray-900 tracking-tight leading-tight">
                {isNew ? '创建新助手' : '编辑助手设置'}
              </h2>
              <p className="text-[10px] text-gray-400 uppercase tracking-[0.25em] font-bold mt-1">
                Aura Assistant Config
              </p>
            </div>
            <button onClick={onCancel} className="p-3 bg-gray-50 text-gray-400 rounded-full hover:text-gray-800 transition-all active:scale-90">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-9">
            <div className="space-y-7">
              {/* Name */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-2 mb-2.5 block">助手名称</label>
                <input 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="例如：N8N 助手"
                  className="w-full px-6 py-4.5 bg-gray-50/50 border border-gray-100 rounded-[24px] text-[15px] text-gray-900 focus:ring-4 focus:ring-blue-500/5 focus:bg-white outline-none transition-all placeholder:text-gray-300"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-2 mb-2.5 block">简短描述</label>
                <input 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="用一句话描述这个助手..."
                  className="w-full px-6 py-4.5 bg-gray-50/50 border border-gray-100 rounded-[24px] text-[15px] text-gray-900 focus:ring-4 focus:ring-blue-500/5 focus:bg-white outline-none transition-all placeholder:text-gray-300"
                />
              </div>

              <div className="space-y-7 animate-in fade-in slide-in-from-top-3 duration-500">
                <div>
                  <div className="flex items-center justify-between mb-2.5 px-1">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] block">Webhook URL</label>
                    <div className="group relative">
                      <Info size={14} className="text-gray-300 cursor-help" />
                      <div className="absolute bottom-full right-0 mb-3 w-60 p-4 bg-gray-900 text-white text-[10px] rounded-[18px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-2xl leading-relaxed">
                        必须使用 HTTPS 且后端配置跨域 (CORS)。
                      </div>
                    </div>
                  </div>
                  <input 
                    value={formData.n8nUrl}
                    onChange={e => setFormData({...formData, n8nUrl: e.target.value})}
                    placeholder="https://n8n.example.com/webhook/..."
                    className="w-full px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-[20px] text-[12px] text-gray-900 font-mono focus:ring-4 focus:ring-blue-500/5 focus:bg-white outline-none transition-all"
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2.5 px-1">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] block">请求参数 (JSON)</label>
                    <button 
                      onClick={handleTest}
                      disabled={isTesting || !formData.n8nUrl}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isTesting ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
                      测试链接
                    </button>
                  </div>
                  <div className="relative group/editor">
                    <textarea
                      value={formData.n8nParams}
                      onChange={e => setFormData({...formData, n8nParams: e.target.value})}
                      className="w-full h-48 p-7 bg-[#0d1117] border border-gray-800 rounded-[34px] text-[13px] text-blue-200 font-mono resize-none outline-none focus:ring-4 focus:ring-blue-500/10 transition-all no-scrollbar shadow-xl"
                      spellCheck={false}
                    />
                    <div className="absolute top-5 right-6 text-[8px] font-bold text-gray-500 uppercase tracking-[0.3em] opacity-40">Editor</div>
                  </div>
                  
                  {testResult && (
                    <div className={`mt-5 p-5 rounded-[28px] text-[11px] font-mono border whitespace-pre-wrap max-h-40 overflow-y-auto no-scrollbar animate-in fade-in zoom-in-95 leading-relaxed ${
                      testResult.isError ? 'bg-red-50 text-red-500 border-red-100 shadow-inner' : 'bg-gray-50 text-gray-500 border-gray-100'
                    }`}>
                      <div className="flex items-center gap-2 mb-2 font-bold uppercase tracking-widest text-[9px] opacity-60">
                        {testResult.isError ? <AlertCircle size={12} /> : <div className="w-1 h-1 rounded-full bg-current" />}
                        测试报告
                      </div>
                      {testResult.message}
                    </div>
                  )}
                </div>

                {/* Product Detail Configuration */}
                <div className="pt-4 border-t border-gray-100">
                   <h3 className="text-[12px] font-bold text-gray-800 mb-4">增强配置</h3>
                   <div className="space-y-4">
                      <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-2 mb-2.5 block">详情 API URL</label>
                        <input 
                          value={formData.detailUrl}
                          onChange={e => setFormData({...formData, detailUrl: e.target.value})}
                          placeholder="http://example.com/api/product_detail"
                          className="w-full px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-[20px] text-[12px] text-gray-900 font-mono focus:ring-4 focus:ring-blue-500/5 focus:bg-white outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-2 mb-2.5 block">详情参数字段 (Field)</label>
                        <input 
                          value={formData.detailField}
                          onChange={e => setFormData({...formData, detailField: e.target.value})}
                          placeholder="例如: code"
                          className="w-full px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-[20px] text-[12px] text-gray-900 font-mono focus:ring-4 focus:ring-blue-500/5 focus:bg-white outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-2 mb-2.5 block">建议/追问工作流 URL</label>
                        <input 
                          value={formData.suggestionUrl}
                          onChange={e => setFormData({...formData, suggestionUrl: e.target.value})}
                          placeholder="https://n8n.example.com/webhook/..."
                          className="w-full px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-[20px] text-[12px] text-gray-900 font-mono focus:ring-4 focus:ring-blue-500/5 focus:bg-white outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-2 mb-2.5 block">建议/追问请求参数 (JSON)</label>
                        <textarea 
                          value={formData.suggestionParams}
                          onChange={e => setFormData({...formData, suggestionParams: e.target.value})}
                          placeholder='{"key": "value"}'
                          className="w-full h-24 px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-[20px] text-[12px] text-gray-900 font-mono focus:ring-4 focus:ring-blue-500/5 focus:bg-white outline-none transition-all resize-none"
                        />
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-8 pb-10 pt-4 bg-white/80 backdrop-blur-md border-t border-gray-50 flex gap-4">
          <button 
            onClick={onCancel}
            className="flex-1 py-4.5 rounded-[26px] text-[15px] font-bold text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-gray-600 transition-all active:scale-95 outline-none"
          >
            取消
          </button>
          <button 
            onClick={() => onSave(formData)}
            disabled={!formData.name}
            className="flex-[1.8] py-4.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-[26px] text-[15px] font-bold shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 transition-all active:scale-95 disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2.5 outline-none"
          >
            <Save size={18} />
            保存助手
          </button>
        </div>
      </div>
    </div>
  );
};

export const AssistantList: React.FC<AssistantListProps> = ({ 
  assistants, 
  selectedId, 
  onSelect, 
  onUpdate, 
  onAdd,
  onDelete,
  onBack 
}) => {
  const [editingAssistant, setEditingAssistant] = useState<Assistant | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleEditClick = (e: React.MouseEvent, assistant: Assistant) => {
    e.stopPropagation();
    setEditingAssistant(assistant);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("确认从库中移除该助手吗？")) {
      onDelete(id);
    }
  };

  const handleSave = (data: any) => {
    if (isCreating) {
      onAdd({
        ...data,
        id: Math.random().toString(36).substring(7),
        color: 'bg-blue-500' 
      });
      setIsCreating(false);
    } else if (editingAssistant) {
      onUpdate({ ...editingAssistant, ...data });
      setEditingAssistant(null);
    }
  };

  return (
    <div className="absolute inset-0 h-full w-full bg-[#fafafa] flex flex-col animate-slide-in-left z-50 text-left">
      <header className="px-6 py-5 flex items-center justify-between border-b border-gray-100/50 glass-effect">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-gray-500 hover:text-black transition-colors bg-white/40 rounded-full backdrop-blur-sm">
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-outfit text-xl font-bold text-gray-800 tracking-tight">助手工坊</h1>
        </div>
        
        <button 
          onClick={() => setIsCreating(true)}
          className="w-10 h-10 bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100 active:scale-95 transition-all"
        >
          <Plus size={24} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6 no-scrollbar">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.25em] px-2">Aura Collection</p>
        
        <div className="grid gap-5 pb-16">
          {assistants.map((assistant) => (
            <div key={assistant.id} className="relative group">
              <button
                onClick={() => onSelect(assistant)}
                className={`w-full flex items-center gap-5 p-5 rounded-[40px] transition-all duration-500 border-2 ${
                  selectedId === assistant.id 
                    ? 'bg-white border-blue-500 shadow-2xl shadow-blue-100/50 translate-x-1' 
                    : 'bg-white/40 border-gray-100 hover:bg-white hover:border-gray-200'
                }`}
              >
                <div className={`w-16 h-16 rounded-[24px] ${assistant.avatar} flex items-center justify-center text-white text-2xl font-bold shadow-sm flex-shrink-0`}>
                  <Globe size={28} />
                </div>
                
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-outfit font-bold text-gray-800 text-[18px] tracking-tight">{assistant.name}</h3>
                  </div>
                  <p className="text-[14px] text-gray-400 line-clamp-1 font-light leading-relaxed">{assistant.description}</p>
                </div>
              </button>
              
              <div className={`absolute top-1/2 -translate-y-1/2 right-5 flex gap-2 transition-all duration-300 ${selectedId === assistant.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <button 
                  onClick={(e) => handleEditClick(e, assistant)}
                  className="p-3.5 rounded-2xl text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all active:scale-90"
                >
                  <Edit3 size={18} />
                </button>
                {assistants.length > 1 && (
                  <button 
                    onClick={(e) => handleDeleteClick(e, assistant.id)}
                    className="p-3.5 rounded-2xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all active:scale-90"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {(editingAssistant || isCreating) && (
        <AssistantEditor 
          assistant={editingAssistant || {}} 
          onSave={handleSave} 
          onCancel={() => {
            setEditingAssistant(null);
            setIsCreating(false);
          }} 
          isNew={isCreating}
        />
      )}

      <div className="py-8 text-center opacity-20 mt-auto">
        <p className="text-[9px] text-gray-400 tracking-[0.5em] uppercase font-bold">Aura Intelligent System</p>
      </div>
    </div>
  );
};
