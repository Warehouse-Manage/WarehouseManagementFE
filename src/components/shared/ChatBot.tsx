'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bot, Loader2, MessageCircle, Mic, MicOff, X } from 'lucide-react';
import { toast } from 'sonner';

import { chatApi } from '@/api/chatApi';

type Message = {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: number;
};

type RecognitionResult = SpeechRecognitionResultList[number];

interface SpeechRecognitionEventLike extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
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

const LOGIN_PATHS = new Set(['/login']);
const MOBILE_BREAKPOINT = 768;
const DEFAULT_GREETING =
  'Xin chào, tôi là Warehouse AI. Bấm micro rồi nói yêu cầu, tôi sẽ gửi nội dung lên hệ thống để hỗ trợ nhanh hơn.';

function getRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function isMobileViewport() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.innerWidth < MOBILE_BREAKPOINT;
}

function createMessage(text: string, isBot: boolean): Message {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    isBot,
    timestamp: Date.now(),
  };
}

function extractTranscript(results: SpeechRecognitionResultList) {
  let finalText = '';
  let interimText = '';

  for (let index = 0; index < results.length; index += 1) {
    const result = results[index] as RecognitionResult;
    const text = result[0]?.transcript?.trim() ?? '';

    if (!text) {
      continue;
    }

    if (result.isFinal) {
      finalText = `${finalText} ${text}`.trim();
    } else {
      interimText = `${interimText} ${text}`.trim();
    }
  }

  return {
    finalText,
    previewText: `${finalText} ${interimText}`.trim(),
  };
}

export default function ChatBot() {
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const transcriptRef = useRef('');
  const shouldSubmitRef = useRef(false);

  const [isReady, setIsReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => [createMessage(DEFAULT_GREETING, true)]);

  const isHiddenRoute = useMemo(() => LOGIN_PATHS.has(pathname), [pathname]);
  const isSupported = useMemo(() => isReady && Boolean(getRecognitionConstructor()), [isReady]);

  useEffect(() => {
    setIsReady(true);
    setIsMobile(isMobileViewport());

    const handleResize = () => {
      const mobile = isMobileViewport();
      setIsMobile(mobile);

      if (!mobile) {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!scrollRef.current) {
      return;
    }

    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isHiddenRoute) {
      return;
    }

    setIsOpen(false);
    setDraftText('');
    setIsListening(false);
    transcriptRef.current = '';
    shouldSubmitRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, [isHiddenRoute]);

  useEffect(() => {
    return () => {
      shouldSubmitRef.current = false;
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  const sendMessage = async (content: string) => {
    const text = content.trim();
    if (!text || isLoading) {
      return;
    }

    setMessages((current) => [...current, createMessage(text, false)]);
    setDraftText('');
    transcriptRef.current = '';
    setIsLoading(true);

    try {
      const response = await chatApi.chat(text);

      setMessages((current) => [...current, createMessage(response.reply, true)]);

      if (response.isActionTaken) {
        toast.success(response.reply);
      }
    } catch (error) {
      console.error('ChatBot error:', error);
      toast.error('Không thể kết nối tới Warehouse AI.');
    } finally {
      setIsLoading(false);
    }
  };

  const stopRecognition = (shouldSubmit: boolean) => {
    shouldSubmitRef.current = shouldSubmit;
    recognitionRef.current?.stop();
  };

  const startListening = () => {
    const Recognition = getRecognitionConstructor();

    if (!Recognition || isLoading || isListening) {
      return;
    }

    transcriptRef.current = '';
    shouldSubmitRef.current = false;
    setDraftText('');

    const recognition = new Recognition();
    recognition.lang = 'vi-VN';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      const { finalText, previewText } = extractTranscript(event.results);
      transcriptRef.current = finalText || previewText;
      setDraftText(previewText);
    };

    recognition.onerror = (event) => {
      if (event.error === 'aborted' || event.error === 'no-speech') {
        return;
      }

      toast.error('Không thể nhận giọng nói. Vui lòng thử lại.');
    };

    recognition.onend = () => {
      const spokenText = transcriptRef.current.trim();
      const shouldSend = shouldSubmitRef.current;

      recognitionRef.current = null;
      shouldSubmitRef.current = false;
      setIsListening(false);
      setDraftText('');
      transcriptRef.current = '';

      if (shouldSend && spokenText) {
        void sendMessage(spokenText);
        return;
      }

      if (shouldSend && !spokenText) {
        toast.error('Chưa ghi nhận được nội dung giọng nói.');
      }
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  const toggleListening = () => {
    if (isListening) {
      stopRecognition(true);
      return;
    }

    if (!isSupported) {
      toast.error('Thiết bị này chưa hỗ trợ voice chat.');
      return;
    }

    startListening();
  };

  if (!isReady || !isMobile || isHiddenRoute) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 md:hidden">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-600 text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
          aria-label="Mở chatbot"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      ) : (
        <div className="flex h-[min(78vh,560px)] w-[min(92vw,380px)] flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-orange-600 px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Warehouse AI</p>
                <p className="text-[11px] text-orange-100">Voice assistant trên mobile</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (isListening) {
                  stopRecognition(false);
                }
              }}
              className="rounded-lg p-1.5 hover:bg-white/10"
              aria-label="Đóng chatbot"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-gray-50 px-4 py-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    message.isBot
                      ? 'rounded-tl-none border border-gray-200 bg-white text-gray-800'
                      : 'rounded-tr-none bg-orange-600 text-white'
                  }`}
                >
                  <p>{message.text}</p>
                  <p className={`mt-1 text-[10px] ${message.isBot ? 'text-gray-400' : 'text-orange-100'}`}>
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-tl-none border border-gray-200 bg-white px-3 py-2 text-gray-700">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                    <span className="text-sm">Đang xử lý yêu cầu...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 bg-white p-4">
            {!isSupported ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Trình duyệt này chưa hỗ trợ nhận diện giọng nói.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                  {draftText
                    ? `Bạn đang nói: "${draftText}"`
                    : 'Bấm micro, nói yêu cầu rồi bấm lần nữa để gửi.'}
                </div>

                <button
                  type="button"
                  onClick={toggleListening}
                  disabled={isLoading}
                  className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${
                    isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-600 hover:bg-orange-700'
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="h-4 w-4" />
                      Dừng và gửi
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4" />
                      Bắt đầu nói
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
