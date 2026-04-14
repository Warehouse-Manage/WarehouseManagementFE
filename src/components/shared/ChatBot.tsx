'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Loader2, MessageCircle, Mic, MicOff, Trash2, X } from 'lucide-react';
import { chatApi } from '@/api/chatApi';
import { toast } from 'sonner';

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const DEFAULT_GREETING =
  'Xin chào, tôi là Warehouse AI. Bấm micro và nói yêu cầu để tôi hỗ trợ tạo phiếu thu chi nhanh hơn.';

export default function ChatBot() {
  const [isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: DEFAULT_GREETING,
      isBot: true,
      timestamp: new Date(),
    },
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef<string>('');
  const latestTranscriptRef = useRef<string>('');
  const isStoppedRef = useRef<boolean>(false);

  useEffect(() => {
    setIsMounted(true);

    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor;
      const mobileDevice =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) ||
        window.innerWidth < 768 ||
        navigator.maxTouchPoints > 1;
      setIsMobile(mobileDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(Boolean(Recognition));

    return () => {
      window.removeEventListener('resize', checkMobile);
      recognitionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const sendVoiceMessage = async (spokenText: string) => {
    const cleanText = spokenText.trim();
    if (!cleanText || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: cleanText,
      isBot: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setTranscript(cleanText);
    setIsLoading(true);

    try {
      const response = await chatApi.chat(cleanText);

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: response.reply,
        isBot: true,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);
      if (response.isActionTaken) {
        toast.success(response.reply);
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Có lỗi xảy ra khi kết nối với AI');
    } finally {
      setIsLoading(false);
    }
  };

  const startListening = () => {
    if (!isSupported || isLoading) return;

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      toast.error('Trình duyệt này chưa hỗ trợ nhận diện giọng nói');
      return;
    }

    recognitionRef.current?.stop();

    const recognition = new Recognition();
    recognition.lang = 'vi-VN';
    recognition.continuous = true;
    recognition.interimResults = true;

    finalTranscriptRef.current = '';
    latestTranscriptRef.current = '';
    isStoppedRef.current = false;

    recognition.onresult = (event) => {
      if (isStoppedRef.current) return;
      let interimText = '';
      let finalText = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? '';
        if (result.isFinal) {
          finalText += text + ' ';
        } else {
          interimText += text;
        }
      }

      if (finalText) {
        finalTranscriptRef.current = finalText.trim();
      }

      const displayText = (finalTranscriptRef.current + ' ' + interimText).trim();
      latestTranscriptRef.current = displayText;
      setTranscript(displayText);
    };

    recognition.onerror = (event) => {
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        toast.error('Không thể nhận giọng nói, vui lòng thử lại');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setTranscript('');
    setIsListening(true);
    recognition.start();
  };

  const stopListening = () => {
    isStoppedRef.current = true;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);

    const spokenText = (finalTranscriptRef.current || latestTranscriptRef.current).trim();
    finalTranscriptRef.current = '';
    latestTranscriptRef.current = '';
    setTranscript('');

    if (!spokenText) {
      toast.error('Không nghe rõ nội dung, vui lòng thử lại');
      return;
    }

    void sendVoiceMessage(spokenText);
  };

  const handleClearTranscript = () => {
    // Reset ngay lập tức trên UI
    finalTranscriptRef.current = '';
    latestTranscriptRef.current = '';
    setTranscript('');

    // Nếu đang nghe, phải restart engine để clear buffer của browser
    if (isListening && recognitionRef.current) {
      isStoppedRef.current = true;
      recognitionRef.current.stop();
      recognitionRef.current = null;
      
      // Khởi động lại sau một khoảng thời gian ngắn để engine kịp đóng hẳn
      setTimeout(() => {
        startListening();
      }, 100);
    }
  };

  if (!isMounted || !isMobile) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 md:hidden">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-orange-600 to-orange-500 text-white shadow-xl transition-all hover:scale-110 hover:shadow-orange-200 active:scale-95"
          aria-label="Mở trợ lý giọng nói"
        >
          <MessageCircle className="h-7 w-7 transition-all group-hover:rotate-12" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex h-4 w-4 rounded-full bg-orange-500"></span>
          </span>
        </button>
      )}

      {isOpen && (
        <div className="flex h-[min(78vh,560px)] w-[min(92vw,380px)] flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white/95 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in slide-in-from-bottom-10 duration-300">
          <div className="flex items-center justify-between bg-gradient-to-r from-orange-600 to-orange-500 p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold tracking-tight">Warehouse AI Voice</h3>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-green-400"></span>
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Mobile only</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
              aria-label="Đóng chatbot"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-gray-50/50 p-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm ${
                    msg.isBot
                      ? 'rounded-tl-none border border-gray-100 bg-white text-gray-800'
                      : 'rounded-tr-none bg-orange-600 text-white'
                  }`}
                >
                  {msg.text}
                  <div
                    className={`mt-1 text-[10px] opacity-50 ${
                      msg.isBot ? 'text-gray-500' : 'text-orange-100'
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-tl-none border border-gray-100 bg-white p-3 text-gray-800 shadow-sm">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-600"></span>
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-600 [animation-delay:0.2s]"></span>
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-600 [animation-delay:0.4s]"></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t bg-white p-4">
            {!isSupported ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Trình duyệt trên điện thoại này chưa hỗ trợ voice chat.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-2xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                  <div className="pr-8">
                    {transcript
                      ? `Bạn đang nói: "${transcript}"`
                      : 'Bấm micro, nói yêu cầu, hệ thống sẽ tự gửi mà không cần nhập tin nhắn.'}
                  </div>
                  {transcript && !isLoading && (
                    <button
                      onClick={handleClearTranscript}
                      className="absolute right-2 top-2 p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                      title="Xóa nội dung đang nói"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <button
                  onClick={isListening ? stopListening : startListening}
                  disabled={isLoading}
                  className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
                    isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-600 hover:bg-orange-700'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang xử lý yêu cầu
                    </>
                  ) : isListening ? (
                    <>
                      <MicOff className="h-4 w-4" />
                      Dừng ghi âm
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4" />
                      Nói với Warehouse AI
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
