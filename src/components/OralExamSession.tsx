import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Send, ArrowRight, ChevronRight, UserCheck, MessageSquare, AlertCircle, Sparkles, Languages, Download, FileAudio, FileText, Upload, RotateCcw, Video, Clock } from 'lucide-react';
import { ExamConfig, ChatMessage } from '../types';
import { speakChineseText, stopSpeaking, ChineseSpeechRecognizer } from '../lib/speech';
import { saveAudioBackup } from '../lib/audioBackupDB';

const MASTER_GUIDE_EXAMINER_PROMPT = `
【MASTER GUIDE 考官标准提问模式 (Master Guide Questioning Patterns)】
你必须根据口试主题与录像内容，灵活选用以下 Master Guide 提问模式进行提问：

一、第一题（Q1）6大提问模式（基于录像内容的观察与描述）：
1. “看了这段录像，如果你家楼下有一台智能回收机，你会去使用它吗？为什么？”
1. 概括描述类：如“你在刚才的录像里看到了什么？”、“请告诉我录像中发生了什么事？”
2. 重点选取类：如“录像中哪一件事让你印象深刻/最吸引你的注意？”
3. 角色代入（心理感受）：如“如果你是录像中的某人，你会有什么感受？”
4. 角色代入（行动做法）：如“如果你在现场/是录像中的某人，你会怎么做？”
5. 评价辨析类：如“说一说你在录像中看到的值得学习（或不文明）的行为。”
6. 模仿对比类：如“你会像录像中的人一样做同样的事吗？为什么？”

二、第二题（Q2）5大提问模式（结合生活的个人经验）：
1. 亲身经历类：如“说一说你曾经（与主题相关，如帮助他人/合作/环保）的经历。”
2. 现实观察类：如“你身边的人（或在学校/公共场所）有没有做过类似的事？”
3. 个人习惯与偏好类：如“你平时还有哪些……的习惯/休闲活动？”
4. 角色代入与行动类（转向题）：如“如果你在现场看到同学做这件事，你会怎么做？”
5. 情感共鸣与评价类：如“你认为录像中那个小男孩的做法对吗？为什么？”

三、第三题（Q3）5大提问模式（看法、建议与拓展）：
1. 观点辨析与思辨类（核心高频）：如“有人说……，你同意这个说法吗？为什么？”（提示学生必须明确亮明立场“我同意/我不同意”）
2. 建议与具体做法/高阶劝导类：如“如果你的朋友（有某种不良习惯/缺乏公德心），你会怎么劝导或帮助他？”
3. 感悟与做人道理类：如“你从这段录像或这个主题中学到了什么做人的道理？”
4. 话题拓展与社会影响类：如“如果大家都不这样做，会对我们的社会产生什么影响？”
5. 未来展望与计划类：如“对于解决这个问题，你有什么期望或具体的改善计划？”

四、第四题（Q4）建议与推广：
- 引导学生从个人自律、学校/家庭教导、以及社会/政府推广等多角度提出切实的改进建议。
`;

