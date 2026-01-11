
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message, Role } from '../types';
import { FileText, ChevronDown, ChevronUp, Brain, Loader2, Play, Trash2, XCircle, Terminal } from 'lucide-react';
import { ChartRenderer } from './ChartRenderer';

interface MessageBubbleProps {
  message: Message;
  senderName: string;
  isLast?: boolean;
}

const ExecutableCodeBlock: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const [output, setOutput] = useState<{ type: 'log' | 'error' | 'warn'; content: string }[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showOutput, setShowOutput] = useState(false);

  const runCode = async () => {
    if (language !== 'javascript' && language !== 'js' && language !== 'typescript' && language !== 'ts') {
      setOutput([{ type: 'error', content: `Execution is only supported for JavaScript/TypeScript in this environment.` }]);
      setShowOutput(true);
      return;
    }

    setIsRunning(true);
    setShowOutput(true);
    const logs: { type: 'log' | 'error' | 'warn'; content: string }[] = [];

    // Capture console output
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args: any[]) => {
      logs.push({ type: 'log', content: args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ') });
    };
    console.error = (...args: any[]) => {
      logs.push({ type: 'error', content: args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ') });
    };
    console.warn = (...args: any[]) => {
      logs.push({ type: 'warn', content: args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ') });
    };

    try {
      // Create an async function context to allow 'await' in the code
      const execute = new Function(`return (async () => { ${code} })()`);
      await execute();
    } catch (err: any) {
      logs.push({ type: 'error', content: err.message || String(err) });
    } finally {
      // Restore console
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      
      setOutput(logs.length > 0 ? logs : [{ type: 'log', content: '(Execution finished with no output)' }]);
      setIsRunning(false);
    }
  };

  return (
    <div className="relative my-5 group overflow-hidden rounded-2xl border border-black/10 shadow-lg text-left">
      <div className="absolute top-3 right-3 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={runCode}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-[11px] font-bold uppercase tracking-wider shadow-lg transition-all active:scale-95 disabled:opacity-50"
        >
          {isRunning ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
          Run
        </button>
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

      {showOutput && (
        <div className="bg-[#121212] border-t border-white/5 p-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em]">
              <Terminal size={12} />
              Output
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setOutput([])} 
                className="p-1 hover:text-white text-gray-500 transition-colors"
                title="Clear output"
              >
                <Trash2 size={14} />
              </button>
              <button 
                onClick={() => setShowOutput(false)} 
                className="p-1 hover:text-white text-gray-500 transition-colors"
                title="Close output"
              >
                <XCircle size={14} />
              </button>
            </div>
          </div>
          <div className="font-mono text-[12px] space-y-1 max-h-[200px] overflow-y-auto no-scrollbar">
            {output.map((line, i) => (
              <div 
                key={i} 
                className={`whitespace-pre-wrap break-all ${
                  line.type === 'error' ? 'text-red-400' : 
                  line.type === 'warn' ? 'text-amber-400' : 
                  'text-green-400/90'
                }`}
              >
                {line.type === 'log' ? '> ' : ''}{line.content}
              </div>
            ))}
            {isRunning && (
              <div className="flex items-center gap-2 text-blue-400/70 italic">
                <Loader2 size={12} className="animate-spin" />
                Executing...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ThinkingProcess: React.FC<{ content: string; isStreaming?: boolean }> = ({ content, isStreaming }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const wasStreaming = useRef(isStreaming);

  useEffect(() => {
    if (content.length > 0 && isStreaming) {
      setIsExpanded(true);
    }
    // Automatically collapse when streaming finishes
    if (wasStreaming.current && !isStreaming) {
      setIsExpanded(false);
    }
    wasStreaming.current = isStreaming;
  }, [content.length, isStreaming]);

  return (
    <div className="mb-4 overflow-hidden border-l-2 border-blue-200/50 pl-4 py-1 text-left">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-[11px] font-bold text-blue-500/70 uppercase tracking-widest transition-colors hover:text-blue-600"
      >
        <Brain size={12} className={isStreaming ? "animate-pulse" : ""} />
        <span>思考过程</span>
        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {isExpanded && (
        <div className="mt-2 text-[13px] text-gray-500/80 leading-relaxed font-light italic animate-in fade-in slide-in-from-top-1 duration-300">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm, remarkMath]} 
            rehypePlugins={[rehypeKatex]}
            components={{
              pre({ children }) {
                const codeChild = React.Children.toArray(children)[0] as any;
                const isChart = codeChild?.props?.className?.includes('language-chart');
                const isCodeBlock = codeChild?.props?.className?.includes('language-');
                
                if (isChart || isCodeBlock) {
                  return <>{children}</>;
                }
                return <pre>{children}</pre>;
              },
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                if (!inline && match && match[1] === 'chart') {
                  return <ChartRenderer json={String(children).replace(/\n$/, '')} />;
                }
                if (!inline && match) {
                  return <ExecutableCodeBlock code={String(children).replace(/\n$/, '')} language={match[1]} />;
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
          </ReactMarkdown>
          {isStreaming && <span className="inline-block w-1.5 h-3 ml-1 bg-blue-400/50 animate-pulse" />}
        </div>
      )}
    </div>
  );
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, senderName, isLast }) => {
  const isUser = message.role === Role.USER;

  if (!isUser && !message.content.trim()) {
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

  const thoughtRegex = /<thought>([\s\S]*?)(?:<\/thought>|$)/i;
  const thoughtMatch = message.content.match(thoughtRegex);
  const thoughtContent = thoughtMatch ? thoughtMatch[1] : null;
  
  const hasClosingTag = message.content.includes('</thought>');
  const mainContent = hasClosingTag 
    ? message.content.split('</thought>')[1].trim()
    : (thoughtMatch ? '' : message.content.trim());

  return (
    <div className={`flex w-full mb-5 animate-in fade-in slide-in-from-bottom-2 duration-500 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[96%] ${isUser ? 'text-right' : 'text-left'}`}>
        
        <div className={`mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400/80 px-1 ${isUser ? 'mr-1' : 'ml-1'}`}>
          {senderName}
        </div>

        <div className={`
          relative px-5 py-3.5 text-left
          ${isUser 
            ? 'bg-blue-50 border border-blue-100/50 rounded-[26px] rounded-tr-none text-gray-900 shadow-sm' 
            : 'bg-white border border-gray-100 rounded-[26px] rounded-tl-none text-gray-800 shadow-sm'
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
            />
          )}

          {(mainContent || (isLast && hasClosingTag)) && (
            <div className={`prose-aura ${isUser ? 'text-gray-900 font-medium' : 'text-gray-800'}`}>
              <ReactMarkdown 
                remarkPlugins={[remarkGfm, remarkMath]} 
                rehypePlugins={[rehypeKatex]}
                components={{
                  pre({ children }) {
                    const codeChild = React.Children.toArray(children)[0] as any;
                    const isChart = codeChild?.props?.className?.includes('language-chart');
                    const isCodeBlock = codeChild?.props?.className?.includes('language-');
                    
                    if (isChart || isCodeBlock) {
                      return <>{children}</>;
                    }
                    return <pre>{children}</pre>;
                  },
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    if (!inline && match && match[1] === 'chart') {
                      return <ChartRenderer json={String(children).replace(/\n$/, '')} />;
                    }
                    if (!inline && match) {
                      return <ExecutableCodeBlock code={String(children).replace(/\n$/, '')} language={match[1]} />;
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
              </ReactMarkdown>
              {!isUser && isLast && mainContent === '' && hasClosingTag && (
                <span className="inline-block w-1.5 h-3 bg-blue-400/50 animate-pulse" />
              )}
            </div>
          )}
        </div>

        <div className={`mt-2 text-[9px] font-bold uppercase tracking-widest opacity-20 ${isUser ? 'mr-2' : 'ml-2'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};
