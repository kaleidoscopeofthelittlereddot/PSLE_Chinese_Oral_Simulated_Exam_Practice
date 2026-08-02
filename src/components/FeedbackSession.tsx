import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, MessageSquare, Mic, Send, Volume2, User, ChevronRight, Award, GraduationCap, ArrowLeft, Download } from 'lucide-react';
import { ChatMessage } from '../types';
import { speakChineseText, stopSpeaking, unlockSpeechSynthesis, ChineseSpeechRecognizer } from '../lib/speech';

interface FeedbackSessionProps {
  apiKey: string;
  examTranscript: string;
  theme?: string;
  narration?: string;
  isGeneratingReport?: boolean;
  onFinishedFeedback: () => void;
  onBackToMenu: () => void;
  onUpdateHistory?: (history: ChatMessage[]) => void;
}

const MASTER_GUIDE_TUTOR_PROMPT = `
【MASTER GUIDE 导师与示范解题指南 (Teacher Lin Master Guide Standard)】
1. 答题架构与解题模型：
   - Q1 叙事链：引导采用“回答 + 描述 + 感受/价值观”，建立“A动作 ➡️ B反应 ➡️ A回应”动态叙事链，融合细节（时间、地点、人物、起因、经过、结果）。
   - Q2 经历分享：指导采用“时间、地点、起因、经过、结果、感受”完整故事架构。
   - Q3 思辨与 A.R.M. 高阶劝导模型：
     * P.E.E.L. 结构：观点 (Point) + 解释 (Explain) + 例子 (Example) + 总结 (Link)。面对“你同意吗”，必须先明确亮明立场。
     * 遇到“如何劝导/帮助朋友”题型，采用 A.R.M. 模型：
       1) Acknowledge (共情倾听)：先找合适时机倾听，不道德绑架或急于指责，寻找行为背后的真实压力与需求。
       2) Reframe (认知重塑)：引导看清行为的“自然后果”（Natural Consequences），指出“饮鸩止渴”、“得不偿失”等错误逻辑。
       3) Model & Motivate (身教示范与陪伴)：言传不如身教，提供高质量替代活动（户外运动、数字排毒、深度交流等）。
   - Q4 建议三维框架：从个人自律、学校/家庭教导、社会/政府推广三个维度提出切实可行的建议。
2. 词汇与成语提升：自然地融入精炼的新加坡高频华语词汇与成语（如：推心置腹、设身处地、苦口婆心、治标不治本、以身作则、言传不如身教、饮鸩止渴、得不偿失、潜移默化等）。
`;

function generateDynamicFeedbackFallback(feedbackTurn: number, themeStr: string) {
  const cleanTheme = (themeStr || "").split(" (")[0].trim() || "口试主题";
  const turn = Number(feedbackTurn) || 1;

  const apologyHeader = `非常抱歉！由于系统技术故障或网络超时，系统未能成功捕捉或记录您在本场口试中的语音作答内容，因此老师无法为您提供个性化专属点评。接下来的反馈是基于默认参考答案生成的。`;

  if (turn === 1) {
    return `${apologyHeader}\n\n针对《${cleanTheme}》主题，基于默认通用的满分答题框架，老师为您预估的分数为 23 分（满分30分）。针对这组题目，您觉得哪一题最难回答呢？`;
  } else if (turn === 2) {
    return `非常抱歉！由于系统技术故障或网络超时，因此老师无法为您提供个性化专属点评。接下来的反馈是基于默认参考答案生成的。[系统提示：基于默认通用答案的示范] 针对第1题，老师为您示范模范答案：“在录像中，我看到与《${cleanTheme}》相关的关键场景。主人公展现了良好的文明公德心。看到这一幕，我深受感动，觉得我们都应该向他学习。”您觉得这样表达是不是更清楚呢？`;
  } else if (turn === 3) {
    return `非常抱歉！由于系统技术故障或网络超时，因此老师无法为您提供个性化专属点评。接下来的反馈是基于默认参考答案生成的。[系统提示：基于默认通用答案的示范] 针对第2题，老师为您示范模范答案：“在日常生活中，我也遇到过相关的经历。有一次在学校，我和同学一起践行文明行为。经过大家的努力，事情圆满解决。这次经历让我体会到善举能带来积极的变化。”对于这些叙述技巧，你明白吗？`;
  } else if (turn === 4) {
    return `非常抱歉！由于系统技术故障或网络超时，因此老师无法为您提供个性化专属点评。接下来的反馈是基于默认参考答案生成的。[系统提示：基于默认通用答案的示范] 针对第3题，老师为您示范模范答案：“我完全同意‘关于${cleanTheme}，人人有责’这句话。首先，美好的环境依靠每个人的维护；其次，我们的文明言行能感染身边的人。”你听得出这样的答案更完整吗？`;
  } else {
    return `非常抱歉！由于系统技术故障或网络超时，因此老师无法为您提供个性化专属点评。接下来的反馈是基于默认参考答案生成的。[系统提示：基于默认通用答案的示范] 针对第4题，老师为您示范模范答案：“首先，学校可以通过宣导活动提高意识；其次，父母要以身作则；最后，社会媒体可以张贴海报。三管齐下，大家就能共同进步。”以上是指导建议，请点击下方按钮查看综合评估。`;
  }
}