export const downloadAudioFile = (url: string, filename: string, mimeType?: string) => {
  if (!url) return;
  const a = document.createElement('a');
  a.href = url;
  const ext = mimeType?.includes('mp4') ? 'm4a' : mimeType?.includes('wav') ? 'wav' : mimeType?.includes('ogg') ? 'ogg' : 'webm';
  const finalFilename = filename.includes('.') ? filename : `${filename}.${ext}`;
  a.download = finalFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

interface OralExamSessionProps {
  apiKey: string;
  config: ExamConfig;
  chatHistory: ChatMessage[];
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  currentQuestionIndex: number;
  setCurrentQuestionIndex: React.Dispatch<React.SetStateAction<number>>;
  onExamCompleted: () => void;
  onExit?: () => void;
}

export default function OralExamSession({
  apiKey,
  config,
  chatHistory,
  setChatHistory,
  currentQuestionIndex,
  setCurrentQuestionIndex,
  onExamCompleted,
  onExit,
}: OralExamSessionProps) {
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  
  // Examiner Video Feed State
  const DEFAULT_LISTENING_VIDEO_URL = '../Female_Listening_Examiner.mp4';
  const DEFAULT_TALKING_VIDEO_URL = '../Female_Speaking_Examiner.mp4';

  const [examinerVideoUrl, setExaminerVideoUrl] = useState<string>(() => {
    return localStorage.getItem('custom_examiner_video_url') || DEFAULT_LISTENING_VIDEO_URL;
  });
  const [examinerTalkingVideoUrl, setExaminerTalkingVideoUrl] = useState<string>(() => {
    return localStorage.getItem('custom_examiner_talking_video_url') || DEFAULT_TALKING_VIDEO_URL;
  });

  const examinerVideoRef = useRef<HTMLVideoElement | null>(null);
  const examinerFileInputRef = useRef<HTMLInputElement | null>(null);
  const examinerTalkingFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExaminerVideoUpload = (e: React.ChangeEvent<HTMLInputElement>, isTalkingMode = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      if (isTalkingMode) {
        setExaminerTalkingVideoUrl(url);
        localStorage.setItem('custom_examiner_talking_video_url', url);
      } else {
        setExaminerVideoUrl(url);
        localStorage.setItem('custom_examiner_video_url', url);
      }
    }
  };

  const handleResetExaminerVideo = () => {
    setExaminerVideoUrl(DEFAULT_LISTENING_VIDEO_URL);
    setExaminerTalkingVideoUrl(DEFAULT_TALKING_VIDEO_URL);
    localStorage.removeItem('custom_examiner_video_url');
    localStorage.removeItem('custom_examiner_talking_video_url');
  };

  // Microphone & Speech recognition states
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [isExaminerSpeaking, setIsExaminerSpeaking] = useState(false);
  const [isExamEnded, setIsExamEnded] = useState(false);

  // Timing states
  const [pauseTimeSec, setPauseTimeSec] = useState(0);
  const [answerTimeSec, setAnswerTimeSec] = useState(0);
  const [timingPhase, setTimingPhase] = useState<'pause' | 'answering' | 'idle'>('idle');

  const pauseTimeRef = useRef(0);
  const answerTimeRef = useRef(0);

  useEffect(() => {
    if (isExamEnded) {
      setTimingPhase('idle');
      return;
    }
    if (isListening) {
      setTimingPhase('answering');
    } else if (!isExaminerSpeaking && !isLoadingResponse && !isTranscribing) {
      if (timingPhase !== 'answering') setTimingPhase('pause');
    } else {
      setTimingPhase('idle');
    }
  }, [isExaminerSpeaking, isLoadingResponse, isListening, isTranscribing, isExamEnded]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (timingPhase === 'pause') {
      timer = setInterval(() => {
        setPauseTimeSec(prev => {
          const val = prev + 1;
          pauseTimeRef.current = val;
          return val;
        });
      }, 1000);
    } else if (timingPhase === 'answering') {
      timer = setInterval(() => {
        setAnswerTimeSec(prev => {
          const val = prev + 1;
          answerTimeRef.current = val;
          return val;
        });
      }, 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [timingPhase]);

  const formatTimerSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const [isVideoError, setIsVideoError] = useState(false);
  const activeVideoSrc = isExaminerSpeaking ? examinerTalkingVideoUrl : examinerVideoUrl;
  const isVimeo = activeVideoSrc.includes('vimeo.com') || activeVideoSrc.includes('player.vimeo.com');

  const getVimeoEmbedUrl = (url: string) => {
    const cleanUrl = url.split('?')[0];
    return `${cleanUrl}?autoplay=1&loop=1&muted=1&background=1&autopause=0&byline=0&title=0`;
  };

  useEffect(() => {
    setIsVideoError(false);
    if (examinerVideoRef.current) {
      examinerVideoRef.current.load();
      examinerVideoRef.current.play().catch(() => setIsVideoError(true));
    }
  }, [activeVideoSrc]);

  const recognizerRef = useRef<ChineseSpeechRecognizer | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const initialTriggeredRef = useRef<boolean>(false);
  const pendingAudioRef = useRef<{ audioDataUrl: string; mimeType: string; base64Audio: string } | null>(null);

  useEffect(() => {
    const recognizer = new ChineseSpeechRecognizer();
    if (recognizer.isSupported()) {
      recognizer.onResultCallback = (transcript, isFinal) => {
        setInterimTranscript(transcript);
        setTextInput(transcript);
      };
      
      recognizer.onEndCallback = (finalTranscript) => {
        const hasMediaRecorder = typeof window !== 'undefined' && !!window.MediaRecorder;
        if (!hasMediaRecorder) {
          setIsListening(false);
          if (finalTranscript && finalTranscript.trim()) {
            setInterimTranscript('');
            setTextInput('');
            handleStudentSubmit(finalTranscript);
          }
        } else {
          if (finalTranscript && finalTranscript.trim()) {
            setTextInput(finalTranscript);
          }
        }
      };

      recognizer.onErrorCallback = (err) => {
        const hasMediaRecorder = typeof window !== 'undefined' && !!window.MediaRecorder;
        if (!hasMediaRecorder) {
          setIsListening(false);
          if (err === 'not-allowed') setSpeechError('无法访问麦克风。请在浏览器中允许麦克风权限。');
          else setSpeechError(`语音识别出错: ${err}`);
        }
      };

      recognizerRef.current = recognizer;
    } else {
      setSpeechError('您的浏览器不支持语音识别。您可以通过下方键盘输入作答。');
    }

    if (chatHistory.length === 0 && !initialTriggeredRef.current) {
      initialTriggeredRef.current = true;
      triggerExaminerTurn([]);
    }

    return () => stopSpeaking();
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatHistory, interimTranscript]);

  const getFallbackQuestionText = (qIndex: number, theme: string) => {
    const cleanTheme = theme || '保持环境清洁';
    const customQ = config.customQuestions?.[`q${qIndex}` as 'q1' | 'q2' | 'q3' | 'q4'];
    if (customQ && customQ.trim()) {
      if (qIndex === 1) {
        return `现在我们进入看录像说话的环节，请你看录像。${customQ.trim()}`;
      }
      return customQ.trim();
    }
    if (qIndex === 1) return `现在我们进入看录像说话的环节，请你看录像。说一说你在这个录像中看到的事情。`;
    if (qIndex === 2) return `在日常生活里，你有没有和“${cleanTheme}”相关的经验？请和考官说一说。`;
    if (qIndex === 3) return `有些人觉得“${cleanTheme}”和小学生没有关系，你赞同吗？为什么？`;
    if (qIndex === 4) return `针对“${cleanTheme}”这个主题，我们可以怎样帮助大家养成好习惯呢？`;
    return `谢谢你，今天的口试就到这里结束。`;
  };

  // ==========================================
  // REFACTORED: Direct Gemini API Call for Examiner
  // ==========================================
  const triggerExaminerTurn = async (history: ChatMessage[], questionIndexOverride?: number) => {
    const qIndex = questionIndexOverride !== undefined ? questionIndexOverride : currentQuestionIndex;
    setIsLoadingResponse(true);
    setSpeechError(null);

    let textToUse = '';
    try {
      const scenesText = (config.scenes || []).map((s: any) => `场景 ${s.sceneNumber}：${s.description}`).join('\n');
      const currentCustomQ = config.customQuestions && config.customQuestions[`q${currentQuestionIndex}` as 'q1'|'q2'|'q3'|'q4'] ? config.customQuestions[`q${currentQuestionIndex}` as 'q1'|'q2'|'q3'|'q4'].trim() : '';
      const customQInstruction = currentCustomQ 
    ? `\n【用户自定义指定考题】\n用户（教师/家长）为第 ${currentQuestionIndex} 题专门指定了以下提问内容：“${currentCustomQ}”。请你在提问第 ${currentQuestionIndex} 题时，必须包含并围绕这道指定的题目展开提问，绝对不能替换成其他无关问题。\n`
    : '';

      const systemInstruction = `
You are a Singapore MOE PSLE Chinese Oral Examiner with 20 years of experience. Your goal is to conduct a highly realistic mock oral exam in Video-Based Conversation (录像口试会话) for a 12-year-old student via standard conversational turns.

${MASTER_GUIDE_EXAMINER_PROMPT}

【Language & Persona 指令】
- 必须使用标准新加坡华语（Standard Singapore Chinese）。华语发音或用词必须完全标准，不能带有英文腔。
- 词汇必须简单、直接，符合本地小六学生（12岁）的理解能力。
- 提问方式必须严格模仿 PSLE 官方的录像口试提问法。
- 严禁插话、接话、总结或进行引导。

【录像考试主题与细节】
- 主题：${config.theme}
- 旁白：${config.narration}
- 录像画面描述：\n${scenesText}
- 用户自定义指定考题：${customQInstruction}

【问题变化与多样性要求】
你必须根据当前问题序号（第 ${qIndex} 题）结合录像细节进行动态变体提问，绝对不能每次都问一模一样的原题。必须短小精悍。

【互动规则】
1. 每次只能提出一个问题，绝对不要连着问两个问题。
2. 问题必须短小精悍、直接（最多2句话）。
3. 如果这是第1题的开场：你必须先严格逐字说出开场白：“现在我们进入看录像说话的环节，请你看录像。” 接着直接说第一题。
4. 如果学生回答完毕，在进入下一题前，必须使用自然的新加坡考试过渡语（如“我知道了”或“好的”），不能表扬学生，严禁说“很好”、“非常棒”。
5. 绝对不能提及“AI”、“系统提示”等词汇。不加星号，只输出标准的中文对话。
      `;

      let contents = history.map((msg: any) => ({
        role: msg.sender === 'examiner' ? 'model' : 'user',
        parts: [{ text: msg.text }],
      }));

      if (contents.length > 0 && contents[0].role === 'model') {
        contents.unshift({ role: 'user', parts: [{ text: '好的，考官，我准备好了，请开始。' }] });
      }
      if (contents.length === 0) {
        contents.push({ role: 'user', parts: [{ text: 'START' }] });
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: contents,
          generationConfig: { temperature: 0.7 },
          theme: config.theme,
          narration: config.narration,
          scenes: config.scenes,
          chatHistory: history,
          currentQuestionIndex: qIndex,
          customQuestions: config.customQuestions,
        }),
      });

      const data = await response.json();
      if (response.ok && data.candidates) {
        textToUse = data.candidates[0].content.parts[0].text.trim();
      } else {
        throw new Error('API Timeout or Error');
      }
    } catch (err: any) {
      console.warn('Network or API response error, using intelligent fallback:', err);
      textToUse = getFallbackQuestionText(qIndex, config.theme);
    }

    const examinerMessage: ChatMessage = {
      id: `examiner-${Date.now()}`,
      sender: 'examiner',
      text: textToUse,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      questionNumber: qIndex,
    };

    setChatHistory((prev) => [...prev, examinerMessage]);

    if (!isMuted) {
      setIsExaminerSpeaking(true);
      speakChineseText(textToUse, () => setIsExaminerSpeaking(true), () => setIsExaminerSpeaking(false), () => setIsExaminerSpeaking(false));
    }
    setIsLoadingResponse(false);
  };

  const isRepetitionOrClarificationRequest = (text: string): boolean => {
    const t = text.trim();
    if (!t) return false;
    const explicitRequests = [
      '重复一遍', '重复一次', '重复问题', '重复一下', '重新读', '重新说', '重新讲',
      '再说一遍', '再说一次', '再读一遍', '再读一次', '再念一遍', '再念一次', '再讲一遍', '再讲一次',
      '再问一遍', '再问一次', '听不懂问题', '没听懂问题', '听不明白问题', '不明白问题',
      '可以重复吗', '能重复吗', '请重复', '请再读', '请再说', '请再讲', '请再问',
      '没听清', '听不清', '没听清楚', '听不清楚', '没听太清楚',
      '什么意思', '能解释一下吗', '可以解释一下吗', '请解释一下', '怎么解释'
    ];
    if (explicitRequests.some(r => t.includes(r))) return true;
    if (/(可以|能|请|麻烦).*再.*(说|读|讲|念|问|重复)/.test(t)) return true;
    const exactMatches = ['重复', '听不懂', '没听懂', '不明白', '没听清', '听不清'];
    if (exactMatches.includes(t)) return true;
    return false;
  };

  const handleBatchExportAudios = () => {
    const studentMessages = chatHistory.filter((m) => m.sender === 'student' && m.audioUrl);
    if (studentMessages.length === 0) {
      alert('暂未检测到录制的口试答题音频文件。');
      return;
    }

    studentMessages.forEach((msg, idx) => {
      setTimeout(() => {
        const qNum = msg.questionNumber || idx + 1;
        const todayDate = new Date().toISOString().slice(0, 10);
        downloadAudioFile(msg.audioUrl!, `Student_Oral_Answer_Q${qNum}_Audio_${todayDate}`, msg.audioMimeType);
      }, idx * 600);
    });
  };

