
import React, { useState, useRef, useEffect } from 'react';
import { Check, X, Plus, Trash2, ChevronDown, Edit3 } from 'lucide-react';

interface JsonFormRendererProps {
  data: any;
  onAction?: (action: string, data: any) => void;
}

const CustomSelect: React.FC<{
  value: string;
  options: string[];
  onChange: (val: string) => void;
  placeholder?: string;
}> = ({ value, options, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2 py-1.5 bg-gray-50 rounded-lg text-[13px] text-gray-700 hover:bg-gray-100/80 transition-all font-medium text-left group"
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown 
          size={14} 
          className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl py-1 animate-in fade-in slide-in-from-top-1 duration-200 overflow-hidden">
          <div className="max-h-48 overflow-y-auto no-scrollbar">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-[13px] transition-colors hover:bg-blue-50/50 ${
                  value === opt ? 'text-blue-600 font-bold bg-blue-50/30' : 'text-gray-600'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const JsonFormRenderer: React.FC<JsonFormRendererProps> = ({ data, onAction }) => {
  const [formData, setFormData] = useState(data);
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'cancelled'>('pending');

  // 当外部 data 变化时同步内部状态
  useEffect(() => {
    setFormData(data);
    setStatus('pending');
  }, [data]);

  if (!formData || typeof formData !== 'object') return null;

  // 提取表单大标题
  const formTitle = formData["表单标题"] || "信息确认";
  
  // 过滤掉大标题后的其他分组数据
  const groups = Object.entries(formData).filter(([key]) => key !== "表单标题");

  const handleInputChange = (path: string[], value: any) => {
    const newData = JSON.parse(JSON.stringify(formData));
    let current = newData;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    
    // 处理下拉列表结构的特殊更新
    const targetKey = path[path.length - 1];
    if (current[targetKey] && typeof current[targetKey] === 'object' && '当前值' in current[targetKey]) {
      current[targetKey]['当前值'] = value;
    } else {
      current[targetKey] = value;
    }
    
    setFormData(newData);
  };

  const renderField = (key: string, value: any, path: string[]) => {
    // 1. 处理下拉列表结构: { "当前值": "...", "可选列表": [...] }
    if (value && typeof value === 'object' && '当前值' in value && '可选列表' in value) {
      // 确保有默认值，如果当前值为空则取列表第一个
      const currentValue = value['当前值'] || (value['可选列表'].length > 0 ? value['可选列表'][0] : '');
      
      return (
        <CustomSelect
          value={currentValue}
          options={value['可选列表']}
          onChange={(val) => handleInputChange(path, val)}
          placeholder={key}
        />
      );
    }

    // 2. 处理基础类型 (文本/数字)
    const isNumber = typeof value === 'number';
    return (
      <input
        type={isNumber ? "number" : "text"}
        value={value ?? ""}
        placeholder={key}
        onChange={(e) => handleInputChange(path, isNumber ? parseFloat(e.target.value) || 0 : e.target.value)}
        className="w-full px-2 py-1.5 bg-gray-50 border-none rounded-lg text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
      />
    );
  };

  const renderGroup = (title: string, content: any, path: string[]) => {
    // 处理数组类型 (如产品明细)
    if (Array.isArray(content)) {
      return (
        <div className="space-y-2">
          {content.map((item, index) => (
            <div key={index} className="p-3 bg-gray-50/50 rounded-xl relative group">
              <div className="grid grid-cols-2 gap-x-3 gap-y-3 pr-9">
                {Object.entries(item).map(([k, v]) => {
                  const isFullWidth = k === '备注' || k.length > 8;
                  return (
                    <div key={k} className={isFullWidth ? "col-span-2" : ""}>
                      <div className="flex items-center gap-2">
                        <label className="text-[12px] text-gray-500 font-medium min-w-[50px] whitespace-nowrap">{k}</label>
                        <div className="flex-1">
                          {renderField(k, v, [...path, index.toString(), k])}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="absolute top-2 right-2 flex items-center gap-1">
                {content.length > 1 && (
                  <button 
                    onClick={() => {
                      const newList = [...content];
                      newList.splice(index, 1);
                      handleInputChange(path, newList);
                    }}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-90"
                    title="删除此项"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // 处理对象类型 (如订单信息、结算汇总)
    if (typeof content === 'object' && content !== null) {
      return (
        <div className="grid grid-cols-2 gap-x-3 gap-y-3">
          {Object.entries(content).map(([k, v]) => {
            // 普通表单项布局
            const isFullWidth = k === '备注' || k.length > 8;
            return (
              <div key={k} className={isFullWidth ? "col-span-2" : ""}>
                <div className="flex items-center gap-2">
                  <label className="text-[12px] text-gray-500 font-medium min-w-[50px] whitespace-nowrap">{k}</label>
                  <div className="flex-1">
                    {renderField(k, v, [...path, k])}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="w-full overflow-hidden text-left animate-in fade-in zoom-in-95 duration-500">
      {/* 表单大标题 */}
      <div className="px-5 py-3 border-b border-gray-100 bg-white">
        <h2 className="text-[16px] font-bold text-gray-900 tracking-tight">{formTitle}</h2>
      </div>

      <div className="p-3 space-y-6 bg-white">
        {groups.map(([title, content]) => {
          const isArray = Array.isArray(content);
          return (
            <div key={title} className="px-1">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-[12px] font-bold text-gray-400 flex items-center gap-2 uppercase tracking-widest border-l-2 border-blue-500/30 pl-3">
                  {title}
                </h3>
                {isArray && (
                  <button 
                    onClick={() => {
                      const newItem = content.length > 0 ? JSON.parse(JSON.stringify(content[0])) : {};
                      Object.keys(newItem).forEach(k => newItem[k] = typeof newItem[k] === 'number' ? 0 : "");
                      handleInputChange([title], [...content, newItem]);
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-blue-500 hover:bg-blue-50 rounded-md transition-all active:scale-95"
                  >
                    <Plus size={12} />
                    <span>添加</span>
                  </button>
                )}
              </div>
              <div className="py-1">
                {renderGroup(title, content, [title])}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* 操作按钮 */}
      <div className="bg-white px-5 py-4 border-t border-gray-100">
        {status === 'pending' ? (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setStatus('confirmed');
                onAction?.('confirm', formData);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold text-[13px] transition-all active:scale-[0.97] shadow-sm"
            >
              <Check size={16} />
              <span>确认提交</span>
            </button>
            <button
              onClick={() => {
                setStatus('cancelled');
                onAction?.('cancel', formData);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white hover:bg-gray-100 text-gray-500 rounded-lg font-bold text-[13px] transition-all active:scale-[0.97] border border-gray-200"
            >
              <X size={16} />
              <span>取消操作</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center py-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-medium ${
              status === 'confirmed' 
                ? 'bg-green-50 text-green-600 border border-green-100' 
                : 'bg-gray-50 text-gray-400 border border-gray-100'
            }`}>
              {status === 'confirmed' ? (
                <>
                  <Check size={14} />
                  <span>已确认提交</span>
                </>
              ) : (
                <>
                  <X size={14} />
                  <span>已取消操作</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JsonFormRenderer;
