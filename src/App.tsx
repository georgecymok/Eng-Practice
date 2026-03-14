import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, CheckCircle2, XCircle, ChevronRight, RefreshCw, Volume2, AlertCircle, BookOpen, Headphones, MessageCircle, Eye, EyeOff } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Sentence {
  en: string;
  zh: string;
  speaker?: string;
}

type Mode = 'daily' | 'listening' | 'dialogue';
type Level = 'intermediate' | 'advanced';

// Normalize text for comparison
const normalizeText = (text: string) => {
  return text.toLowerCase().replace(/[^\w\s]/g, '').trim();
};

export default function App() {
  const [mode, setMode] = useState<Mode>('daily');
  const [level, setLevel] = useState<Level>('intermediate');
  
  const [items, setItems] = useState<Sentence[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<'none' | 'correct' | 'incorrect'>('none');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  
  const [showText, setShowText] = useState(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
      setLoading(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setRecording(true);
      setTranscript('');
      setResult('none');
      setErrorMsg(null);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (event.error !== 'no-speech') {
        setErrorMsg(`识别错误: ${event.error}`);
      }
      setRecording(false);
    };

    recognitionRef.current = recognition;
  }, []);

  useEffect(() => {
    loadContent();
  }, [mode, level]);

  const loadContent = async () => {
    setLoading(true);
    setErrorMsg(null);
    setItems([]);
    setCurrentIndex(0);
    setTranscript('');
    setResult('none');
    
    if (mode === 'listening') {
      setShowText(false);
    } else {
      setShowText(true);
    }

    try {
      let prompt = '';
      let schema: any = {};

      const levelText = level === 'intermediate' ? '中级(B1-B2)' : '高级(C1-C2)';

      if (mode === 'daily' || mode === 'listening') {
        prompt = `请生成8句适合【${levelText}】英语学习者的实用英语句子，并附带中文翻译。
        要求：
        1. 句子有一定的词汇和语法难度，适合中高级水平。
        2. 包含常见的生活、工作或学术场景。
        3. 返回JSON数组格式，包含 'en' 和 'zh' 两个字段。`;
        
        schema = {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              en: { type: Type.STRING },
              zh: { type: Type.STRING },
            },
            required: ['en', 'zh'],
          },
        };
      } else if (mode === 'dialogue') {
        prompt = `请生成一段适合【${levelText}】英语学习者的情景对话。
        场景可以是：商务会议、旅行预订、深入探讨某个话题等。
        对话包含两个角色：A 和 B。共 6 到 8 个回合。
        返回JSON数组格式，每个元素代表一个回合，包含：
        - 'speaker': 'A' 或 'B'
        - 'en': 英语台词
        - 'zh': 中文翻译`;

        schema = {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              speaker: { type: Type.STRING },
              en: { type: Type.STRING },
              zh: { type: Type.STRING },
            },
            required: ['speaker', 'en', 'zh'],
          },
        };
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });

      if (response.text) {
        const data = JSON.parse(response.text);
        setItems(data);
      } else {
        throw new Error('No content generated');
      }
    } catch (err: any) {
      console.error('Failed to load content:', err);
      setErrorMsg('加载内容失败，将使用离线备用内容。');
      
      if (mode === 'dialogue') {
        setItems([
          { speaker: 'A', en: "Good morning. Thanks for joining the meeting.", zh: "早上好。感谢您参加会议。" },
          { speaker: 'B', en: "Good morning. It's my pleasure.", zh: "早上好。这是我的荣幸。" },
          { speaker: 'A', en: "Let's get straight to the point. Have you reviewed the Q3 financial report?", zh: "我们直奔主题吧。你审阅过第三季度的财务报告了吗？" },
          { speaker: 'B', en: "Yes, I have. The revenue growth is quite impressive.", zh: "是的，我看过了。收入增长非常令人瞩目。" },
          { speaker: 'A', en: "Indeed. However, our operational costs have also increased significantly.", zh: "确实如此。然而，我们的运营成本也大幅增加了。" },
          { speaker: 'B', en: "I noticed that. We need to find ways to optimize our supply chain.", zh: "我注意到了。我们需要找到优化供应链的方法。" }
        ]);
      } else {
        setItems([
          { en: "The rapid advancement of technology has significantly altered our daily lives.", zh: "科技的快速进步极大地改变了我们的日常生活。" },
          { en: "It is crucial to maintain a healthy work-life balance to prevent burnout.", zh: "保持健康的工作与生活平衡对于防止倦怠至关重要。" },
          { en: "Could you please elaborate on the main objectives of this project?", zh: "您能详细说明一下这个项目的主要目标吗？" },
          { en: "Despite the unexpected challenges, the team managed to meet the deadline.", zh: "尽管遇到了意想不到的挑战，团队还是设法赶上了截止日期。" },
          { en: "I would appreciate it if you could provide some constructive feedback.", zh: "如果您能提供一些建设性的反馈，我将不胜感激。" },
          { en: "The company is currently undergoing a major restructuring process.", zh: "公司目前正在经历一次重大的重组过程。" },
          { en: "Effective communication is the cornerstone of any successful relationship.", zh: "有效的沟通是任何成功关系的基石。" },
          { en: "We need to implement more sustainable practices to protect the environment.", zh: "我们需要实施更可持续的做法来保护环境。" }
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const currentItemRef = useRef<Sentence | null>(null);
  useEffect(() => {
    currentItemRef.current = items[currentIndex] || null;
  }, [items, currentIndex]);

  const checkPronunciationRef = (spokenText: string) => {
    const currentItem = currentItemRef.current;
    if (!currentItem) return;
    
    const target = currentItem.en;
    const normalizedSpoken = normalizeText(spokenText);
    const normalizedTarget = normalizeText(target);

    if (normalizedSpoken === normalizedTarget || normalizedSpoken.includes(normalizedTarget) || normalizedTarget.includes(normalizedSpoken)) {
      setResult('correct');
      if (mode === 'listening') setShowText(true);
    } else {
      const spokenWords = normalizedSpoken.split(' ');
      const targetWords = normalizedTarget.split(' ');
      const matchCount = spokenWords.filter(w => targetWords.includes(w)).length;
      const matchRatio = matchCount / targetWords.length;

      if (matchRatio >= 0.7) {
        setResult('correct');
        if (mode === 'listening') setShowText(true);
      } else {
        setResult('incorrect');
      }
    }
  };

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const currentTranscript = finalTranscript || interimTranscript;
        setTranscript(currentTranscript);

        if (finalTranscript) {
          checkPronunciationRef(finalTranscript);
          recognitionRef.current.stop();
        }
      };
      
      recognitionRef.current.onend = () => {
        setRecording(false);
        setTranscript((prev) => {
          if (prev) {
            checkPronunciationRef(prev);
          }
          return prev;
        });
      };
    }
  }, [mode]);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;

    if (recording) {
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      setResult('none');
      setErrorMsg(null);
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const playAudio = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.7;
    window.speechSynthesis.speak(utterance);
  };

  const nextItem = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setTranscript('');
      setResult('none');
      setErrorMsg(null);
      if (mode === 'listening') setShowText(false);
    }
  };

  const prevItem = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setTranscript('');
      setResult('none');
      setErrorMsg(null);
      if (mode === 'listening') setShowText(false);
    }
  };

  if (!isSpeechSupported) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">不支持语音识别</h1>
          <p className="text-gray-600">
            您的浏览器不支持 Web Speech API。请在 Android 设备上使用 Chrome 浏览器打开此应用。
          </p>
        </div>
      </div>
    );
  }

  const currentItem = items[currentIndex];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-xl font-bold text-indigo-600">英语口语进阶</h1>
        <div className="flex items-center space-x-2">
          <select 
            value={level} 
            onChange={(e) => setLevel(e.target.value as Level)}
            className="bg-slate-100 text-slate-700 text-sm font-medium rounded-lg px-2 py-1 border-none focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
          >
            <option value="intermediate">中级</option>
            <option value="advanced">高级</option>
          </select>
          <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {items.length > 0 ? `${currentIndex + 1} / ${items.length}` : '0 / 0'}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 w-full max-w-2xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
            <p className="text-slate-500 font-medium">正在为您生成内容...</p>
          </div>
        ) : items.length > 0 && currentItem ? (
          <div className="w-full flex flex-col items-center space-y-6">
            
            {/* Instruction based on mode */}
            <div className="text-center text-slate-500 font-medium">
              {mode === 'daily' && "朗读以下句子"}
              {mode === 'listening' && "点击播放盲听，然后复述或回答"}
              {mode === 'dialogue' && `情景对话 - 当前角色: ${currentItem.speaker}`}
            </div>

            {/* Card */}
            <div className="bg-white w-full rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8 text-center relative overflow-hidden min-h-[200px] flex flex-col justify-center">
              
              <div className="absolute top-4 right-4 flex space-x-2">
                {mode === 'listening' && (
                  <button 
                    onClick={() => setShowText(!showText)}
                    className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-full transition-colors"
                    title={showText ? "隐藏文本" : "显示文本"}
                  >
                    {showText ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                  </button>
                )}
                <button 
                  onClick={() => playAudio(currentItem.en)}
                  className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-full transition-colors"
                  title="播放发音"
                >
                  <Volume2 className="w-6 h-6" />
                </button>
              </div>
              
              {mode === 'dialogue' && currentItem.speaker && (
                <div className={`text-sm font-bold mb-4 inline-block px-3 py-1 rounded-full self-center ${
                  currentItem.speaker === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                }`}>
                  Speaker {currentItem.speaker}
                  {currentItem.speaker === 'A' ? ' (请听)' : ' (请您朗读)'}
                </div>
              )}

              {showText ? (
                <>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-4 leading-tight mt-4">
                    {currentItem.en}
                  </h2>
                  <p className="text-base sm:text-lg text-slate-500 font-medium">
                    {currentItem.zh}
                  </p>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <Headphones className="w-16 h-16 text-indigo-200 mb-4" />
                  <p className="text-slate-400">点击右上角喇叭听音，然后点击下方麦克风复述</p>
                </div>
              )}
            </div>

            {/* Feedback Area */}
            <div className={`w-full rounded-2xl p-4 sm:p-6 text-center transition-all duration-300 min-h-[100px] flex flex-col items-center justify-center ${
              result === 'correct' ? 'bg-emerald-50 border border-emerald-200' :
              result === 'incorrect' ? 'bg-rose-50 border border-rose-200' :
              transcript ? 'bg-blue-50 border border-blue-200' : 'bg-transparent'
            }`}>
              {transcript ? (
                <>
                  <p className={`text-base sm:text-lg mb-2 ${
                    result === 'correct' ? 'text-emerald-700' :
                    result === 'incorrect' ? 'text-rose-700' : 'text-blue-700'
                  }`}>
                    "{transcript}"
                  </p>
                  {result === 'correct' && (
                    <div className="flex items-center text-emerald-600 font-bold">
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      发音很棒！
                    </div>
                  )}
                  {result === 'incorrect' && (
                    <div className="flex items-center text-rose-600 font-bold">
                      <XCircle className="w-5 h-5 mr-2" />
                      再试一次吧
                    </div>
                  )}
                </>
              ) : (
                <p className="text-slate-400 text-sm sm:text-base">
                  {mode === 'dialogue' && currentItem.speaker === 'A' 
                    ? "点击喇叭听对方说话，然后点击右箭头继续" 
                    : "点击麦克风开始朗读"}
                </p>
              )}
              {errorMsg && (
                 <p className="text-rose-500 mt-2 text-sm">{errorMsg}</p>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center space-x-4 sm:space-x-8 w-full">
              <button
                onClick={prevItem}
                disabled={currentIndex === 0}
                className="p-3 sm:p-4 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              >
                <ChevronRight className="w-8 h-8 rotate-180" />
              </button>

              <button
                onClick={toggleRecording}
                disabled={mode === 'dialogue' && currentItem.speaker === 'A'}
                className={`relative group flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full shadow-lg transition-all duration-300 ${
                  (mode === 'dialogue' && currentItem.speaker === 'A') 
                    ? 'bg-slate-300 cursor-not-allowed'
                    : recording 
                      ? 'bg-rose-500 hover:bg-rose-600 scale-110 shadow-rose-500/30' 
                      : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105 shadow-indigo-600/30'
                }`}
              >
                {recording ? (
                  <>
                    <span className="absolute inset-0 rounded-full border-4 border-rose-400 animate-ping opacity-75"></span>
                    <Square className="w-8 h-8 sm:w-10 sm:h-10 text-white fill-current" />
                  </>
                ) : (
                  <Mic className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                )}
              </button>

              <button
                onClick={nextItem}
                disabled={currentIndex === items.length - 1}
                className="p-3 sm:p-4 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </div>

          </div>
        ) : (
          <div className="text-center text-slate-500">
            <p>未能加载内容。</p>
            <button 
              onClick={loadContent}
              className="mt-4 px-6 py-2 bg-indigo-100 text-indigo-700 rounded-full font-medium hover:bg-indigo-200 transition-colors"
            >
              重试
            </button>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center z-20 pb-safe">
        <button 
          onClick={() => setMode('daily')}
          className={`flex flex-col items-center space-y-1 transition-colors ${mode === 'daily' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <BookOpen className="w-6 h-6" />
          <span className="text-xs font-medium">每日金句</span>
        </button>
        <button 
          onClick={() => setMode('listening')}
          className={`flex flex-col items-center space-y-1 transition-colors ${mode === 'listening' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Headphones className="w-6 h-6" />
          <span className="text-xs font-medium">听力理解</span>
        </button>
        <button 
          onClick={() => setMode('dialogue')}
          className={`flex flex-col items-center space-y-1 transition-colors ${mode === 'dialogue' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <MessageCircle className="w-6 h-6" />
          <span className="text-xs font-medium">情景对话</span>
        </button>
      </nav>
    </div>
  );
}