// Export Student Transcript & Gemini Prompt TXT file
const handleDownloadGeminiPrompt = () => {
  const cleanTheme = config.theme.replace(/^主题\s*\d+[:：\s]*/i, '').trim() || config.theme;

  const getExaminerQuestionForQ = (qNum: number): string => {
    if (chatHistory && chatHistory.length > 0) {
      const tagged = chatHistory.find(m => m.sender === 'examiner' && m.questionNumber === qNum);
      if (tagged && tagged.text) return tagged.text;

      const examinerMsgs = chatHistory.filter(m => m.sender === 'examiner' && (m.questionNumber === undefined || m.questionNumber <= 4));
      if (examinerMsgs[qNum - 1]?.text) {
        return examinerMsgs[qNum - 1].text;
      }
    }
    const fallbackQuestions: Record<number, string> = {
      1: `在录像中，你看到了什么？看到那一幕，你有什么感受？`,
      2: `你在生活中有没有遇到过类似的情况？请和我们分享一下你的经历和当时的感想。`,
      3: `你认为我们应该如何提高大家的意识或推广这种文明行为？`,
      4: `学校或社区还可以采取哪些具体有效措施来改进这个问题？`,
    };
    return fallbackQuestions[qNum] || `关于“${cleanTheme}”的口试问题。`;
  };

  const getStudentAnswerForQ = (qNum: number) => {
    if (!chatHistory) return null;
    return chatHistory.find(m => m.sender === 'student' && m.questionNumber === qNum);
  };

  const studentTranscripts = [1, 2, 3, 4].map(num => {
    const qText = getExaminerQuestionForQ(num);
    const msg = getStudentAnswerForQ(num);
    const answerText = msg?.text || '';
    const hasAudio = !!msg?.audioUrl;
    return `【考官第 ${num} 题提问】：${qText}\n【学生第 ${num} 题作答】：${answerText || (hasAudio ? '（详见随附的第 ' + num + ' 题录音文件）' : '（未检测到作答）')}`;
  }).join('\n\n');

  const promptText = `你是一位经验丰富的新加坡教育部 (MOE) PSLE 华文口试特级考官。
请根据以下 PSLE 华文看录像说话评分细则（满分 30分：拆分为 4 维分值——语音与声调 8分、表达流利度 8分、内容充实 8分、词汇与句型 6分），对我的学生作答（文字原稿及随附的各题录音音频文件）提供严谨专业的评测与辅导：

【口试主题】：${cleanTheme}

【考官提问与学生作答内容】：
${studentTranscripts}

【评估与辅导要求】：
1. 预估总得分（0 - 30分），并根据 4 维细则拆解：语音与声调(8分)、表达流利度(8分)、内容充实(8分)、词汇与句型(6分)。
2. 在“语音与声调”、“表达流利度”、“内容充实”、“词汇与句型”四个维度给出详细诊断与指导，包含特定发音/声调偏误表及思考填充词（如“那个”、“呃”）统计。
3. 针对 Q1 - Q4 逐题剖析学生作答中的亮点与不足。
4. 指出 3 个最亮眼的优势，以及 3 个最关键的提升建议（附新加坡高频词汇与连词替换建议）。
5. 针对 Q1 - Q4 提供 4 道题目的 MOE 标准满分示范答案。`;

  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `学生回答逐字稿_${cleanTheme}_${dateStr}.txt`;

  const blob = new Blob([promptText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

  const handleStudentSubmit = async (answerText: string, audioUrl?: string, audioMimeType?: string, audioBase64?: string) => {
    if (!answerText.trim() || isLoadingResponse) return;

    // Use passed audio parameters or fallback to cached pendingAudioRef from local recording
    const finalAudioUrl = audioUrl || pendingAudioRef.current?.audioDataUrl;
    const finalAudioMimeType = audioMimeType || pendingAudioRef.current?.mimeType;
    const finalAudioBase64 = audioBase64 || pendingAudioRef.current?.base64Audio;

    // Reset pending audio ref after consumption
    pendingAudioRef.current = null;

    const finalPauseSec = pauseTimeRef.current;
    const finalAnswerSec = answerTimeRef.current;

    // Create student message
    const studentMessage: ChatMessage = {
      id: `student-${Date.now()}`,
      sender: 'student',
      text: answerText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      audioUrl: finalAudioUrl,
      audioMimeType: finalAudioMimeType,
      audioBase64: finalAudioBase64,
      questionNumber: currentQuestionIndex,
      pauseTimeSec: finalPauseSec,
      answerTimeSec: finalAnswerSec,
    };

    // Backup to persistent IndexedDB immediately
    if (finalAudioUrl || finalAudioBase64) {
      saveAudioBackup({
        id: `Q${currentQuestionIndex}_${Date.now()}`,
        questionNumber: currentQuestionIndex,
        theme: config.theme,
        audioDataUrl: audioUrl,
        audioMimeType: audioMimeType,
        text: answerText.trim(),
        timestamp: new Date().toISOString(),
      });
    }

    setPauseTimeSec(0);
    setAnswerTimeSec(0);
    pauseTimeRef.current = 0;
    answerTimeRef.current = 0;
    setTimingPhase('idle');

    const updatedHistory = [...chatHistory, studentMessage];
    setChatHistory(updatedHistory);
    setTextInput('');
    setInterimTranscript('');

    const isRepeatRequest = isRepetitionOrClarificationRequest(answerText);

    if (isRepeatRequest) {
      setTimeout(() => triggerExaminerTurn(updatedHistory, currentQuestionIndex), 500);
    } else {
      if (currentQuestionIndex < 4) {
        const nextIndex = currentQuestionIndex + 1;
        setCurrentQuestionIndex(nextIndex);
        setTimeout(() => triggerExaminerTurn(updatedHistory, nextIndex), 500);
      } else {
        setIsLoadingResponse(true);
        let closingText = '';
        try {
          const prompt = `你是一名PSLE华文口试考官。口试已结束。请根据学生最后的回答：${JSON.stringify(updatedHistory.slice(-2))}，说一句简短的结束语，鼓励学生并祝他们考试顺利。只输出你要说的话。`;
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          });
          const data = await response.json();
          if (response.ok && data.candidates) {
            closingText = data.candidates[0].content.parts[0].text.trim();
          }
        } catch (err) {
          console.error('Closing message fetch error:', err);
        }

        if (!closingText) {
          closingText = '谢谢你，今天的口试就到这里结束。祝你考试顺利，取得理想好成绩！';
        }

        const finalClosingMessage: ChatMessage = {
          id: `examiner-${Date.now()}`,
          sender: 'examiner',
          text: closingText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          questionNumber: 5,
        };
        setChatHistory((prev) => [...prev, finalClosingMessage]);
        setIsExamEnded(true);

        if (!isMuted) {
          setIsExaminerSpeaking(true);
          speakChineseText(closingText, () => setIsExaminerSpeaking(true), () => setIsExaminerSpeaking(false), () => setIsExaminerSpeaking(false));
        }
        setIsLoadingResponse(false);
      }
    }
  };

  const startMediaRecorder = async () => {
    audioChunksRef.current = [];
    setSpeechError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let options = {};
      if (MediaRecorder.isTypeSupported('audio/webm')) options = { mimeType: 'audio/webm' };
      else if (MediaRecorder.isTypeSupported('audio/mp4')) options = { mimeType: 'audio/mp4' };
      else if (MediaRecorder.isTypeSupported('audio/ogg')) options = { mimeType: 'audio/ogg' };
      else if (MediaRecorder.isTypeSupported('audio/wav')) options = { mimeType: 'audio/wav' };

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        if (audioChunksRef.current.length > 0) {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const dataUrl = reader.result as string;
            await transcribeAudio(audioBlob, mimeType, dataUrl);
          };
          reader.readAsDataURL(audioBlob);
        }
      };
      mediaRecorder.start(200);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setSpeechError('麦克风权限被拒绝，无法进行录音作答。');
      } else {
        setSpeechError('无法启动高精度麦克风录音，已切换到普通语音识别模式。');
      }
    }
  };

  // ==========================================
  // REFACTORED: Direct Gemini 1.5 Multimodal Audio Transcription
  // ==========================================
  const transcribeAudio = async (blob: Blob, mimeType: string, audioDataUrl?: string) => {
    setIsTranscribing(true);
    setSpeechError(null);
    let base64Audio = '';
    try {
      const base64Promise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      base64Audio = await base64Promise;

 // Cache recorded audio in pendingAudioRef so manual submit or fallback can use it
      if (audioDataUrl || base64Audio) {
        pendingAudioRef.current = {
          audioDataUrl: audioDataUrl || '',
          mimeType: mimeType,
          base64Audio: base64Audio,
        };
      }

      const localCapturedText = textInput.trim() || interimTranscript.trim();
      if (localCapturedText) {
        setTextInput('');
        setInterimTranscript('');
        handleStudentSubmit(localCapturedText, audioDataUrl, mimeType, base64Audio);
        return;
      }

      const questions = [
        "你喜欢这幅画/录像里的什么？请具体说一说。",
        "我知道了。那么平时在学校或家里，你是怎么做来保持环境清洁的？请分享你的经历。",
        "在公共场所保持环境清洁，你认为‘人人有责’这句话对吗？为什么？",
        "为了让大家养成保持环境清洁的好习惯，你有什么好建议吗？"
      ];
      const currentQuestion = questions[currentQuestionIndex - 1] || "新加坡华文口试";

      const prompt = `你是一位极其严谨的中文听写员。请将这段语音文件高精度地转写为简体中文文本。注意：这是一个小学生在回答问题：“${currentQuestion}”。请忽略停顿，直接准确转写。只输出转录文本，不要任何其他评论。`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType: mimeType, data: base64Audio } }
            ]
          }]
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Server transcription failed');

      const cleanText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (cleanText) {
        setTextInput('');
        setInterimTranscript('');
        handleStudentSubmit(cleanText, audioDataUrl, mimeType, base64Audio);
      } else {
        setSpeechError('未检测到清晰的华语说话声音，请重新录制。');
      }
    } catch (err: any) {
      console.error('Transcription API error:', err);
      if (textInput.trim()) {
        const fallbackText = textInput.trim();
        setTextInput('');
        setInterimTranscript('');
        handleStudentSubmit(fallbackText, audioDataUrl, mimeType, base64Audio);
      } else {
        setSpeechError('AI 语音高精度转写失败，且未检测到有效作答。请重试或使用键盘输入。');
      }
    } finally {
      setIsTranscribing(false);
    }
  };

  const toggleListening = () => {
    setSpeechError(null);
    const hasMediaRecorder = typeof window !== 'undefined' && !!window.MediaRecorder;

    if (isListening) {
      setIsListening(false);
      if (recognizerRef.current) {
        try { recognizerRef.current.stop(); } catch (e) { console.warn(e); }
      }
      if (hasMediaRecorder && mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch (e) { console.warn(e); }
      }
    } else {
      stopSpeaking();
      setIsExaminerSpeaking(false);
      setInterimTranscript('');
      setTextInput('');
      pendingAudioRef.current = null;
      setTimingPhase('answering');
      setAnswerTimeSec(0);
      answerTimeRef.current = 0;
      setIsListening(true);

      if (recognizerRef.current) {
        try { recognizerRef.current.start(); } catch (e) { console.warn(e); }
      }
      if (hasMediaRecorder) startMediaRecorder();
    }
  };

  const handleManualSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    handleStudentSubmit(textInput);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1500px] w-full mx-auto my-6 font-sans px-2 sm:px-4">
      {/* Left Panel: Examiner Visual Feed & Audio indicator */}
      <div className="lg:col-span-7 flex flex-col gap-4 lg:sticky lg:top-6 self-start pt-1">
        <div className="bg-white rounded-2xl border border-natural-border shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="bg-natural-beige border-b border-natural-border px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-natural-heading">
              <UserCheck className="h-5 w-5 text-natural-sage" />
              <span className="font-display font-bold text-sm tracking-wide">
                口试考场
              </span>
            </div>
            <div className="flex items-center gap-2">
              {onExit && (
                <button
                  type="button"
                  onClick={onExit}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-bold border border-stone-300 transition cursor-pointer"
                  title="退出口试并返回主题选择"
                >
                  <RotateCcw className="h-3 w-3 text-stone-500" />
                  <span>退出口试</span>
                </button>
              )}
              <div className="rounded-full bg-natural-sage/20 px-2 py-0.5 text-[10px] font-mono font-bold tracking-wide border border-natural-sage/30 text-natural-sage">
                虚拟考官 live
              </div>
            </div>
          </div>

          <div className="flex-1 bg-stone-900 p-4 sm:p-5 flex flex-col items-center justify-center relative min-h-[320px]">
            <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-xl border-2 border-stone-800 flex items-center justify-center group bg-stone-950">
              {isVimeo ? (
                <iframe
                  key={activeVideoSrc}
                  src={getVimeoEmbedUrl(activeVideoSrc)}
                  className="w-full h-full object-cover border-0 pointer-events-none scale-105"
                  allow="autoplay; fullscreen"
                  title="PSLE Examiner Video Stream"
                />
              ) : isVideoError ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-stone-800 via-stone-900 to-stone-950 p-6 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(122,140,112,0.15)_0,transparent_70%)] pointer-events-none" />
                  <div className={`relative mb-3 flex items-center justify-center rounded-full p-1.5 transition-all duration-300 ${
                    isExaminerSpeaking ? 'ring-4 ring-red-500/50 bg-red-500/20 animate-pulse' : isListening ? 'ring-4 ring-emerald-500/50 bg-emerald-500/20' : 'ring-2 ring-stone-700 bg-stone-800'
                  }`}>
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-stone-800 border-2 border-stone-600 flex items-center justify-center shadow-lg overflow-hidden">
                      <UserCheck className={`h-12 w-12 sm:h-14 sm:w-14 ${isExaminerSpeaking ? 'text-red-400' : isListening ? 'text-emerald-400' : 'text-amber-300'}`} />
                    </div>
                    {isExaminerSpeaking && (
                      <div className="absolute -bottom-1 flex items-center gap-1 bg-red-600 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow-md">
                        <Volume2 className="h-3 w-3 animate-bounce" />
                        <span>提问讲话中...</span>
                      </div>
                    )}
                  </div>
                  <h3 className="text-white font-bold text-sm sm:text-base">陈老师 (虚拟考官)</h3>
                  <p className="text-stone-400 text-xs mt-1 max-w-sm">
                    {isExaminerSpeaking ? '正在对您提问，请仔细倾听考官音频...' : isListening ? '考官正在专注倾听您的作答...' : '考官准备就绪，点击右侧麦克风按钮开始作答'}
                  </p>
                  <p className="text-[10px] text-stone-500 mt-2">
                    💡 提示：如需使用定制虚拟考官视频，可点击下方按钮上传 MP4 视频文件。
                  </p>
                </div>
              ) : (
                <video
                  ref={examinerVideoRef}
                  src={activeVideoSrc}
                  autoPlay
                  loop
                  muted
                  playsInline
                  onError={() => setIsVideoError(true)}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute top-3 right-3 z-10">
                {isExaminerSpeaking ? (
                  <div className="flex items-center gap-1.5 bg-red-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-md animate-pulse">
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>考官说话提问中...</span>
                  </div>
                ) : isListening ? (
                  <div className="flex items-center gap-1.5 bg-emerald-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-md">
                    <div className="h-2 w-2 rounded-full bg-white animate-ping" />
                    <span>考官倾听中 (考生作答)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md text-emerald-400 text-[11px] font-bold px-2.5 py-1 rounded-md border border-white/10">
                    <div className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span>考官倾听中</span>
                  </div>
                )}
              </div>
              <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md text-white px-3 py-1 rounded-md border border-white/10 flex items-center gap-2">
                <UserCheck className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-bold">陈老师 （虚拟考官）</span>
              </div>
              <input type="file" ref={examinerFileInputRef} accept="video/*" onChange={(e) => handleExaminerVideoUpload(e, false)} className="hidden" />
              <input type="file" ref={examinerTalkingFileInputRef} accept="video/*" onChange={(e) => handleExaminerVideoUpload(e, true)} className="hidden" />
            </div>

            <div className="text-center mt-3 space-y-0.5 max-w-xs">
              <p className="text-[11px] text-stone-300 leading-relaxed font-medium">
                虚拟考官提问时将播放<b>说话循环视频</b>，学生回答时将自动切换为<b>倾听循环视频</b>（音效由 TTS 播报）。
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button type="button" onClick={() => examinerTalkingFileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/90 hover:bg-white text-natural-heading border border-natural-border shadow-xs transition cursor-pointer">
                <Upload className="h-3.5 w-3.5 text-natural-sage" /><span>更换提问视频</span>
              </button>
              <button type="button" onClick={() => examinerFileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/90 hover:bg-white text-natural-heading border border-natural-border shadow-xs transition cursor-pointer">
                <Upload className="h-3.5 w-3.5 text-natural-sage" /><span>更换倾听视频</span>
              </button>
              {(examinerVideoUrl !== DEFAULT_LISTENING_VIDEO_URL || examinerTalkingVideoUrl !== DEFAULT_TALKING_VIDEO_URL) && (
                <button type="button" onClick={handleResetExaminerVideo} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white/90 hover:bg-white text-natural-muted hover:text-natural-coral-dark border border-natural-border shadow-xs transition cursor-pointer">
                  <RotateCcw className="h-3.5 w-3.5" /><span>重置</span>
                </button>
              )}
              <button type="button" onClick={() => { setIsMuted(!isMuted); if (!isMuted) stopSpeaking(); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${isMuted ? 'bg-natural-coral/10 border-natural-coral/20 text-natural-coral-dark' : 'bg-white/90 border-natural-border text-natural-heading hover:bg-white'}`}>
                {isMuted ? <><VolumeX className="h-3.5 w-3.5" /><span>已静音</span></> : <><Volume2 className="h-3.5 w-3.5 text-natural-sage" /><span>静音考官</span></>}
              </button>
              <button type="button" onClick={() => setShowSubtitles(!showSubtitles)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${showSubtitles ? 'bg-natural-heading border-natural-heading text-white' : 'bg-white/90 border-natural-border text-natural-heading hover:bg-white'}`}>
                <Languages className="h-3.5 w-3.5 text-natural-gold" /><span>{showSubtitles ? '隐藏字幕' : '显示字幕'}</span>
              </button>
            </div>
          </div>

          <div className="bg-natural-beige/30 p-4 border-t border-natural-border flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-natural-sage shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-xs font-bold text-natural-heading">口试考场小贴士:</span>
              <p className="text-[10.5px] text-natural-muted leading-relaxed font-semibold">
                口试过程中若有 10 秒以内的停顿思考是完全正常且允许的。
                考官绝对不会插话或引导，请放心整理好思绪，再完整、流利地表达您的内容。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Interactive Chat Transcript & Voice Input */}
      <div className="lg:col-span-5 flex flex-col gap-4 min-h-[500px]">
        <div className="bg-white rounded-2xl border border-natural-border shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="border-b border-natural-border px-5 py-4 flex items-center justify-between bg-natural-beige/30">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-natural-sage" />
              <span className="text-sm font-bold text-natural-heading">提问进度</span>
            </div>
            <div className="flex items-center gap-3">
              {onExit && (
                <button type="button" onClick={onExit} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10.5px] font-bold border border-amber-200 transition cursor-pointer">
                  <RotateCcw className="h-3 w-3" /><span>退出口试</span>
                </button>
              )}
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map((num) => (
                  <div key={num} className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${currentQuestionIndex === num ? 'bg-natural-sage text-white ring-4 ring-natural-sage/20 border-natural-sage scale-110' : currentQuestionIndex > num ? 'bg-natural-coral text-white border-natural-coral' : 'bg-natural-beige/50 text-natural-muted border-natural-border'}`}>
                    {num}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 p-5 overflow-y-auto space-y-4 max-h-[360px] min-h-[300px] bg-natural-beige/10">
            {chatHistory.map((msg) => {
              const isExaminer = msg.sender === 'examiner';
              if (isExaminer && !showSubtitles) {
                return (
                  <div key={msg.id} className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-white border border-natural-border text-natural-muted shadow-sm flex items-center gap-2">
                      <Volume2 className="h-4 w-4 text-natural-sage animate-pulse" />
                      <span className="text-xs font-bold font-sans">考官正在口头朗读问题，请听声音...</span>
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className={`flex ${isExaminer ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${isExaminer ? 'bg-white border border-natural-border text-natural-text rounded-tl-none' : 'bg-natural-coral text-white rounded-tr-none border border-natural-coral/25'}`}>
                    <div className="flex justify-between items-center mb-1 gap-4">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${isExaminer ? 'text-natural-sage' : 'text-[#FFF2E6]'}`}>
                        {isExaminer ? '陈考官 (Examiner)' : '学生作答 (Student)'}
                      </span>
                      <div className="flex items-center gap-2">
                        {isExaminer && (
                          <button type="button" onClick={() => { stopSpeaking(); setIsExaminerSpeaking(true); speakChineseText(msg.text, () => setIsExaminerSpeaking(true), () => setIsExaminerSpeaking(false), () => setIsExaminerSpeaking(false)); }} className="inline-flex items-center gap-1 text-[10px] font-bold text-natural-sage hover:text-natural-heading bg-natural-sage/10 hover:bg-natural-sage/20 px-2 py-0.5 rounded transition cursor-pointer">
                            <Volume2 className="h-3 w-3" /><span>朗读</span>
                          </button>
                        )}
                        <span className={`text-[9px] ${isExaminer ? 'text-natural-muted' : 'text-[#FFF2E6]/80'}`}>
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-xs sm:text-sm font-bold leading-relaxed tracking-wide">{msg.text}</p>

                    {!isExaminer && (msg.pauseTimeSec !== undefined || msg.answerTimeSec !== undefined) && (
                      <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono text-white/90">
                        <span className="bg-black/20 px-2 py-0.5 rounded-md border border-white/20">⏱️ 思考停顿: {msg.pauseTimeSec || 0}秒</span>
                        <span className="bg-black/20 px-2 py-0.5 rounded-md border border-white/20">🎙️ 作答表达: {msg.answerTimeSec || 0}秒</span>
                      </div>
                    )}

                    {!isExaminer && msg.audioUrl && (
                      <div className="mt-2.5 pt-2 border-t border-white/20 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-white/80 font-mono flex items-center gap-1">
                          <FileAudio className="h-3 w-3 text-amber-200" /><span>第{msg.questionNumber || ''}题录音已安全保存</span>
                        </span>
                        <button type="button" onClick={() => downloadAudioFile(msg.audioUrl!, `Student_Oral_Answer_Q${msg.questionNumber || ''}_Audio_${new Date().toISOString().slice(0, 10)}`, msg.audioMimeType)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/35 text-white text-xs font-bold transition shadow-xs cursor-pointer">
                          <Download className="h-3.5 w-3.5" /><span>下载 Q{msg.questionNumber || ''} 答题录音</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isListening && interimTranscript && (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-natural-sage/10 border border-natural-sage/30 text-natural-text rounded-tr-none shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-natural-sage uppercase tracking-wide">
                    <span className="animate-ping block h-1.5 w-1.5 rounded-full bg-natural-sage shrink-0" />
                    <span>语音实时转录中 (Speaking...)</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold tracking-wide italic text-natural-heading">{interimTranscript}</p>
                </div>
              </div>
            )}

            {isLoadingResponse && (
              <div className="flex justify-start">
                <div className="max-w-[85%] bg-white border border-natural-border rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 rounded-full bg-natural-sage animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="h-2 w-2 rounded-full bg-natural-sage animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="h-2 w-2 rounded-full bg-natural-sage animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[11px] text-natural-muted font-bold">虚拟考官正在倾听并思索下一个提问...</span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-natural-border p-5 bg-natural-beige/30 space-y-4">
            <div className="flex flex-col items-center justify-center py-2 space-y-3">
              <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-white border border-natural-border shadow-xs text-xs font-bold font-mono">
                {timingPhase === 'pause' ? (
                  <div className="flex items-center gap-2 text-amber-700">
                    <Clock className="h-4 w-4 text-amber-600 animate-spin" style={{ animationDuration: '3s' }} />
                    <span className="font-sans text-[11px] font-bold text-amber-800">思考停顿 (Pause Time):</span>
                    <span className="text-sm font-extrabold text-amber-900">{formatTimerSeconds(pauseTimeSec)}</span>
                  </div>
                ) : timingPhase === 'answering' ? (
                  <div className="flex items-center gap-2 text-emerald-700 animate-pulse">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                    <span className="font-sans text-[11px] font-bold text-emerald-800">作答表达 (Answering Time):</span>
                    <span className="text-sm font-extrabold text-emerald-900">{formatTimerSeconds(answerTimeSec)}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-natural-muted font-normal">
                    <Clock className="h-3.5 w-3.5 text-natural-muted" />
                    <span className="font-sans text-[11px]">{isExaminerSpeaking ? '虚拟考官提问讲话中...' : '准备就绪，待命提问'}</span>
                  </div>
                )}
              </div>

              <div className="relative">
                {isListening && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-natural-sage/20 scale-150 voice-pulse-active" style={{ animationDelay: '0s' }} />
                    <div className="absolute inset-0 rounded-full bg-natural-sage/10 scale-175 voice-pulse-active" style={{ animationDelay: '0.5s' }} />
                  </>
                )}
                
                <button type="button" onClick={toggleListening} disabled={isLoadingResponse || isTranscribing} className={`relative z-10 h-16 w-16 rounded-full flex items-center justify-center text-white shadow-md transition-all duration-300 transform active:scale-95 cursor-pointer ${isListening ? 'bg-natural-sage hover:bg-[#5E6D55] ring-4 ring-natural-sage/20' : isTranscribing ? 'bg-natural-gold hover:bg-natural-gold/90 ring-4 ring-natural-gold/20' : 'bg-natural-coral hover:bg-natural-coral-dark ring-4 ring-natural-coral/20'}`}>
                  {isTranscribing ? <Sparkles className="h-7 w-7 animate-spin text-white" /> : <Mic className="h-7 w-7" />}
                </button>
              </div>

              <span className={`text-[11px] font-bold tracking-wide uppercase ${isListening ? 'text-natural-sage animate-pulse' : isTranscribing ? 'text-natural-gold animate-pulse' : 'text-natural-heading'}`}>
                {isListening ? '点击话筒：结束作答并提交' : isTranscribing ? '高精度 AI 语音分析转写中...' : '点击话筒：开始用华语语音作答'}
              </span>
            </div>

            <form onSubmit={handleManualSend} className="flex gap-2 items-center">
              <input type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)} disabled={isLoadingResponse || isListening || isTranscribing} placeholder={isListening ? "语音录入中..." : isTranscribing ? "高精度转写中，请稍候..." : "无法语音作答？可在此处输入中文作答并按 Enter..."} className="flex-1 rounded-xl border border-natural-border bg-white px-4 py-3 text-xs sm:text-sm focus:border-natural-sage focus:outline-none focus:ring-4 focus:ring-natural-sage/20 transition-all font-medium text-natural-text" />
              <button type="submit" disabled={!textInput.trim() || isLoadingResponse || isListening || isTranscribing} className="h-11 w-11 rounded-xl bg-natural-heading text-white hover:bg-[#433D39] disabled:bg-natural-border disabled:text-natural-muted flex items-center justify-center transition shrink-0 shadow-sm cursor-pointer">
                <Send className="h-4 w-4" />
              </button>
            </form>

            {speechError && (
              <div className="flex gap-2 items-center p-3 rounded-lg bg-natural-beige border border-natural-border text-natural-text text-xs font-semibold">
                <AlertCircle className="h-4 w-4 text-natural-gold shrink-0" />
                <span>{speechError}</span>
              </div>
            )}

            {isExamEnded && (
              <div className="pt-3 border-t border-natural-border space-y-2.5 text-center">
                <button
                  type="button"
                  onClick={handleBatchExportAudios}
                  style={{ backgroundColor: '#518DD1' }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl text-white px-5 py-3 text-xs sm:text-sm font-bold shadow-sm transition-all hover:opacity-90 active:scale-[0.99] cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>下载全部 4 段口试答题录音 (Download All 4 Recorded Audios)</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadGeminiPrompt}
                  style={{ backgroundColor: '#F0B243' }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl text-white px-5 py-3 text-xs sm:text-sm font-bold shadow-sm transition-all hover:opacity-90 active:scale-[0.99] cursor-pointer"
                >
                  <FileText className="h-4 w-4" />
                  <span>下载学生回答逐字稿与评测 Prompt (.txt)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    stopSpeaking();
                    onExamCompleted();
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-natural-sage hover:bg-[#5E6D55] text-white px-6 py-3.5 text-xs sm:text-sm font-bold shadow-md transition-all transform active:scale-[0.99] cursor-pointer"
                >
                  <span>口试已完成：提交并生成评估报告与林老师辅导</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}