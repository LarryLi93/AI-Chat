import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { MessageBubble } from './components/MessageBubble';
import { AssistantList } from './components/AssistantList';
import { Message, Role, ChatState, Attachment, Assistant } from './types';
import { geminiService } from './services/geminiService';
import { Camera, Keyboard as KeyboardIcon, Mic, X, AlertCircle, Plus, Brain, ArrowUp, Trash2, Loader2, FileText, BarChart3, FileSearch } from 'lucide-react';

const INITIAL_ASSISTANTS: Assistant[] = [
  {
    id: 'aura',
    name: 'Aura',
    description: '冷静、智慧且极简的AI伙伴。',
    avatar: 'bg-gradient-to-tr from-blue-400 to-indigo-500',
    color: 'bg-blue-500',
    instruction: 'You are Aura, a calm, intelligent, and minimalist AI assistant. Your tone is soothing and direct. Use Markdown. If you receive audio, respond in the language the user spoke in.'
  },
  {
    id: 'creative',
    name: 'Muse',
    description: '充满灵感的创意教练。',
    avatar: 'bg-gradient-to-tr from-purple-400 to-pink-500',
    color: 'bg-purple-500',
    instruction: 'You are Muse, a creative coach who loves metaphors and helping people think outside the box. Your tone is energetic and colorful.'
  },
  {
    id: 'analyst',
    name: 'Logic',
    description: '深度分析与逻辑推理专家。',
    avatar: 'bg-gradient-to-tr from-gray-600 to-gray-800',
    color: 'bg-gray-700',
    instruction: 'You are Logic, a rigorous analytical assistant. You focus on data, structure, and flawless reasoning. Your tone is professional and precise.'
  }
];

const WaveAnimation: React.FC<{ isCancel: boolean; barCount?: number; color?: string }> = ({ isCancel, barCount = 7, color }) => {
  const bars = Array.from({ length: barCount }).map(() => Math.random() * 0.8 + 0.2);
  return (
    <div className="flex items-center justify-center gap-1.5 h-8">
      {bars.map((delay, i) => (
        <div 
          key={i} 
          className={`wave-bar ${color ? color : (isCancel ? 'bg-red-400' : 'bg-blue-500')}`}
          style={{ animationDelay: `${delay}s`, width: '3px' }}
        />
      ))}
    </div>
  );
};

