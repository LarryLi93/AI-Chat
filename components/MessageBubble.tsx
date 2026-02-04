import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message, Role } from '../types';
import { FileText, ChevronDown, ChevronUp, Brain, Loader2, RefreshCw, Target, ThumbsUp, ThumbsDown } from 'lucide-react';
import JsonFormRenderer from './JsonFormRenderer';
import ProductListRenderer from './ProductListRenderer';
import MaterialListRenderer from './MaterialListRenderer';
import QuestionListRenderer from './QuestionListRenderer';

interface MessageBubbleProps {
  message: Message;
  senderName: string;
  isLast?: boolean;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  onAction?: (action: string, data: any) => void;
  onSendSuggestion?: (suggestion: string) => void;
}

const CodeBlock = React.memo(({ code, language }: { code: string; language: string }) => {
  return (
    <div className="relative my-5 overflow-hidden rounded-2xl border border-black/10 shadow-lg text-left">
      <div className="absolute top-3 right-3 z-10 opacity-40 hover:opacity-100 transition-opacity">
        <span className="px-2 py-1 bg-white/10 text-white/50 rounded text-[10px] font-mono uppercase">
          {language}
        </span>
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: 0,
          fontSize: '13px',
          padding: '1.5rem',
          background: '#1e1e1e',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
});

const ThinkingProcess: React.FC<{ content: string; isStreaming?: boolean; intent?: string }> = React.memo(({ content, isStreaming, intent }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const wasStreaming = useRef(isStreaming);

  useEffect(() => {
    if (content.length > 0 && isStreaming) {
      setIsExpanded(true);
    }
    if (wasStreaming.current && !isStreaming) {
      setIsExpanded(false);
    }
    wasStreaming.current = isStreaming;
  }, [content.length, isStreaming]);

  return (
    <div className="mb-4 overflow-hidden border-l-2 border-blue-200/50 pl-4 py-1 text-left relative">
      <div className="flex items-center justify-between gap-2">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-[11px] font-bold text-blue-500/70 uppercase tracking-widest transition-colors hover:text-blue-600 w-fit shrink-0"
        >
          <Brain size={12} className={isStreaming ? "animate-pulse" : ""} />
          <span>思考过程</span>
          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {intent && (
          <div className="px-2 py-0.5 bg-blue-50/50 border border-blue-100/30 rounded text-[10px] font-bold text-blue-500/70 whitespace-nowrap animate-in fade-in slide-in-from-right-2 duration-500">
            意图：{intent}
          </div>
        )}
      </div>
      
      {isExpanded && (
        <div className="mt-2 text-[13px] text-gray-500/80 leading-relaxed font-light italic animate-in fade-in slide-in-from-top-1 duration-300">
          <MemoizedReactMarkdown 
            remarkPlugins={[remarkGfm, remarkMath]} 
            rehypePlugins={[rehypeKatex]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                if (!inline && match) {
                  return <CodeBlock code={String(children).replace(/\n$/, '')} language={match[1]} />;
                }
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {content}
          </MemoizedReactMarkdown>
          {isStreaming && <span className="inline-block w-1.5 h-3 ml-1 bg-blue-400/50 animate-pulse" />}
        </div>
      )}
    </div>
  );
});

const MemoizedReactMarkdown = React.memo(ReactMarkdown);

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({ message, senderName, isLast, isStreaming, onRegenerate, onAction, onSendSuggestion }) => {
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const isUser = message.role === Role.USER;
  // 使用更宽松的判断：只要 content 有任何非空字符，就认为是有内容的
  const hasContent = message.content.length > 0;

  // 检测是否为 JSON 格式
  let jsonContent = null;
  let productListData = null;
  let materialListData = null;
  let questionListData = null;
  const thoughtRegex = /<thought>([\s\S]*?)(?:<\/thought>|$)/i;
  const thoughtMatch = message.content.match(thoughtRegex);
  const hasClosingTag = message.content.includes('</thought>');
  let mainContent = hasClosingTag 
    ? message.content.split('</thought>')[1].trim()
    : (thoughtMatch ? '' : message.content.trim());
  
  let jsonToParse = '';
  let contentBeforeJson = mainContent;
  
  // 1. 尝试从代码块中提取
  const jsonBlockMatch = mainContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonBlockMatch) {
    jsonToParse = jsonBlockMatch[1].trim();
    // 暂时不从 contentBeforeJson 中移除，等解析确认是组件后再移除
  } else {
    // 2. 尝试从普通文本中提取最外层的 { } 或 [ ]
    const firstCurly = mainContent.indexOf('{');
    const firstBracket = mainContent.indexOf('[');
    
    let startIdx = -1;
    if (firstCurly !== -1 && (firstBracket === -1 || firstCurly < firstBracket)) {
      startIdx = firstCurly;
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
    }

    if (startIdx !== -1) {
      const lastCurly = mainContent.lastIndexOf('}');
      const lastBracket = mainContent.lastIndexOf(']');
      let endIdx = Math.max(lastCurly, lastBracket);
      
      if (endIdx !== -1 && endIdx > startIdx) {
        jsonToParse = mainContent.substring(startIdx, endIdx + 1);
      } else {
        // 支持流式输出中未闭合的 JSON
        if (mainContent.includes('"element"')) {
          jsonToParse = mainContent.substring(startIdx);
        }
      }
    }
  }

  // 辅助函数：尝试解析 JSON，支持多种容错策略
  const tryParseJson = (str: string): any => {
    if (!str) return null;
    
    // 1. 尝试自动补全可能截断的 JSON (流式输出时常见)
    const fixJson = (json: string) => {
      let stack: string[] = [];
      let isInsideString = false;
      let escaped = false;
      
      for (let i = 0; i < json.length; i++) {
        const char = json[i];
        if (escaped) {
          escaped = false;
          continue;
        }
        if (char === '\\') {
          escaped = true;
          continue;
        }
        if (char === '"') {
          isInsideString = !isInsideString;
          continue;
        }
        if (!isInsideString) {
          if (char === '{') stack.push('}');
          else if (char === '[') stack.push(']');
          else if (char === '}' || char === ']') {
            if (stack.length > 0 && stack[stack.length - 1] === char) {
              stack.pop();
            }
          }
        }
      }
      
      let fixedJson = json;
      if (isInsideString) fixedJson += '"';
      while (stack.length > 0) {
        fixedJson += stack.pop();
      }
      return fixedJson;
    };

    // 策略 1: 直接解析
    try {
      return JSON.parse(str);
    } catch (e) {}

    // 策略 2: 尝试补全截断的 JSON
    try {
      const fixed = fixJson(str);
      if (fixed !== str) {
        return JSON.parse(fixed);
      }
    } catch (e) {}

    // 策略 3: 清理所有换行符和回车符 (替换为空格)
    try {
      const cleanStr = str.replace(/[\n\r]/g, ' ');
      return JSON.parse(cleanStr);
    } catch (e) {}
    
    // 策略 4: 尝试处理可能的转义 JSON 字符串
    try {
      if (str.startsWith('"') && str.endsWith('"')) {
        const unescaped = JSON.parse(str);
        if (typeof unescaped === 'string') {
          return JSON.parse(unescaped);
        }
      }
    } catch (e) {}

    return null;
  };

  if (!isUser) {
    const parsed = tryParseJson(jsonToParse);
    
    if (parsed && typeof parsed === 'object') {
       // 提取意图识别字段
       if (parsed.intent) {
         message.intent = parsed.intent;
       }
       
       // 提取建议/追问字段 (advice or suggestions)
       const advice = parsed.advice || parsed.suggestions || (parsed.response && (parsed.response.advice || parsed.response.suggestions));
       if (advice && Array.isArray(advice)) {
         message.advice = advice;
       }

       // 统一处理函数：判断并设置数据
       const processParsedData = (data: any): boolean => {
         if (!data || typeof data !== 'object') return false;

         // 处理嵌套的 text 字段 (针对 {"text": "{\"element\": \"...\"}"} 格式)
         if (data.text && typeof data.text === 'string' && data.text.includes('"element"')) {
           const nestedData = tryParseJson(data.text);
           if (nestedData && nestedData.element) {
             return processParsedData(nestedData);
           }
         }

         // 情况 1: 单个商品列表对象
        if (data.element === '商品列表') {
          productListData = data;
          return true;
        } 
        // 素材列表
        if (data.element === '素材列表') {
          materialListData = data;
          return true;
        }
        // 问题清单
        if (data.element === '问题清单') {
          questionListData = data;
          return true;
        }
        // 情况 2: 表单对象
         if (data.element === '表单' || '表单标题' in data) {
           jsonContent = data;
           return true;
         }
         // 情况 3: 数组格式 [{}, {}]
         if (Array.isArray(data) && data.length > 0) {
           // 检查数组项是否全是商品列表
           const allProducts = data.every((item: any) => item && item.element === '商品列表');
           if (allProducts) {
             productListData = { groups: data };
             return true;
           }
           // 检查是否包含任何商品列表
           const hasProducts = data.some((item: any) => item && item.element === '商品列表');
           if (hasProducts) {
             productListData = { groups: data.filter((item: any) => item && item.element === '商品列表') };
             return true;
           }
         }
         return false;
       };

       // 尝试处理原始解析数据
       let isComponent = processParsedData(parsed);
       
       if (!isComponent) {
         // 处理包装格式 {"type": "item", "content": "{...}"} 或 {"output": {...}}
         let innerData = null;
         if (parsed.type === 'item' && typeof parsed.content === 'string') {
           innerData = tryParseJson(parsed.content);
         } else if (parsed.output) {
           innerData = typeof parsed.output === 'string' ? tryParseJson(parsed.output) : parsed.output;
         }

         if (innerData) {
          if (innerData.intent && !message.intent) {
            message.intent = innerData.intent;
          }
          if (innerData.advice && Array.isArray(innerData.advice) && !message.advice) {
            message.advice = innerData.advice;
          }
          isComponent = processParsedData(innerData);
        }
       }

       // 如果识别为组件，从正文中移除对应的 JSON 字符串
       if (isComponent && jsonToParse) {
         // 优先移除包含代码块标记的完整段落
         if (jsonBlockMatch) {
           mainContent = mainContent.replace(jsonBlockMatch[0], '').trim();
         } else {
           mainContent = mainContent.replace(jsonToParse, '').trim();
         }
       } else if (!isComponent) {
         // 如果不是组件，尝试提取纯文本内容 (针对 {"text": "..."} 格式)
         const extractedText = parsed.text || (parsed.response && parsed.response.text) || (parsed.output && typeof parsed.output === 'string' ? parsed.output : null);
         if (extractedText && typeof extractedText === 'string') {
           // 如果提取到了文本，且 mainContent 中包含 jsonToParse，则用提取的文本替换它
           if (jsonToParse && mainContent.includes(jsonToParse)) {
             mainContent = mainContent.replace(jsonToParse, extractedText).trim();
           } else if (!mainContent || mainContent === jsonToParse) {
             mainContent = extractedText;
           }
         }
       }
    }
  }

  if (!isUser && !hasContent && isStreaming && isLast) {
    return (
      <div className="flex w-full mb-5 animate-in fade-in slide-in-from-bottom-2 duration-500 justify-start">
        <div className="max-w-[96%] text-left">
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400/80 px-1 ml-1">
            {senderName}
          </div>
          <div className="relative px-5 py-3.5 bg-white border border-gray-100 rounded-[26px] rounded-tl-none text-gray-800 shadow-sm flex items-center gap-3">
            <Loader2 size={16} className="animate-spin text-blue-500/60" />
            <span className="text-[14px] text-gray-400 font-light animate-pulse tracking-wide">思考中...</span>
          </div>
        </div>
      </div>
    );
  }

  const thoughtContent = thoughtMatch ? thoughtMatch[1] : null;

  return (
    <div className={`flex w-full mb-5 animate-in fade-in slide-in-from-bottom-2 duration-500 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`${(jsonContent || productListData || materialListData || questionListData) ? 'w-[100%]' : 'w-fit max-w-[96%]'} ${isUser ? 'text-right' : 'text-left'}`}>
        
        <div className={`mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400/80 px-1 ${isUser ? 'mr-1' : 'ml-1'}`}>
          {senderName}
        </div>

        <div className={`
          relative text-left
          ${isUser 
            ? 'px-5 py-3.5 bg-blue-50 border border-blue-100/50 rounded-[26px] rounded-tr-none text-gray-900 shadow-sm' 
            : `bg-white border border-gray-100 rounded-[26px] rounded-tl-none text-gray-800 shadow-sm overflow-hidden ${jsonContent || productListData || materialListData || questionListData ? 'p-0' : 'px-5 py-3.5'}`
          }
        `}>
          {message.attachments && message.attachments.length > 0 && (
            <div className={`flex flex-wrap gap-2 mb-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {message.attachments.map((att) => (
                <div key={att.id} className="rounded-xl overflow-hidden border border-black/5 max-w-full">
                  {att.mimeType.startsWith('image/') ? (
                    <img 
                      src={`data:${att.mimeType};base64,${att.data}`} 
                      alt={att.name} 
                      className="max-h-48 w-auto object-contain"
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-white/50 rounded-lg text-[11px] border border-black/5">
                      <FileText size={12} className="text-gray-400" />
                      <span className="truncate max-w-[120px] text-gray-600">{att.name}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!isUser && thoughtContent !== null && (
            <ThinkingProcess 
              content={thoughtContent} 
              isStreaming={!hasClosingTag && isLast} 
              intent={message.intent}
            />
          )}

          <div className="flex flex-col gap-3">
            {(mainContent || (isLast && hasClosingTag)) && (
              <div className={`prose-aura ${isUser ? 'text-gray-900 font-medium' : 'text-gray-800'} ${!isUser && (jsonContent || productListData || materialListData || questionListData) ? 'px-5 py-3.5' : ''}`}>
                <MemoizedReactMarkdown 
                  remarkPlugins={[remarkGfm, remarkMath]} 
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      if (!inline && match) {
                        return <CodeBlock code={String(children).replace(/\n$/, '')} language={match[1]} />;
                      }
                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {mainContent}
                </MemoizedReactMarkdown>
                {!isUser && isLast && mainContent === '' && hasClosingTag && (
                  <span className="inline-block w-1.5 h-3 bg-blue-400/50 animate-pulse" />
                )}
              </div>
            )}

            {jsonContent && (
              <div className="w-full">
                <JsonFormRenderer data={jsonContent} onAction={onAction} />
              </div>
            )}
            
            {productListData && (
              <div className="w-full">
                <ProductListRenderer {...productListData} intent={message.intent} isStreaming={isStreaming && isLast} onAction={onAction} />
              </div>
            )}
            
            {materialListData && (
              <div className="w-full">
                <MaterialListRenderer {...materialListData} onAction={onAction} />
              </div>
            )}
            
            {questionListData && (
              <div className="w-full">
                <QuestionListRenderer {...questionListData} onAction={onAction} onSendSuggestion={onSendSuggestion} />
              </div>
            )}
          </div>
        </div>

        <div className={`mt-2 flex items-center gap-3 justify-end ${isUser ? 'mr-2' : 'mr-1'}`}>
          <div className="flex items-center gap-2.5">
            <div className="text-[9px] font-bold uppercase tracking-widest opacity-20">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            {!isUser && isLast && !isStreaming && onRegenerate && (
              <button 
                onClick={onRegenerate}
                className="flex items-center gap-1.5 text-[12px] font-bold text-blue-500/60 uppercase tracking-wider hover:text-blue-600 transition-colors active:scale-95 group"
                title="重新回答"
              >
                <RefreshCw size={12} className="group-hover:rotate-180 transition-transform duration-500" />
                <span>重新回答</span>
              </button>
            )}
          </div>

          {!isUser && !isStreaming && (
            <div className="flex items-center gap-0.5 border-l border-gray-100 ml-1 pl-1">
              <button 
                onClick={() => setFeedback(feedback === 'like' ? null : 'like')}
                className={`p-1.5 rounded-lg transition-all active:scale-90 ${
                  feedback === 'like' ? 'text-blue-500 bg-blue-50' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-50'
                }`}
                title="点赞"
              >
                <ThumbsUp size={16} fill={feedback === 'like' ? 'currentColor' : 'none'} />
              </button>
              <button 
                onClick={() => {
                  if (feedback === 'dislike') {
                    setFeedback(null);
                  } else {
                    setFeedback('dislike');
                    setShowFeedbackModal(true);
                  }
                }}
                className={`p-1.5 rounded-lg transition-all active:scale-90 ${
                  feedback === 'dislike' ? 'text-red-500 bg-red-50' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-50'
                }`}
                title="点踩"
              >
                <ThumbsDown size={16} fill={feedback === 'dislike' ? 'currentColor' : 'none'} />
              </button>
            </div>
          )}
        </div>

        {/* 消息下方的建议选项 (Advice) */}
        {!isUser && message.advice && message.advice.length > 0 && !isStreaming && (
          <div className="mt-3 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-500 ml-1">
            {message.advice.map((adviceText, idx) => (
              <button
                key={idx}
                onClick={() => onSendSuggestion && onSendSuggestion(adviceText)}
                className="px-4 py-2 bg-white/60 backdrop-blur-md border border-gray-100/50 rounded-2xl text-[12px] text-gray-600 hover:text-gray-900 hover:border-gray-300 hover:bg-white transition-all shadow-sm hover:shadow-md flex items-center gap-2 group/advice"
              >
                <span>{adviceText}</span>
                <div className="w-4 h-4 rounded-full bg-gray-50 flex items-center justify-center group-hover/advice:bg-gray-900 group-hover/advice:text-white transition-colors">
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14m-7-7l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* 点踩反馈弹窗 */}
        {showFeedbackModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
              onClick={() => setShowFeedbackModal(false)}
            />
            <div className="relative w-full max-w-[320px] bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-6 py-5">
                <h3 className="text-[16px] font-bold text-gray-900 mb-4">告诉AI哪里不好？</h3>
                <textarea
                  autoFocus
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="请输入您的建议..."
                  className="w-full h-32 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-[14px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all resize-none"
                />
                <div className="mt-2 px-1 flex items-start gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    建议将录入AI知识库，10-30秒后生效。
                  </p>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setShowFeedbackModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl text-[14px] font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      // 这里可以添加提交逻辑，例如调用 API
                      console.log('Feedback submitted:', feedbackText);
                      setShowFeedbackModal(false);
                      setFeedbackText('');
                    }}
                    className="flex-1 px-4 py-2.5 bg-gray-900 rounded-xl text-[14px] font-medium text-white hover:bg-gray-800 active:scale-95 transition-all shadow-lg shadow-black/10"
                  >
                    提交
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
