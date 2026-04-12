'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Loader2, MessageCircle, Mic, MicOff, X } from 'lucide-react';
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
  'Xin chao, toi la Warehouse AI. Bam micro va noi yeu cau de toi ho tro tao phieu thu chi nhanh hon.';

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
      toast.error('Co loi xay ra khi ket noi voi AI');
    } finally {
      setIsLoading(false);
    }
  };

  const startListening = () => {
    if (!isSupported || isLoading) return;

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      toast.error('Trinh duyet nay chua ho tro nhan dien giong noi');
      return;
    }

    recognitionRef.current?.stop();

    const recognition = new Recognition();
    recognition.lang = 'vi-VN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const spokenText = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? '')
        .join(' ')
        .trim();

      setTranscript(spokenText);

      if (!spokenText) {
        toast.error('Khong nghe ro noi dung, vui long thu lai');
        return;
      }

      void sendVoiceMessage(spokenText);
    };

    recognition.onerror = (event) => {
      if (event.error !== 'aborted') {
        toast.error('Khong the nhan giong noi, vui long thu lai');
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
    recognitionRef.current?.stop();
    setIsListening(false);
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
          aria-label="Mo tro ly giong noi"
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
              aria-label="Dong chatbot"
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
                Trinh duyet tren dien thoai nay chua ho tro voice chat.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                  {transcript
                    ? `Ban vua noi: "${transcript}"`
                    : 'Bam micro, noi yeu cau, he thong se tu gui ma khong can nhap tin nhan.'}
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
                      Dang xu ly yeu cau
                    </>
                  ) : isListening ? (
                    <>
                      <MicOff className="h-4 w-4" />
                      Dung ghi am
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4" />
                      Noi voi Warehouse AI
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
