import { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface WorkshopProps {
  onBack: () => void;
}

export function Workshop({ onBack }: WorkshopProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm your AI workshop assistant. I can help you break down tasks, suggest improvements, provide motivation, and answer questions about productivity. What would you like to work on?"
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const outerContainerRef = useRef<HTMLDivElement>(null);

  // Log layout on mount and window resize
  useEffect(() => {
    // #region agent log
    const logLayout = () => {
      if (inputContainerRef.current && outerContainerRef.current) {
        const inputRect = inputContainerRef.current.getBoundingClientRect();
        const outerRect = outerContainerRef.current.getBoundingClientRect();
        const inputComputed = window.getComputedStyle(inputContainerRef.current);
        const outerComputed = window.getComputedStyle(outerContainerRef.current);
        fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Workshop.tsx:useEffect:layout',message:'Layout dimensions check',data:{inputTop:inputRect.top,inputBottom:inputRect.bottom,inputHeight:inputRect.height,outerTop:outerRect.top,outerBottom:outerRect.bottom,outerHeight:outerRect.height,windowHeight:window.innerHeight,isInputVisible:inputRect.top < window.innerHeight && inputRect.bottom > 0,inputComputedPosition:inputComputed.position,outerComputedOverflow:outerComputed.overflow},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      }
    };
    logLayout();
    window.addEventListener('resize', logLayout);
    return () => window.removeEventListener('resize', logLayout);
    // #endregion
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    // #region agent log
    setTimeout(() => {
      if (inputContainerRef.current) {
        const rect = inputContainerRef.current.getBoundingClientRect();
        const computed = window.getComputedStyle(inputContainerRef.current);
        const parentRect = inputContainerRef.current.parentElement?.getBoundingClientRect();
        fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Workshop.tsx:useEffect:messages',message:'Input container visibility after message change',data:{messagesCount:messages.length,isLoading,hasInputContainer:!!inputContainerRef.current,top:rect.top,bottom:rect.bottom,height:rect.height,width:rect.width,isVisible:rect.top < window.innerHeight && rect.bottom > 0,computedDisplay:computed.display,computedVisibility:computed.visibility,computedZIndex:computed.zIndex,parentTop:parentRect?.top,parentBottom:parentRect?.bottom,parentHeight:parentRect?.height,windowHeight:window.innerHeight},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      }
    }, 100);
    // #endregion
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
    }
  }, [inputMessage]);

  const handleSend = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage.trim()
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      // Get current user session
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      // Build conversation history for API (excluding system message)
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Call the API endpoint
      const response = await fetch('/api/workshop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: conversationHistory,
          userId: user.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Add assistant response
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error calling workshop API:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please make sure the OpenAI API key is configured correctly.`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div 
      className="relative shrink-0 w-full flex flex-col" 
      style={{ height: '100vh', maxHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#110c10' }}
      // #region agent log
      ref={(el) => {
        if (el) {
          outerContainerRef.current = el;
          setTimeout(() => {
            const rect = el.getBoundingClientRect();
            const computed = window.getComputedStyle(el);
            fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Workshop.tsx:outerContainer:render',message:'Outer container dimensions',data:{height:rect.height,width:rect.width,top:rect.top,bottom:rect.bottom,computedHeight:computed.height,computedMaxHeight:computed.maxHeight,windowHeight:window.innerHeight},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'D'})}).catch(()=>{});
          }, 50);
        }
      }}
      // #endregion
    >
      <div className="w-full flex flex-col flex-1 min-h-0 overflow-hidden" style={{ backgroundColor: '#110c10' }}>
        {/* Header */}
        <div className="content-stretch flex items-center gap-[16px] relative shrink-0 w-full px-[20px] pt-[20px] pb-[20px]">
          <div 
            className="relative shrink-0 size-[32px] cursor-pointer"
            onClick={onBack}
          >
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
              <g>
                <path 
                  d="M20 8L12 16L20 24" 
                  stroke="#E1E6EE" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                />
              </g>
            </svg>
          </div>
          <div className="content-stretch flex flex-col items-start relative shrink-0">
            <p className="font-['Inter:Medium',sans-serif] font-medium leading-[1.5] not-italic relative shrink-0 text-[28px] text-nowrap text-white tracking-[-0.308px] whitespace-pre">Workshop</p>
          </div>
        </div>

        {/* Messages Container - Scrollable */}
        <div className="flex-1 w-full flex flex-col relative min-h-0 overflow-hidden px-[20px]" style={{ backgroundColor: '#110c10' }}>
          <div className="flex-1 overflow-y-auto flex flex-col gap-[16px] pb-4" style={{ WebkitOverflowScrolling: 'touch', overflowY: 'scroll', paddingBottom: '100px' }}>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-[12px] px-[16px] py-[12px] ${
                    message.role === 'user'
                      ? 'bg-[#0B64F9] text-white'
                      : 'bg-[#1f2022] text-[#E1E6EE] border border-[#2a2b2d]'
                  }`}
                >
                  <p 
                    className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] text-[16px] whitespace-pre-wrap break-words"
                    style={{ 
                      color: message.role === 'user' ? '#FFFFFF' : '#E1E6EE'
                    }}
                    ref={(el) => {
                      // #region agent log
                      if (el) {
                        const computedStyle = window.getComputedStyle(el);
                        const parentEl = el.parentElement;
                        const parentComputedStyle = parentEl ? window.getComputedStyle(parentEl) : null;
                        fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Workshop.tsx:message:p:render',message:'Message text styling check',data:{role:message.role,contentLength:message.content.length,elementColor:computedStyle.color,elementTextColor:computedStyle.color,parentColor:parentComputedStyle?.color,parentTextColor:parentComputedStyle?.color,inlineStyle:el.getAttribute('style'),hasTextWhite:el.classList.contains('text-white'),hasTextColor:el.classList.contains('text-[#E1E6EE]')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                      }
                      // #endregion
                    }}
                  >
                    {message.content}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#1f2022] border border-[#2a2b2d] rounded-[12px] px-[16px] py-[12px]">
                  <div className="flex gap-[4px]">
                    <div 
                      className="w-2 h-2 bg-[#E1E6EE] rounded-full" 
                      style={{ 
                        animation: 'bounce 1.4s infinite',
                        animationDelay: '0ms'
                      }}
                    ></div>
                    <div 
                      className="w-2 h-2 bg-[#E1E6EE] rounded-full" 
                      style={{ 
                        animation: 'bounce 1.4s infinite',
                        animationDelay: '200ms'
                      }}
                    ></div>
                    <div 
                      className="w-2 h-2 bg-[#E1E6EE] rounded-full" 
                      style={{ 
                        animation: 'bounce 1.4s infinite',
                        animationDelay: '400ms'
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
            {/* Spacer to prevent cutoff */}
            <div className="w-full" style={{ height: '20px' }} />
          </div>
        </div>

        {/* Input Area - Fixed at bottom, outside scrollable area */}
        <div 
          className="flex gap-[8px] items-end w-full shrink-0 px-[20px] pt-[16px] pb-[20px]"
          style={{ position: 'fixed', bottom: '0', left: '0', right: '0', width: '100%', backgroundColor: '#110c10', borderTop: '1px solid rgba(225,230,238,0.1)', zIndex: 999 }}
          // #region agent log
          ref={(el) => {
            if (el) {
              inputContainerRef.current = el;
              setTimeout(() => {
                const rect = el.getBoundingClientRect();
                const computed = window.getComputedStyle(el);
                const parentRect = el.parentElement?.getBoundingClientRect();
                fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Workshop.tsx:inputContainer:render',message:'Input container render check',data:{top:rect.top,bottom:rect.bottom,height:rect.height,width:rect.width,isVisible:rect.top < window.innerHeight && rect.bottom > 0,computedDisplay:computed.display,computedPosition:computed.position,computedZIndex:computed.zIndex,computedPaddingBottom:computed.paddingBottom,parentTop:parentRect?.top,parentBottom:parentRect?.bottom,parentHeight:parentRect?.height,windowHeight:window.innerHeight,viewportBottom:window.innerHeight},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
              }, 50);
            }
          }}
          // #endregion
        >
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 bg-[rgba(225,230,238,0.1)] border border-transparent rounded-[12px] px-[16px] py-[12px] font-['Inter:Regular',sans-serif] text-[16px] resize-none focus:outline-none focus:border-[rgba(225,230,238,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              minHeight: '48px', 
              maxHeight: '120px',
              color: '#FFFFFF',
              caretColor: '#FFFFFF'
            }}
          />
          <button
            onClick={handleSend}
            disabled={!inputMessage.trim() || isLoading}
            className="bg-[rgba(225,230,238,0.1)] box-border content-stretch flex gap-[4px] items-center justify-center px-[16px] py-[4px] relative rounded-[100px] shrink-0 cursor-pointer hover:bg-[rgba(225,230,238,0.15)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#e1e6ee] text-[18px] text-nowrap tracking-[-0.198px] whitespace-pre">Send</p>
          </button>
        </div>
      </div>
    </div>
  );
}

