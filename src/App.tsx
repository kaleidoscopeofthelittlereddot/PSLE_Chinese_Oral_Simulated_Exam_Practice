import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ThemeInputForm from './components/ThemeInputForm';
import VideoPlayer from './components/VideoPlayer';
import OralExamSession from './components/OralExamSession';
import FeedbackSession from './components/FeedbackSession';
import EvaluationReport from './components/EvaluationReport';
import { ExamConfig, ExamState, ChatMessage, ExamReport } from './types';
import { Sparkles, Award, GraduationCap, ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { unlockSpeechSynthesis } from './lib/speech';

export default function App() {
  // ==========================================
  // Secure Input Logic (BYOK)
  // ==========================================
  const [userApiKey, setUserApiKey] = useState<string>('');
  const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);

  // Check for saved API key on initial load
  useEffect(() => {
    const savedKey = localStorage.getItem('user_gemini_api_key');
    if (savedKey) {
      setUserApiKey(savedKey);
    } else {
      setIsKeyModalOpen(true);
    }
  }, []);

  const handleSaveKey = () => {
    const inputElement = document.getElementById('api-key-input') as HTMLInputElement;
    const keyInput = inputElement?.value;
    
    if (keyInput && keyInput.trim()) {
      localStorage.setItem('user_gemini_api_key', keyInput.trim());
      setUserApiKey(keyInput.trim());
      setIsKeyModalOpen(false);
    } else {
      alert("请输入有效的 Gemini API Key (Please enter a valid API key).");
    }
  };

  const handleResetKey = () => {
    localStorage.removeItem('user_gemini_api_key');
    setUserApiKey('');
    setIsKeyModalOpen(true);
  };

  // ==========================================
  // Original App State
  // ==========================================
  const [examState, setExamState] = useState<ExamState>('setup');
  const [config, setConfig] = useState<ExamConfig | null>(null);
  
  // Conversation History
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(1);
  
  // Evaluation & Assessment states
  const [report, setReport] = useState<ExamReport | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [feedbackHistory, setFeedbackHistory] = useState<ChatMessage[]>([]);

  // Session Auto-save & Recovery state
  const [savedSessionFound, setSavedSessionFound] = useState<any | null>(null);

  useEffect(() => {
    try {
      const savedRaw = localStorage.getItem('psle_oral_active_session');
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        if (parsed && parsed.config && parsed.examState && parsed.examState !== 'setup') {
          setSavedSessionFound(parsed);
        }
      }
    } catch (err) {
      console.warn('Could not read saved session:', err);
    }
  }, []);

  // Auto-save active session state changes to localStorage (excluding heavy audio binary payloads)
  useEffect(() => {
    if (examState === 'setup') {
      localStorage.removeItem('psle_oral_active_session');
      return;
    }
    try {
      // Strip out heavy audio payloads (audioBase64 & audioUrl) to fit safely within localStorage quota (5MB)
      // Note: Full audio recordings are persistently stored in IndexedDB (audioBackupDB)
      const sanitizedHistory = chatHistory.map((msg) => {
        const { audioBase64, audioUrl, ...rest } = msg;
        return rest;
      });

      const sessionToSave = {
        examState,
        config,
        chatHistory: sanitizedHistory,
        currentQuestionIndex,
        report,
        timestamp: Date.now(),
      };
      localStorage.setItem('psle_oral_active_session', JSON.stringify(sessionToSave));
    } catch (err) {
      console.warn('Auto-save session failed:', err);
    }
  }, [examState, config, chatHistory, currentQuestionIndex, report]);

  const restoreSession = () => {
    if (!savedSessionFound) return;
    setConfig(savedSessionFound.config || null);
    setChatHistory(savedSessionFound.chatHistory || []);
    setCurrentQuestionIndex(savedSessionFound.currentQuestionIndex || 1);
    setReport(savedSessionFound.report || null);

    if (savedSessionFound.report) {
      setExamState('report_ready');
    } else {
      const studentAnswers = (savedSessionFound.chatHistory || []).filter((m: any) => m.sender === 'student');
      if (studentAnswers.length >= 4 || savedSessionFound.examState === 'exam_completed') {
        setExamState('exam_completed');
      } else {
        setExamState(savedSessionFound.examState || 'setup');
      }
    }
    setSavedSessionFound(null);
  };

  const dismissSavedSession = () => {
    localStorage.removeItem('psle_oral_active_session');
    setSavedSessionFound(null);
  };

  const handleRestart = () => {
    localStorage.removeItem('psle_oral_active_session');
    setSavedSessionFound(null);
    setExamState('setup');
    setConfig(null);
    setChatHistory([]);
    setCurrentQuestionIndex(1);
    setReport(null);
    setReportError(null);
    setIsGeneratingReport(false);
  };

  const handleStartConfig = (newConfig: ExamConfig) => {
    unlockSpeechSynthesis();
    setConfig(newConfig);
    setExamState('video_watching');
  };

  const handleFinishedWatching = () => {
    unlockSpeechSynthesis();
    setExamState('exam_active');
  };

  const handleExamCompleted = () => {
    setExamState('exam_completed');
  };

  const generateExamTranscript = () => {
    return chatHistory
      .map((msg) => `${msg.sender === 'examiner' ? '考官' : '学生'}：${msg.text}`)
      .join('\n');
  };

  // ==========================================
  // REFACTORED: Generate Exam Report (Direct Client-Side API Call)
  // ==========================================
  const handleGenerateReport = async () => {
    if (!config) return;
    setIsGeneratingReport(true);
    setReportError(null);

    // Extract student audio clips from chatHistory
    const studentAudios = chatHistory
      .filter((msg) => msg.sender === 'student')
      .map((msg) => {
        let base64 = msg.audioBase64 || '';
        if (!base64 && msg.audioUrl && msg.audioUrl.startsWith('data:audio/')) {
          base64 = msg.audioUrl.split(',')[1] || '';
        }
        return {
          questionNumber: msg.questionNumber,
          mimeType: msg.audioMimeType || 'audio/webm',
          base64: base64,
          text: msg.text,
        };
      })
      .filter((item) => item.base64.length > 0);
    
    const feedbackTranscript = feedbackHistory.length > 0
      ? feedbackHistory.map((m) => `${m.sender === 'tutor' ? '【林老师】' : '【学生】'}：${m.text}`).join('\n')
      : undefined;

    try {
      const scenesText = (config.scenes || []).map((s: any) => `场景 ${s.sceneNumber}：${s.description}`).join('\n');
      
      const systemInstruction = `
你是一位经验丰富的新加坡教育部 (MOE) PSLE 华文口试特级考官。
请针对以下学生的模拟口试看录像说话 (Video Conversation) 环节进行严谨专业的评估。
【口试主题】：${config.theme}
【旁白宣传】：${config.narration}
【录像场景】：\n${scenesText}

【评估指令】：
请严格依据新加坡 MOE 小六会考标准，从语音与声调(8分)、表达流利度(8分)、内容充实(8分)、词汇与句型(6分)四个维度进行评估。总分为30分。
如果你收到了音频文件，请结合音频评估发音和流利度，并指出特定的发音错误。
必须返回纯 JSON 格式数据，不得包含任何 Markdown 语法（如 \`\`\`json）。
JSON 必须包含以下结构：
- total_score: 整数 (满分30)
- rubric_breakdown: 包含 pronunciation_and_tones, fluency_and_delivery, content_elaboration, vocabulary_expression，每个维度有 score, max_score, observations。
- specific_phonetic_errors: 数组，包含 word, student_pronounced_as, correct_pinyin, error_type。
- teacher_coaching_feedback: 导师综合建议字符串。
- analysis: 对象，包含 q1, q2, q3, q4 的分析字符串。
- strengths: 数组，3个表现好的地方。
- weaknesses: 数组，3个需要改进的地方。
- modelAnswers: 对象，包含 q1, q2, q3, q4 的高分示范答案。
      `;

      const parts: any[] = [];
      
      // Attach student audios for Multimodal evaluation
      if (studentAudios.length > 0) {
        studentAudios.forEach((audio: any) => {
          const cleanMime = audio.mimeType.split(';')[0].trim();
          parts.push({
            inlineData: {
              mimeType: cleanMime,
              data: audio.base64,
            },
          });
        });
      }

      // Attach text transcript
      parts.push({
        text: `【学生口试实际转录文本】：\n${generateExamTranscript() || '（学生未进行对话或转录文本为空）'}\n\n【导师辅导记录】：\n${feedbackTranscript || '无'}`
      });

      // Call Google Gemini API
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${userApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: 'user', parts: parts }],
          generationConfig: { 
            response_mime_type: "application/json" 
          }
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Gemini API Error');
      }

      const responseText = data.candidates[0].content.parts[0].text;
      const reportData = JSON.parse(responseText);

      const finalScore = reportData.total_score !== undefined ? reportData.total_score : reportData.score;
      if (finalScore !== undefined) {
        setReport({
          ...reportData,
          score: finalScore,
          total_score: finalScore,
        });
        setExamState('report_ready');
      } else {
        throw new Error('解析分数失败');
      }
    } catch (err: any) {
      console.error(err);
      setReportError('生成评分报告出错，请确保您的 API Key 有效且网络畅通。如果您未完全作答，考官可能无法合理评分。');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleStartFeedback = () => {
    unlockSpeechSynthesis();
    setExamState('feedback_active');
  };

  const handleFinishedFeedback = () => {
    if (report) {
      setExamState('report_ready');
    } else {
      handleGenerateReport();
    }
  };

return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col selection:bg-[#518DD1]/20 selection:text-[#3A322A]" style={{ fontFamily: 'Georgia, "Kaiti", "KaiTi", "STKaiti", "楷体", serif' }}>
      {/* BYOK Modal */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 bg-[#3A322A]/60 flex items-center justify-center z-[100] backdrop-blur-sm">
          <div className="bg-[#FFFFFF] p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-[#3A322A]/10">
            <h2 className="text-2xl font-bold text-[#3A322A] mb-2">PSLE 华文模拟口试练习</h2>
            <p className="text-sm text-[#554C43] mb-6 leading-relaxed">

              <span className="block mb-2">请提供您的 Google Gemini API Key。该密钥将安全地保存在您的本地浏览器中。首页末端可以随时重置 API Key。</span>
              <span className="block mb-2 text-xs text-[#857d75]"><strong>Please paste your personal Google Gemini API Key here.</strong></span>
              <span className="block mb-2 text-xs text-[#857d75]">Your API Key will only be stored in your local browser cache.</span>
              <span className="block text-[0.6rem] text-[#857d75]"><strong>Clear API Key</strong> button is at the footer of the app. If you are using a shared device, please ensure you click 'Clear API Key' when you are finished practicing to remove your key from this browser.</span>
            </p>
            <div className="relative mb-6">
              <input 
                type={showApiKey ? "text" : "password"} 
                id="api-key-input"
                placeholder="AIzaSy..." 
                className="w-full border border-[#3A322A]/20 p-3 pr-12 rounded-lg focus:ring-2 focus:ring-[#518DD1] outline-none transition font-mono text-sm bg-[#f2f4f4]"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#554C43] hover:text-[#E25858] transition cursor-pointer"
                title={showApiKey ? "隐藏密钥 (Hide Key)" : "显示密钥 (Show Key)"}
              >
                {showApiKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <button 
              onClick={handleSaveKey}
              className="bg-[#518DD1] text-white w-full py-3 rounded-lg font-bold hover:bg-[#F0B243] transition-all duration-300 shadow-[0_4px_15px_rgba(226,88,88,0.2)] hover:shadow-[0_6px_20px_rgba(226,88,88,0.3)] hover:-translate-y-[1px]"
            >
              保存并开始 (Save & Start)
            </button>

<span className="block my-2 text-center text-[0.45rem]">By saving your key, you confirm you are a parent/guardian and agree to our Terms of Use and Privacy Policy.</span>
          </div>
        </div>
      )}

      {/* Main Interface */}
      {!isKeyModalOpen && (
        <>
          <Header examState={examState} theme={config?.theme} />

          {/* Session Recovery Banner */}
          {savedSessionFound && (
            <div className="bg-amber-50/90 border-b border-amber-200/80 px-4 py-3 text-amber-900 flex flex-wrap items-center justify-between gap-3 text-xs font-medium max-w-7xl mx-auto w-full shadow-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  检测到您上次未完成的口试会话：<b>《{savedSessionFound.config?.theme || '华文口试模拟'}》</b> ({new Date(savedSessionFound.timestamp).toLocaleTimeString('zh-SG')} 保存)
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={restoreSession} className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition shadow-xs cursor-pointer flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>恢复上次口试与报告</span>
                </button>
                <button onClick={dismissSavedSession} className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold rounded-lg transition cursor-pointer">
                  放弃并开启新会话
                </button>
              </div>
            </div>
          )}

          <main className="flex-grow px-4 sm:px-6 lg:px-8 py-8">
            {examState === 'setup' && (
              <ThemeInputForm apiKey={userApiKey} onStartConfig={handleStartConfig} />
            )}

            {examState === 'video_watching' && config && (
              <VideoPlayer config={config} onFinishedWatching={handleFinishedWatching} />
            )}

            {examState === 'exam_active' && config && (
              <OralExamSession
                apiKey={userApiKey}
                config={config}
                chatHistory={chatHistory}
                setChatHistory={setChatHistory}
                currentQuestionIndex={currentQuestionIndex}
                setCurrentQuestionIndex={setCurrentQuestionIndex}
                onExamCompleted={handleExamCompleted}
                onExit={handleRestart}
              />
            )}

            {examState === 'exam_completed' && config && (
              <div className="max-w-2xl mx-auto my-12 text-center space-y-8 bg-white p-8 sm:p-10 rounded-3xl border border-slate-100 shadow-xl">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 shadow-md">
                  <CheckCircle className="h-10 w-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-display font-bold text-gray-900 tracking-tight">恭喜您完成华文口试模拟练习！</h3>
                  <p className="text-xs sm:text-sm text-gray-500 leading-relaxed font-medium">
                    您已经顺利回答完了考官的四道问题。现在，您可以选择立即查看您的详细模拟口试练习综合评估，或者开启林老师的一对一语音点评辅导。
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                  <button onClick={handleStartFeedback} disabled={isGeneratingReport} className="flex flex-col items-center justify-center p-6 border border-emerald-100 rounded-2xl text-left bg-emerald-50/20 hover:bg-emerald-50/50 transition duration-300 group shadow-sm disabled:opacity-50">
                    <GraduationCap className="h-8 w-8 text-emerald-600 mb-3 group-hover:scale-110 transition duration-300" />
                    <span className="font-bold text-sm text-gray-900">开启林老师语音点评</span>
                    <span className="text-[10px] text-gray-500 mt-1 font-medium text-center">获得林老师逐题的口头指导与模范答案示范。</span>
                  </button>

                  <button onClick={handleGenerateReport} disabled={isGeneratingReport} className="flex flex-col items-center justify-center p-6 border border-blue-100 rounded-2xl text-left bg-blue-50/20 hover:bg-blue-50/50 transition duration-300 group shadow-sm disabled:opacity-50">
                    <Award className="h-8 w-8 text-moe-blue mb-3 group-hover:scale-110 transition duration-300" />
                    <span className="font-bold text-sm text-gray-900">查看详细模拟口试练习综合评估</span>
                    <span className="text-[10px] text-gray-500 mt-1 font-medium text-center">详细分析答题要点，列出3个亮点与3个改进建议。</span>
                  </button>
                </div>

                {isGeneratingReport && (
                  <div className="space-y-2.5 pt-4">
                    <div className="flex gap-1 justify-center">
                      <div className="h-2.5 w-2.5 rounded-full bg-moe-blue animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="h-2.5 w-2.5 rounded-full bg-moe-blue animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="h-2.5 w-2.5 rounded-full bg-moe-blue animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <p className="text-xs font-bold text-slate-500">
                      AI 考官正在对您的录音转录文本开展严谨的评分与内容深度析评，请稍候...
                    </p>
                  </div>
                )}

                {reportError && (
                  <p className="text-xs font-semibold text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                    {reportError}
                  </p>
                )}

                <div className="pt-4 border-t border-slate-100">
                  <button onClick={handleRestart} className="text-xs font-bold text-slate-400 hover:text-gray-600 flex items-center justify-center gap-1.5 mx-auto transition">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>返回重新配置主题</span>
                  </button>
                </div>
              </div>
            )}

            {examState === 'feedback_active' && config && (
              <FeedbackSession
                apiKey={userApiKey}
                theme={config.theme}
                narration={config.narration}
                examTranscript={generateExamTranscript()}
                isGeneratingReport={isGeneratingReport}
                onFinishedFeedback={handleFinishedFeedback}
                onBackToMenu={() => setExamState('exam_completed')}
                onUpdateHistory={(history) => setFeedbackHistory(history)}
              />
            )}

            {examState === 'report_ready' && report && config && (
              <EvaluationReport
                report={report}
                theme={config.theme}
                chatHistory={chatHistory}
                onRestart={handleRestart}
                onBackToMenu={() => setExamState('exam_completed')}
                onGoToFeedback={handleStartFeedback}
              />
            )}
          </main>

<footer className="border-t border-slate-100 bg-white py-6">
  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-xs font-medium text-gray-400 font-sans">
   
    <span className="text-[10px] mt-1 text-center">
      * <strong>Disclaimer:</strong> This application is powered by the Google Gemini API. AI-generated outputs can contain errors; please independently verify all critical feedback and analysis.
    </span>
    <span className="text-[10px] mt-0.5 text-center">
      * <strong>免责声明：</strong> 本应用由 Google Gemini API 提供技术支持。人工智能生成的输出可能会存在错误，请务必自行核实所有重要的反馈与分析信息。
    </span>
        <a href="../index.html#disclaimer" className="mt-2 text-[11px] text-gray-400 hover:text-red-500 underline transition">
      <strong>条款与免责声明 Terms & Disclaimer</strong>
    </a>
	<div style={{ fontSize: '0.7rem', color: '#857d75', textAlign: 'center', marginTop: '20px', lineHeight: 1.6 }}>
  <button 
    type="button"
    onClick={() => {
      localStorage.removeItem('user_gemini_api_key');
      window.location.reload();
    }} 
    className="inline-flex items-center justify-center gap-2 rounded-xl bg-transparent hover:bg-[#518DD1] px-4 py-2 text-[0.5rem] font-bold text-[#3A322A] hover:text-white border border-[#3A322A]/30 hover:border-[#518DD1] shadow-sm focus:outline-none transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] cursor-pointer"
  >
    Clear API Key | 清除 API 密钥 
  </button>
</div>
  </div>
</footer>

        </>
      )}
    </div>
  );
}