const App: React.FC = () => {
  const [assistants, setAssistants] = useState<Assistant[]>(INITIAL_ASSISTANTS);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isCancelTargeted, setIsCancelTargeted] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [isDeepThinking, setIsDeepThinking] = useState(false);
  const [isChartMode, setIsChartMode] = useState(false);
  const [isReportMode, setIsReportMode] = useState(false);
  const [view, setView] = useState<'chat' | 'assistants'>('chat');
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>(assistants[0].id);

  const selectedAssistant = assistants.find(a => a.id === selectedAssistantId) || assistants[0];

  const [state, setState] = useState<ChatState>({
    messages: [],
    isStreaming: false,
    error: null,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const touchStartY = useRef<number>(0);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [state.messages, scrollToBottom, view]);

  useEffect(() => {
    if (inputMode === 'text' && inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [input, inputMode]);

  const initSpeechRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'zh-CN';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setLiveTranscript(transcript);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    initSpeechRecognition();
  }, [initSpeechRecognition]);

  const handleAssistantSelect = (assistant: Assistant) => {
    setSelectedAssistantId(assistant.id);
    setState(prev => ({
      ...prev,
      messages: [],
      error: null
    }));
    setView('chat');
  };

  const handleUpdateAssistant = (updated: Assistant) => {
    setAssistants(prev => prev.map(a => a.id === updated.id ? updated : a));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files) as File[];
    
    const placeholders: Attachment[] = newFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      isLoading: true
    }));

    setAttachments(prev => [...prev, ...placeholders]);

    newFiles.forEach(async (file, index) => {
      const targetId = placeholders[index].id;
      const reader = new FileReader();
      
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setAttachments(prev => prev.map(att => 
          att.id === targetId 
            ? { ...att, data: base64, isLoading: false } 
            : att
        ));
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const getSupportedMimeType = () => {
    const types = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  };

  const processSend = async (textOverride?: string, audioData?: { data: string, mimeType: string }) => {
    const finalInput = textOverride !== undefined ? textOverride : input;
    const validAttachments = attachments.filter(a => !a.isLoading && a.data);
    
    if (!finalInput.trim() && !audioData && validAttachments.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      content: (audioData && !textOverride) ? "语音消息 🎤" : finalInput.trim(),
      timestamp: Date.now(),
      attachments: validAttachments.length > 0 ? [...validAttachments] : undefined,
    };

    const modelPlaceholder: Message = {
      id: (Date.now() + 1).toString(),
      role: Role.MODEL,
      content: '',
      timestamp: Date.now(),
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage, modelPlaceholder],
      isStreaming: true,
      error: null,
    }));
    
    setInput('');
    setAttachments([]);
    setLiveTranscript('');

    try {
      let fullContent = '';
      const stream = geminiService.streamChat(
        state.messages, 
        finalInput.trim(), 
        selectedAssistant.instruction,
        validAttachments, 
        audioData,
        {
          isDeepThinking,
          isChartMode,
          isReportMode
        }
      );
      
      for await (const chunk of stream) {
        fullContent += chunk;
        setState(prev => {
          const newMessages = [...prev.messages];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.role === Role.MODEL) {
            lastMessage.content = fullContent;
          }
          return { ...prev, messages: newMessages };
        });
      }
    } catch (err) {
      setState(prev => ({ ...prev, error: 'There was an unexpected error. Finish what you were doing.' }));
    } finally {
      setState(prev => ({ ...prev, isStreaming: false }));
    }
  };

  const startRecording = async (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (state.isStreaming) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start();
      setLiveTranscript('');
      if (recognitionRef.current) {
        try { recognitionRef.current.start(); } catch(err) {}
      }
      
      setIsRecording(true);
      setIsCancelTargeted(false);
      
      if ('touches' in e) {
        touchStartY.current = (e as React.TouchEvent).touches[0].clientY;
      } else {
        touchStartY.current = (e as React.MouseEvent).clientY;
      }
      
      if (window.navigator.vibrate) window.navigator.vibrate(10);
    } catch (err: any) {
      setState(prev => ({ ...prev, error: '无法访问麦克风。' }));
    }
  };

  const handlePointerMove = (currentY: number) => {
    if (!isRecording) return;
    const diff = touchStartY.current - currentY;
    if (diff > 80) {
      setIsCancelTargeted(true);
    } else {
      setIsCancelTargeted(false);
    }
  };

  const stopRecording = (shouldSend: boolean = true) => {
    if (!mediaRecorderRef.current || !isRecording) {
      setIsRecording(false);
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
    }

    mediaRecorderRef.current.onstop = async () => {
      if (shouldSend && !isCancelTargeted && (audioChunksRef.current.length > 0 || liveTranscript)) {
        const audioBlob = audioChunksRef.current.length > 0 
          ? new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' }) 
          : null;
        
        if (audioBlob) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Audio = (reader.result as string).split(',')[1];
            processSend(liveTranscript || undefined, { 
              data: base64Audio, 
              mimeType: audioBlob.type 
            });
          };
          reader.readAsDataURL(audioBlob);
        } else {
          processSend(liveTranscript);
        }
      }
      mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorderRef.current.stop();
    setIsRecording(false);
    setIsCancelTargeted(false);
  };

  const clearChat = () => {
    setState(prev => ({
      ...prev,
      messages: [],
      error: null
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      processSend();
    }
  };

  return (
    <div 
      className="flex flex-col h-[100dvh] max-w-md mx-auto bg-[#fafafa] relative overflow-hidden shadow-2xl"
      onMouseMove={(e) => handlePointerMove(e.clientY)}
      onMouseUp={() => { if(isRecording) stopRecording(); }}
    >
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-20%] w-[80%] h-[40%] bg-blue-50 rounded-full blur-[100px] opacity-60 z-0" />
      <div className="absolute bottom-[-5%] right-[-10%] w-[60%] h-[30%] bg-purple-50 rounded-full blur-[80px] opacity-50 z-0" />

      {/* Main Viewport for Transitions */}
      <div className="relative flex-1 overflow-hidden">
        {view === 'assistants' ? (
          <AssistantList 
            assistants={assistants} 
            selectedId={selectedAssistantId}
            onSelect={handleAssistantSelect}
            onUpdate={handleUpdateAssistant}
            onBack={() => setView('chat')}
          />
        ) : (
          <Layout 
            assistantName={selectedAssistant.name} 
            assistantAvatar={selectedAssistant.avatar}
            onSwitchClick={() => setView('assistants')}
          >
            {/* Message Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 pt-4 pb-48 no-scrollbar relative z-10"
            >
              {state.messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-10 animate-fade-in">
                  <div className={`w-20 h-20 rounded-3xl ${selectedAssistant.avatar} mb-6 flex items-center justify-center text-white text-3xl font-bold shadow-2xl shadow-blue-100 animate-breathe`}>
                    {selectedAssistant.name.charAt(0)}
                  </div>
                  <h2 className="text-2xl font-outfit font-bold text-gray-800 mb-2">我是 {selectedAssistant.name}</h2>
                  <p className="text-gray-400 max-w-xs font-light">{selectedAssistant.description}</p>
                </div>
              )}
              {state.messages.map((msg, index) => (
                <MessageBubble 
                  key={msg.id} 
                  message={msg} 
                  senderName={msg.role === Role.USER ? 'You' : selectedAssistant.name}
                  isLast={index === state.messages.length - 1} 
                />
              ))}
              {state.error && (
                <div className="flex items-center gap-2 justify-center p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-medium mb-8 border border-red-100 mx-4">
                  <AlertCircle size={14} />
                  {state.error}
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-[#fafafa]/90 backdrop-blur-lg z-20">
              {/* Toolbar Area */}
              <div className={`flex items-center justify-between mb-3 transition-opacity duration-300 ${isRecording ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  <button 
                    onClick={() => setIsDeepThinking(!isDeepThinking)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-tight transition-all duration-300 border ${
                      isDeepThinking 
                        ? 'bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-200' 
                        : 'bg-white/90 text-gray-400 border-gray-100 backdrop-blur-md'
                    }`}
                  >
                    <Brain size={12} className={isDeepThinking ? "animate-pulse" : ""} />
                    深度思考
                  </button>

                  <button 
                    onClick={() => setIsChartMode(!isChartMode)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-tight transition-all duration-300 border ${
                      isChartMode 
                        ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-200' 
                        : 'bg-white/90 text-gray-400 border-gray-100 backdrop-blur-md'
                    }`}
                  >
                    <BarChart3 size={12} />
                    图表
                  </button>

                  <button 
                    onClick={() => setIsReportMode(!isReportMode)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-tight transition-all duration-300 border ${
                      isReportMode 
                        ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-200' 
                        : 'bg-white/90 text-gray-400 border-gray-100 backdrop-blur-md'
                    }`}
                  >
                    <FileSearch size={12} />
                    报告
                  </button>
                </div>

                <button 
                  onClick={clearChat}
                  className="flex items-center justify-center p-2 rounded-full transition-all duration-300 border bg-white/90 text-gray-400 border-gray-100 backdrop-blur-md hover:text-red-500 active:scale-95 ml-2"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {attachments.length > 0 && !isRecording && (
                <div className="flex gap-3 overflow-x-auto no-scrollbar mb-4 px-1 py-1 items-center">
                  {attachments.map((att) => (
                    <div key={att.id} className="relative flex-shrink-0 animate-in fade-in zoom-in duration-300">
                      <div className="w-16 h-16 rounded-2xl border border-gray-100 bg-white shadow-sm flex items-center justify-center overflow-hidden">
                        {att.isLoading ? (
                          <div className="flex flex-col items-center justify-center gap-1">
                            <Loader2 size={16} className="text-blue-500 animate-spin" />
                          </div>
                        ) : att.mimeType.startsWith('image/') ? (
                          <img 
                            src={`data:${att.mimeType};base64,${att.data}`} 
                            className="w-full h-full object-cover"
                            alt="preview"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-1 p-2">
                            <FileText size={18} className="text-gray-400" />
                            <span className="text-[8px] text-gray-500 line-clamp-1 break-all px-1 text-center font-medium">{att.name}</span>
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => removeAttachment(att.id)}
                        className="absolute -top-1.5 -right-1.5 bg-white text-gray-800 rounded-full p-1 shadow-md border border-gray-100 transition-all active:scale-90"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className={`bg-white rounded-[32px] shadow-lg border border-gray-100 flex items-center px-3 py-1.5 gap-2 transition-all duration-300 min-h-[60px] ${isRecording ? 'scale-[0.98] opacity-50' : ''}`}>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" accept="image/*" />
                <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-gray-800 hover:text-black transition-colors flex-shrink-0">
                  <Camera size={24} strokeWidth={1.8} />
                </button>
                
                <div className="flex-1 flex justify-center items-center px-1 overflow-hidden min-h-[44px]">
                  {inputMode === 'voice' ? (
                    <button
                      onTouchStart={startRecording}
                      onTouchEnd={() => stopRecording()}
                      onMouseDown={startRecording}
                      className={`w-full h-[44px] flex items-center justify-center rounded-full text-[17px] font-medium text-gray-900 select-none transition-all active:scale-[0.98] leading-normal ${isRecording ? 'bg-gray-100' : 'bg-transparent'}`}
                    >
                      按住 说话
                    </button>
                  ) : (
                    <textarea
                      ref={inputRef} autoFocus rows={1} value={input} onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown} placeholder="输入消息..."
                      className="w-full py-2.5 bg-transparent border-none focus:ring-0 text-[17px] text-gray-900 placeholder:text-gray-400 resize-none no-scrollbar outline-none font-light leading-relaxed align-middle"
                      style={{ minHeight: '44px', maxHeight: '120px' }}
                    />
                  )}
                </div>

                <button 
                  onClick={() => setInputMode(inputMode === 'voice' ? 'text' : 'voice')} 
                  className={`p-2.5 transition-all flex-shrink-0 ${inputMode === 'text' ? 'text-blue-500' : 'text-gray-800'}`}
                >
                  {inputMode === 'voice' ? <KeyboardIcon size={24} strokeWidth={1.8} /> : <Mic size={24} strokeWidth={1.8} />}
                </button>
              </div>
            </div>
          </Layout>
        )}
      </div>

      {/* Full Screen Recording Overlay */}
      {isRecording && (
        <div 
          className="fixed inset-0 z-[100] glass-effect bg-white/40 backdrop-blur-2xl flex flex-col items-center justify-end animate-fade-in"
          onTouchMove={(e) => handlePointerMove(e.touches[0].clientY)}
          onMouseMove={(e) => handlePointerMove(e.clientY)}
        >
          <div className={`w-full h-[70%] rounded-t-[60px] flex flex-col items-center justify-center transition-all duration-500 relative ${
            isCancelTargeted ? 'bg-red-50/80' : 'bg-blue-50/40'
          }`}>
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full blur-[120px] opacity-40 animate-breathe ${
              isCancelTargeted ? 'bg-red-400' : 'bg-blue-400'
            }`}></div>

            <div className="mb-8 relative z-10">
              <div className={`w-28 h-28 rounded-full border-2 flex items-center justify-center animate-breathe shadow-xl ${
                isCancelTargeted ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-white'
              }`}>
                <Mic size={48} className={isCancelTargeted ? "text-red-500" : "text-blue-500"} />
              </div>
            </div>

            <div className="flex flex-col items-center gap-6 z-10 px-10 text-center">
              <div className={`text-[20px] font-outfit font-medium tracking-tight ${isCancelTargeted ? 'text-red-600' : 'text-gray-900'}`}>
                {isCancelTargeted ? '松开手指，取消发送' : '松手发送，上移取消'}
              </div>
              
              <div className="min-h-[60px] flex flex-col items-center gap-2">
                {liveTranscript ? (
                  <p className="text-[15px] text-gray-900 font-light leading-relaxed animate-fade-in line-clamp-3 bg-white/40 px-4 py-2 rounded-2xl backdrop-blur-sm">
                    "{liveTranscript}"
                  </p>
                ) : (
                  <div className="flex items-center gap-1.5 opacity-30">
                    <ArrowUp size={14} className="animate-bounce" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-900">Swipe Up To Cancel</span>
                  </div>
                )}
              </div>

              <WaveAnimation isCancel={isCancelTargeted} barCount={18} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;