export default function FeedbackSession({ apiKey, examTranscript, theme, narration, isGeneratingReport, onFinishedFeedback, onBackToMenu, onUpdateHistory }: FeedbackSessionProps) {
  const [feedbackTurn, setFeedbackTurn] = useState<number>(1);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  
  // Audio/Voice/Speech Recognition states
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isTutorSpeaking, setIsTutorSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tutorError, setTutorError] = useState<string | null>(null);

  const recognizerRef = useRef<ChineseSpeechRecognizer | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const initialTriggeredRef = useRef<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);

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
            handleStudentResponseSubmit(finalTranscript);
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
          if (err !== 'no-speech') {
            setTutorError(`语音识别出错: ${err}`);
          }
        }
      };
 
      recognizerRef.current = recognizer;
    }

    unlockSpeechSynthesis();

    if (!initialTriggeredRef.current) {
      initialTriggeredRef.current = true;
      triggerTutorTurn([], 1);
    }

    return () => stopSpeaking();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    if (onUpdateHistory && chatHistory.length > 0) {
      onUpdateHistory(chatHistory);
    }
  }, [chatHistory, interimTranscript]);

  // ==========================================
  // REFACTORED: Direct API Call for Tutor Feedback
  // ==========================================
  const callTutorAPI = async (history: ChatMessage[], turn: number) => {
    const cleanTheme = (theme || '').split(' (')[0].trim() || '口试主题';
    
    const systemInstruction = `
你现在不再是严肃的口试考官，而是一位温和、鼓励人、富有耐心的华文导师（林老师）。

${MASTER_GUIDE_TUTOR_PROMPT}

【当前考试主题】：${cleanTheme}
【旁白与背景信息】：${narration || '小六会考口试模拟'}
【学生口试实际转录文本】：
${examTranscript || '（学生尚未作答或使用极简短回答）'}

【Language & Persona 指令】
- 使用标准且亲切的新加坡华语，语气温和自然。绝对不要使用任何 Markdown 符号（不要有星号，不要加粗，不要用编号列表）。直接用自然段落流利说出。

【示范答案 Important Principles】
- 如果【学生口试实际转录文本】为空或缺失：你在 Turn 1 必须首先向家长和学生诚恳致歉，说明系统未捕捉到作答，接下来的点评是基于通用模范答案给出的。
- 模范示范答案绝对不能脱离学生的实际作答去编造无关经历。

【反馈环节：当前是第 ${turn} 个对话回合（Turn ${turn}）】
【第一回合 (Turn 1)：开场与感受】
开场打招呼：“亲爱的家长和同学，你们好！”。肯定学生。表扬3个优点。问学生：“亲爱的家长和同学，你们觉得刚才哪一题最难回答呢？”（问完立刻停止）。
【第二回合 (Turn 2)：改进与第一次示范】
简短同理。针对最难的一题指出3个进步空间。为学生示范第1题模范答案。问学生：“亲爱的家长和同学，听了老师的答案，你们觉得可以把哪一个句子学起来呢？”（立刻停止）。
【第三回合 (Turn 3)：第二次示范】
鼓励学生。针对第2题（个人经历）示范模范回答。问学生：“亲爱的家长和同学，老师答案里有哪个词语你们想记下来下次用呢？”（立刻停止）。
【第四回合 (Turn 4)：第三次示范】
鼓励学生。针对第3题（个人看法）示范模范回答。问学生：“亲爱的家长和同学，你们听得出这样的答案里，有哪个句子是下次可以试试的呢？”（立刻停止）。
【第五回合 (Turn 5)：第四次示范与收尾】
鼓励学生。针对第4题（具体建议）示范模范回答。告诉学生可以参考评分报告：“亲爱的家长和同学，今天我们就聊到这里，老师看见同学的努力，希望你们也能看见自己的进步。记得点击下载报告。加油！”（立刻停止）。
    `;

    let contents = history.map((msg: any) => ({
      role: msg.sender === 'tutor' ? 'model' : 'user',
      parts: [{ text: msg.text }],
    }));

    if (contents.length > 0 && contents[0].role === 'model') {
      contents.unshift({ role: 'user', parts: [{ text: '好的，林老师，请为我点评。' }] });
    }
    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: 'START FEEDBACK SESSION' }] });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: contents,
        generationConfig: { temperature: 0.7 }
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Gemini API Error');
    return data.candidates[0].content.parts[0].text;
  };

  const triggerTutorTurn = async (history: ChatMessage[], turnValue: number) => {
    setIsLoading(true);
    setTutorError(null);
    try {
      const text = await callTutorAPI(history, turnValue);
      const tutorMessage: ChatMessage = {
        id: `tutor-${Date.now()}`,
        sender: 'tutor',
        text: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatHistory((prev) => [...prev, tutorMessage]);
      setIsTutorSpeaking(true);
      speakChineseText(text, () => setIsTutorSpeaking(true), () => setIsTutorSpeaking(false), () => setIsTutorSpeaking(false));
    } catch (err: any) {
      console.error(err);
      const fallbackText = generateDynamicFeedbackFallback(turnValue, theme || '');
      const tutorMessage: ChatMessage = {
        id: `tutor-${Date.now()}`,
        sender: 'tutor',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatHistory((prev) => [...prev, tutorMessage]);
      speakChineseText(fallbackText, () => setIsTutorSpeaking(true), () => setIsTutorSpeaking(false), () => setIsTutorSpeaking(false));
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentResponseSubmit = async (responseText: string) => {
    if (!responseText.trim() || isLoading || isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    try {
      const studentMessage: ChatMessage = {
        id: `student-${Date.now()}`,
        sender: 'student',
        text: responseText.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const updatedHistory = [...chatHistory, studentMessage];
      setChatHistory(updatedHistory);
      setTextInput('');
      setInterimTranscript('');

      if (feedbackTurn < 5) {
        const nextTurn = feedbackTurn + 1;
        setFeedbackTurn(nextTurn);
        setTimeout(() => triggerTutorTurn(updatedHistory, nextTurn), 300);
      } else {
        setTimeout(() => onFinishedFeedback(), 1500);
      }
    } finally {
      setTimeout(() => { isSubmittingRef.current = false; }, 600);
    }
  };

  const startMediaRecorder = async () => {
    audioChunksRef.current = [];
    setTutorError(null);
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
          await transcribeAudio(audioBlob, mimeType);
        }
      };

      mediaRecorder.start(200);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setTutorError('麦克风权限被拒绝，无法进行录音互动。');
      } else {
        setTutorError('无法启动高精度麦克风，已切换到普通语音识别。');
      }
    }
  };

  // ==========================================
  // REFACTORED: Direct Multimodal Transcription
  // ==========================================
  const transcribeAudio = async (blob: Blob, mimeType: string) => {
    setIsTranscribing(true);
    setTutorError(null);
    try {
      const base64Promise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const base64Audio = await base64Promise;

      const currentQuestion = "华文口试辅导：林老师点评与互动";
      const prompt = `你是一位极其严谨的中文听写员。请将这段语音文件高精度地转写为简体中文文本。注意：这是一个小学生在进行口试互动辅导。请连贯准确地转写出来，忽略长停顿。只返回转写文本。语境参考：“${currentQuestion}”`;

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
        handleStudentResponseSubmit(cleanText);
      } else {
        setTutorError('未检测到清晰的华语说话声音，请重新录制。');
      }
    } catch (err: any) {
      console.error('Tutor session transcription API error:', err);
      if (textInput.trim()) {
        const fallbackText = textInput.trim();
        setTextInput('');
        setInterimTranscript('');
        handleStudentResponseSubmit(fallbackText);
      } else {
        setTutorError('AI 语音高精度转写失败。请重新发言或使用键盘输入。');
      }
    } finally {
      setIsTranscribing(false);
    }
  };

  const toggleListening = () => {
    setTutorError(null);
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
      setIsTutorSpeaking(false);
      setInterimTranscript('');
      setTextInput('');
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
    handleStudentResponseSubmit(textInput);
  };

  const handleDownloadTranscript = () => {
    if (chatHistory.length === 0) return;
    const cleanTheme = theme ? theme.split(' (')[0].replace(/[/\\?%*:|"<>]/g, '').trim() : '';
    const themeSegment = cleanTheme ? `${cleanTheme}_` : '';
    const dateStr = new Date().toLocaleDateString('zh-SG', { year: 'numeric', month: 'long', day: 'numeric' });

    const chatItemsHtml = chatHistory.map((msg) => {
      const isTutor = msg.sender === 'tutor';
      const speaker = isTutor ? '【林老师】' : '【学生】';
      const badgeClass = isTutor ? 'badge-tutor' : 'badge-student';
      const cardClass = isTutor ? 'card-tutor' : 'card-student';
      
      const safeText = msg.text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/\n/g, '<br/>');

      return `
        <div class="chat-card ${cardClass}">
          <div class="chat-header">
            <span class="speaker-badge ${badgeClass}">${speaker}</span>
            <span class="timestamp">${msg.timestamp || ''}</span>
          </div>
          <div class="chat-body">${safeText}</div>
        </div>
      `;
    }).join('\n');

    const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>PSLE 华文模拟口试练习：AI 林老师一对一口试辅导逐字稿 - ${cleanTheme || '看录像说话'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; padding: 32px; color: #2D3748; background: #FDFCF8; max-width: 880px; margin: 0 auto; line-height: 1.6; }
    .header { border-bottom: 3px solid #7A8C70; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    h1 { color: #2D3748; font-size: 22px; margin: 0; font-weight: 800; line-height: 1.3; }
    .subtitle { color: #718096; font-size: 13px; margin-top: 6px; font-weight: 600; display: flex; gap: 8px; flex-wrap: wrap; }
    .meta-badge { display: inline-block; background: #EFECE6; color: #5E6D55; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; }
    .btn-print { background: #7A8C70; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; font-size: 13px; cursor: pointer; transition: background 0.2s; }
    .btn-print:hover { background: #65755B; }
    .transcript-container { display: flex; flex-direction: column; gap: 14px; margin-bottom: 28px; }
    .chat-card { border-radius: 12px; padding: 16px; border: 1px solid #E2E8F0; background: #FFFFFF; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
    .card-tutor { border-left: 4px solid #7A8C70; background: #F9FAF8; }
    .card-student { border-left: 4px solid #D97706; background: #FFFFFF; }
    .chat-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .speaker-badge { font-size: 12px; font-weight: bold; padding: 2px 8px; border-radius: 6px; }
    .badge-tutor { background: #EBF0E9; color: #43523B; }
    .badge-student { background: #FEF3C7; color: #92400E; }
    .timestamp { font-size: 11px; color: #A0AEC0; font-family: monospace; }
    .chat-body { font-size: 14px; color: #2D3748; line-height: 1.6; word-break: break-word; }
    .footer { border-top: 1px solid #E2E8F0; padding-top: 20px; text-align: center; color: #718096; font-size: 13px; font-weight: 500; }
    @media print { body { padding: 0; background: #FFF; } .no-print { display: none; } .chat-card { break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; text-align: right;">
    <button class="btn-print" onclick="window.print()">打印 / 保存 PDF 逐字稿</button>
  </div>
  <div class="header">
    <div>
      <h1>PSLE 华文模拟口试练习：AI 林老师一对一口试辅导逐字稿</h1>
      <div class="subtitle">
        <span class="meta-badge">口试主题：${theme || '看录像说话'}</span>
        <span class="meta-badge">生成日期：${dateStr}</span>
      </div>
    </div>
  </div>
  <div class="transcript-container">
    ${chatItemsHtml}
  </div>
  <div class="footer">
    感谢使用 PSLE 华文模拟口试练习 AI 辅导系统！
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `林老师口试辅导逐字稿_${themeSegment}${new Date().toISOString().slice(0,10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto my-6 font-sans">
      {/* Left Panel: Warm Tutor Persona */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="bg-white rounded-2xl border border-natural-border shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="bg-natural-beige border-b border-natural-border px-5 py-4 flex items-center justify-between">
            <button onClick={onBackToMenu} className="flex items-center gap-1.5 text-xs font-bold text-natural-sage hover:text-natural-heading transition cursor-pointer">
              <ArrowLeft className="h-3.5 w-3.5" /><span>返回选择</span>
            </button>
            <div className="flex items-center gap-2 text-natural-heading">
              <GraduationCap className="h-5 w-5 text-natural-sage" />
              <span className="font-display font-bold text-sm tracking-wide">AI 老师辅导</span>
            </div>
            <div className="hidden sm:block rounded-full bg-natural-sage/20 px-2 py-0.5 text-[10px] font-mono font-bold tracking-wide border border-natural-sage/30 text-natural-sage">
              一对一课堂
            </div>
          </div>

          <div className="flex-1 bg-gradient-to-b from-[#FDFCF8] to-[#F2EDE4] p-6 flex flex-col items-center justify-center text-center">
            <div className="relative mb-6">
              <div className={`absolute inset-0 rounded-full bg-natural-sage/10 blur-xl scale-125 transition-all ${isTutorSpeaking ? 'animate-pulse bg-natural-sage/20' : ''}`} />
              <div className={`relative h-28 w-28 rounded-full border-4 flex items-center justify-center shadow-md transition-all ${isTutorSpeaking ? 'border-natural-sage ring-4 ring-natural-sage/15 bg-white' : 'border-natural-border bg-white'}`}>
                <div className="flex flex-col items-center justify-center">
                  <span className="font-display text-4xl font-bold text-natural-sage">林</span>
                  <span className="text-[10px] text-natural-muted font-bold mt-1">AI 华文老师</span>
                </div>
                {isTutorSpeaking && (
                  <div className="absolute -bottom-2 flex items-center gap-0.5 px-2.5 py-1 rounded-full bg-natural-sage text-white text-[9px] font-bold shadow-md">
                    <Volume2 className="h-3 w-3 animate-bounce" />
                    <span>AI 林老师朗读中</span>
                  </div>
                )}
              </div>
            </div>

            <h4 className="font-bold text-natural-heading text-sm">AI 林老师 (AI Teacher Lin)</h4>
            <p className="text-xs text-natural-muted leading-relaxed max-w-xs mt-1.5 font-semibold">
              AI 林老师正为您细心剖析刚刚的口试表现。她将口头示范四道考题的模范答案！
            </p>

            {chatHistory.some(m => m.sender === 'tutor') && (
              <button
                type="button"
                onClick={() => {
                  const lastTutorMsg = [...chatHistory].reverse().find(m => m.sender === 'tutor');
                  if (lastTutorMsg) {
                    stopSpeaking();
                    unlockSpeechSynthesis();
                    setIsTutorSpeaking(true);
                    speakChineseText(lastTutorMsg.text, () => setIsTutorSpeaking(true), () => setIsTutorSpeaking(false), () => setIsTutorSpeaking(false));
                  }
                }}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-natural-sage/15 hover:bg-natural-sage/25 text-natural-sage text-xs font-bold transition cursor-pointer border border-natural-sage/20"
                title="重新播放AI林老师最新点评"
              >
                <Volume2 className="h-3.5 w-3.5" /><span>朗读最新点评语音</span>
              </button>
            )}

            <div className="w-full mt-8 max-w-sm space-y-2 border-t border-natural-border pt-6">
              <span className="text-[10px] font-bold text-natural-muted uppercase tracking-wider block mb-3 text-left">辅导进度:</span>
              <div className="flex justify-between">
                {[1, 2, 3, 4, 5].map((step) => (
                  <div key={step} className={`flex flex-col items-center gap-1.5 flex-1 relative ${step < 5 ? 'after:content-[""] after:h-[2px] after:w-full after:bg-natural-border after:absolute after:top-3.5 after:left-[50%] after:z-0' : ''}`}>
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold relative z-10 transition-all ${feedbackTurn === step ? 'bg-natural-sage text-white ring-4 ring-natural-sage/20 border-natural-sage scale-110' : feedbackTurn > step ? 'bg-natural-coral text-white border-natural-coral' : 'bg-natural-beige/50 text-natural-muted border-natural-border'}`}>
                      {step}
                    </div>
                    <span className={`text-[9px] font-bold transition-all ${feedbackTurn === step ? 'text-natural-sage' : 'text-natural-muted'}`}>
                      {step === 1 && '1.感受'}
                      {step === 2 && '2.示范Q1'}
                      {step === 3 && '3.示范Q2'}
                      {step === 4 && '4.示范Q3'}
                      {step === 5 && '5.示范Q4'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Interactive Tutor Conversation */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        <div className="bg-white rounded-2xl border border-natural-border shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="border-b border-natural-border px-5 py-4 flex items-center justify-between bg-natural-beige/30">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-natural-sage" />
              <span className="text-sm font-bold text-natural-heading">AI 林老师的辅导反馈实录</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-natural-sage bg-natural-sage/10 px-2.5 py-0.5 rounded-full border border-natural-sage/20">
                Turn {feedbackTurn} of 5
              </span>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 p-5 overflow-y-auto space-y-4 max-h-[380px] min-h-[300px] bg-natural-beige/10">
            {chatHistory.map((msg) => {
              const isTutor = msg.sender === 'tutor';
              return (
                <div key={msg.id} className={`flex ${isTutor ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${isTutor ? 'bg-white border border-natural-border text-natural-text rounded-tl-none' : 'bg-natural-coral text-white rounded-tr-none border border-natural-coral/25'}`}>
                    <div className="flex justify-between items-center mb-1 gap-4">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${isTutor ? 'text-natural-sage' : 'text-[#FFF2E6]'}`}>
                        {isTutor ? 'AI 林老师 (AI Teacher Lin)' : '家长和学生 (Parent & Student)'}
                      </span>
                      <div className="flex items-center gap-2">
                        {isTutor && (
                          <button type="button" onClick={() => { stopSpeaking(); unlockSpeechSynthesis(); setIsTutorSpeaking(true); speakChineseText(msg.text, () => setIsTutorSpeaking(true), () => setIsTutorSpeaking(false), () => setIsTutorSpeaking(false)); }} className="inline-flex items-center gap-1 text-[10px] font-bold text-natural-sage hover:text-natural-heading bg-natural-sage/10 hover:bg-natural-sage/20 px-2 py-0.5 rounded transition cursor-pointer" title="重新朗读此点评">
                            <Volume2 className="h-3 w-3" /><span>朗读</span>
                          </button>
                        )}
                        <span className={`text-[9px] ${isTutor ? 'text-natural-muted' : 'text-[#FFF2E6]/80'}`}>
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm font-bold leading-relaxed tracking-wide">{msg.text}</p>
                  </div>
                </div>
              );
            })}

            {isListening && interimTranscript && (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-natural-sage/10 border border-natural-sage/30 text-natural-text rounded-tr-none shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-natural-sage uppercase tracking-wide">
                    <span className="animate-ping block h-1.5 w-1.5 rounded-full bg-natural-sage" />
                    <span>语音录入中 (Speaking...)</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold tracking-wide italic text-natural-heading">{interimTranscript}</p>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] bg-white border border-natural-border rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 rounded-full bg-natural-sage animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="h-2 w-2 rounded-full bg-natural-sage animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="h-2 w-2 rounded-full bg-natural-sage animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[11px] text-natural-muted font-bold">AI 林老师正在组织教学点评与模范答案...</span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-natural-border p-5 bg-natural-beige/30 space-y-4">
            <div className="flex flex-col items-center justify-center py-1 space-y-2">
              <div className="relative">
                {isListening && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-natural-sage/20 scale-150 voice-pulse-active" style={{ animationDelay: '0s' }} />
                    <div className="absolute inset-0 rounded-full bg-natural-sage/10 scale-175 voice-pulse-active" style={{ animationDelay: '0.5s' }} />
                  </>
                )}
                
                <button type="button" onClick={toggleListening} disabled={isLoading || isTranscribing} className={`relative z-10 h-14 w-14 rounded-full flex items-center justify-center text-white shadow-md transition-all duration-300 transform active:scale-95 cursor-pointer ${isListening ? 'bg-natural-sage hover:bg-[#5E6D55] ring-4 ring-natural-sage/20' : isTranscribing ? 'bg-natural-gold hover:bg-natural-gold/90 ring-4 ring-natural-gold/20' : 'bg-natural-coral hover:bg-natural-coral-dark ring-4 ring-natural-coral/20'}`}>
                  {isTranscribing ? <Sparkles className="h-6 w-6 animate-spin text-white" /> : <Mic className="h-6 w-6" />}
                </button>
              </div>
              <span className={`text-[10.5px] font-bold tracking-wide uppercase ${isListening ? 'text-natural-sage animate-pulse' : isTranscribing ? 'text-natural-gold animate-pulse' : 'text-natural-heading'}`}>
                {isListening ? '点击话筒：结束发言并发送' : isTranscribing ? '高精度 AI 语音分析转写中...' : '点击话筒：用华语与林老师开展语音反馈'}
              </span>

              {chatHistory.length > 0 && (
                <div className="pt-1.5">
                  <button type="button" onClick={handleDownloadTranscript} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-natural-sage/15 hover:bg-natural-sage/25 text-natural-sage text-xs font-bold border border-natural-sage/30 transition shadow-xs cursor-pointer active:scale-95" title="下载AI林老师口试辅导对话逐字稿 (.html)">
                    <Download className="h-4 w-4 shrink-0" /><span>下载老师口试辅导逐字稿 (.html)</span>
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={handleManualSend} className="flex gap-2">
              <input type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)} disabled={isLoading || isListening || isTranscribing} placeholder={isListening ? "语音录入中..." : isTranscribing ? "高精度转写中，请稍候..." : "在此输入您的回应并按 Enter..."} className="flex-1 rounded-xl border border-natural-border bg-white px-4 py-3 text-xs sm:text-sm focus:border-natural-sage focus:outline-none focus:ring-4 focus:ring-natural-sage/20 transition-all font-medium text-natural-text" />
              <button type="submit" disabled={!textInput.trim() || isLoading || isListening || isTranscribing} className="h-11 w-11 rounded-xl bg-natural-heading text-white hover:bg-[#433D39] disabled:bg-natural-border disabled:text-natural-muted flex items-center justify-center transition shrink-0 shadow-sm cursor-pointer">
                <Send className="h-4 w-4" />
              </button>
            </form>

            {tutorError && (
              <div className="flex gap-2 items-center p-3 rounded-lg bg-natural-beige border border-natural-border text-natural-text text-xs font-semibold">
                <span>{tutorError}</span>
              </div>
            )}

            {feedbackTurn >= 5 && !isLoading && (
              <div className="pt-3 border-t border-natural-border text-center">
                <button type="button" onClick={onFinishedFeedback} disabled={isGeneratingReport} className="inline-flex items-center gap-2 rounded-xl bg-natural-sage hover:bg-[#5E6D55] text-white px-6 py-3.5 text-xs sm:text-sm font-bold shadow-md transition-all transform active:scale-[0.99] cursor-pointer disabled:opacity-80 disabled:cursor-wait">
                  {isGeneratingReport ? (
                    <><Sparkles className="h-4 w-4 animate-spin text-white" /><span>正在为您生成模拟口试练习综合评估，请稍候...</span></>
                  ) : (
                    <><span>辅导已结束：查看我的模拟口试练习综合评估</span><ChevronRight className="h-4 w-4" /></>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}