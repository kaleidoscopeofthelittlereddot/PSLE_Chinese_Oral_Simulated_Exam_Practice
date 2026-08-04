import React, { useState, useEffect } from 'react';
import { Award, CheckCircle2, AlertCircle, RefreshCw, FileText, ChevronRight, BookOpen, Star, HelpCircle, ArrowLeft, GraduationCap, Sparkles, Volume2, VolumeX, Download, Copy, Check, FileAudio, Clock } from 'lucide-react';
import { ExamReport, ChatMessage } from '../types';
import { speakChineseText, stopSpeaking } from '../lib/speech';
import { downloadAudioFile } from './OralExamSession';
import { getAllAudioBackups, AudioBackupRecord } from '../lib/audioBackupDB';

interface EvaluationReportProps {
  report: ExamReport;
  theme: string;
  chatHistory?: ChatMessage[];
  onRestart: () => void;
  onBackToMenu: () => void;
  onGoToFeedback: () => void;
}

export default function EvaluationReport({ report, theme, chatHistory, onRestart, onBackToMenu, onGoToFeedback }: EvaluationReportProps) {
  const [playingQ, setPlayingQ] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [dbBackups, setDbBackups] = useState<AudioBackupRecord[]>([]);

  // Load persistent IndexedDB audio backups as fallback
  useEffect(() => {
    getAllAudioBackups()
      .then((backups) => setDbBackups(backups || []))
      .catch((err) => console.warn('Failed to load IndexedDB audio backups:', err));
  }, []);

  // Determine Grade Band (PSLE 看录像说话 30分制)
  const getGradeBand = (score: number) => {
    if (score >= 25) return { label: '优秀 (Excellent)', color: 'text-natural-sage bg-natural-sage/10 border-natural-sage/20', desc: '内容丰富充实，切合主题；表达非常流利，新加坡华语词汇与成语连词运用极佳。' };
    if (score >= 19) return { label: '良好 (Good)', color: 'text-natural-gold bg-natural-gold/10 border-natural-gold/20', desc: '内容基本完整，能清楚表达观点与经历，发音准确，发挥稳定。' };
    if (score >= 13) return { label: '及格 (Satisfactory)', color: 'text-natural-coral-dark bg-natural-coral/15 border-natural-coral/25', desc: '能做基本回答，但细节与例子不足，词汇较为平淡，有少许断续。' };
    return { label: '需努力 (Needs Improvement)', color: 'text-red-700 bg-red-50 border-red-200', desc: '内容单薄，回答过短且常需虚拟考官提示引导，需多练习口语词汇与表达。' };
  };

  const grade = getGradeBand(report.score);
  const cleanTheme = theme.split(' (')[0];

  // Calculate timing statistics from chatHistory
  const studentMessages = (chatHistory || []).filter(m => m.sender === 'student');
  const validPauseTimes = studentMessages.map(m => m.pauseTimeSec).filter((t): t is number => typeof t === 'number' && t > 0);
  const validAnswerTimes = studentMessages.map(m => m.answerTimeSec).filter((t): t is number => typeof t === 'number' && t > 0);

  const avgPauseTime = validPauseTimes.length > 0 
    ? (validPauseTimes.reduce((a, b) => a + b, 0) / validPauseTimes.length).toFixed(1)
    : null;

  const avgAnswerTime = validAnswerTimes.length > 0
    ? (validAnswerTimes.reduce((a, b) => a + b, 0) / validAnswerTimes.length).toFixed(1)
    : null;

  const getStudentAnswerForQ = (qNum: number) => {
    if (!chatHistory) return null;
    const tagged = chatHistory.find(m => m.sender === 'student' && m.questionNumber === qNum);
    if (tagged) return tagged;

    const studentMsgs = chatHistory.filter(m => m.sender === 'student');
    return studentMsgs[qNum - 1] || null;
  };


  const getStudentAudioForQ = (qNum: number) => {
    const chatMsg = getStudentAnswerForQ(qNum);
    if (chatMsg && (chatMsg.audioUrl || chatMsg.audioBase64)) {
      return {
        audioUrl: chatMsg.audioUrl,
        audioMimeType: chatMsg.audioMimeType,
        text: chatMsg.text,
      };
    }

    // IndexedDB Fallback Lookup
    const dbRecord = dbBackups.find(b => b.questionNumber === qNum) || dbBackups[qNum - 1];
    if (dbRecord && dbRecord.audioDataUrl) {
      return {
        audioUrl: dbRecord.audioDataUrl,
        audioMimeType: dbRecord.audioMimeType,
        text: dbRecord.text || chatMsg?.text || '',
      };
    }

    return chatMsg ? { audioUrl: undefined, audioMimeType: undefined, text: chatMsg.text } : null;
  };

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

  const handleCopyGeminiPrompt = () => {
    const studentTranscripts = [1, 2, 3, 4].map(num => {
      const qText = getExaminerQuestionForQ(num);
      const msg = getStudentAnswerForQ(num);
      const audioInfo = getStudentAudioForQ(num);
      const answerText = msg?.text || audioInfo?.text || '';
      return `【虚拟考官第 ${num} 题提问】：${qText}\n【学生第 ${num} 题作答】：${answerText || (audioInfo?.audioUrl ? '（详见随附的第 ' + num + ' 题录音文件）' : '（未检测到作答）')}`;
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

    navigator.clipboard.writeText(promptText);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 3000);
  };

  // Helper for model answers (fallback if undefined in legacy object)
  const modelAnswers = report.modelAnswers || {
    q1: `在录像中，我看到与“${cleanTheme}”相关的具体情景。主人公展现了良好的文明素养与公德心。旁边的人也展现出了礼貌与爱心。看到这一幕，我觉得我们应该多向他们学习，共同维护温馨和谐的新加坡社会。`,
    q2: `在日常生活中，我也遇到过与“${cleanTheme}”相关的经历。有一次在参加活动时，我主动帮助有需要的人。虽然付出了少许努力，但看到对方开心的笑容，我心里感到无比满足与自豪。`,
    q3: `我不赞同“${cleanTheme}”和小学生没有关系的说法。首先，小学生也是新加坡的一份子，我们可以从小事做起；其次，我们的文明言行能感染身边的人。最后，良好的言行不仅体现个人素质，更是社会文明的基石。因此，我们每个人都应该从自己做起。`,
    q4: `为了推广关于“${cleanTheme}”的好习惯，我有几点切实的建议：首先，学校可以在品格教育课上举办主题活动；其次，政府部门可以张贴有创意的手绘宣传海报；最后，家长要以身作则，给孩子们树立良好的榜样。`,
  };

  // Play model answer speech
  const handleTogglePlayModel = (qKey: string, text: string) => {
    if (playingQ === qKey) {
      stopSpeaking();
      setPlayingQ(null);
    } else {
      stopSpeaking();
      setPlayingQ(qKey);
      speakChineseText(
        text,
        () => setPlayingQ(qKey),
        () => setPlayingQ(null),
        () => setPlayingQ(null)
      );
    }
  };

  // Generate printable/downloadable HTML
  const generateReportHtml = () => {
    const q1Question = getExaminerQuestionForQ(1);
    const q2Question = getExaminerQuestionForQ(2);
    const q3Question = getExaminerQuestionForQ(3);
    const q4Question = getExaminerQuestionForQ(4);

    const contentScore = report.contentScore !== undefined ? report.contentScore : Math.min(15, Math.round(report.score * 0.5));
    const languageScore = report.languageScore !== undefined ? report.languageScore : Math.max(0, report.score - contentScore);

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>PSLE 华文模拟口试练习综合评估 - ${cleanTheme}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; padding: 32px; color: #2D3748; background: #fff; max-width: 880px; margin: 0 auto; line-height: 1.6; }
    .header { border-bottom: 3px solid #7A8C70; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    h1 { color: #2D3748; font-size: 24px; margin: 0; font-weight: 800; }
    .subtitle { color: #718096; font-size: 13px; margin-top: 4px; font-weight: bold; }
    .score-badge { text-align: right; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px 20px; border-radius: 12px; }
    .score-num { font-size: 38px; font-weight: 800; color: #7A8C70; line-height: 1; }
    .summary-box { background: #F7FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; margin-bottom: 20px; font-size: 13px; }
    .section-title { font-size: 15px; font-weight: bold; color: #2D3748; margin-top: 26px; margin-bottom: 12px; border-left: 4px solid #7A8C70; padding-left: 10px; }
    .q-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px; margin-bottom: 14px; }
    .q-title { font-weight: bold; font-size: 14px; color: #2D3748; margin-bottom: 8px; }
    .q-question { background: #EDF2F7; border: 1px solid #CBD5E0; border-radius: 6px; padding: 8px 12px; margin-bottom: 10px; font-size: 12px; color: #2D3748; }
    .q-text { font-size: 13px; color: #2D3748; line-height: 1.6; }
    .model-card { background: #FFFCF5; border: 1px solid #F6E05E; border-radius: 10px; padding: 16px; margin-bottom: 14px; }
    .model-title { font-weight: bold; font-size: 14px; color: #975A16; margin-bottom: 6px; }
    .model-q { background: #FEFCBF; border: 1px solid #F6E05E; border-radius: 6px; padding: 8px 12px; margin-bottom: 10px; font-size: 12px; color: #744210; font-weight: 500; }
    .rubric-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .rubric-item { background: #FAF7F2; border: 1px solid #EADFCD; padding: 12px; border-radius: 8px; font-size: 12px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    ol { padding-left: 20px; font-size: 12px; margin: 0; color: #2D3748; }
    li { margin-bottom: 8px; }
    .btn-print { background: #7A8C70; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; font-size: 13px; cursor: pointer; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; text-align: right;">
    <button class="btn-print" onclick="window.print()">打印 / 保存 PDF 报告</button>
  </div>
  <div class="header">
    <div>
      <h1>PSLE 华文模拟口试练习综合评估</h1>
      <div class="subtitle">口试主题：${cleanTheme} | 评估日期：${new Date().toLocaleDateString('zh-CN')}</div>
      <p style="font-size: 8px;"><strong>This performance assessment is based on the independent grading rubric of our app for practice reference only and does not reflect official PSLE scoring standards.</strong></p>
    </div>
    <div class="score-badge">
      <div style="font-size: 11px; color: #718096; font-weight: bold;">这次练习评估</div>
      <div class="score-num">${report.score} <span style="font-size: 16px; color: #A0AEC0;">/ 30</span></div>
      <div style="font-size: 11px; font-weight: bold; color: #7A8C70; margin-top: 4px;">${grade.label}</div>
    </div>
  </div>

  ${(report.isFallback || report.teacher_coaching_feedback?.includes('非常抱歉')) ? `
  <div style="background: #FFFBEB; border: 2px solid #FCD34D; border-radius: 10px; padding: 14px 16px; margin-bottom: 20px; font-size: 12px; color: #78350F; font-weight: 500; line-height: 1.6;">
    <strong style="font-size: 13px; color: #92400E; display: block; margin-bottom: 4px;">⚠️ 系统致歉与默认报告声明 (System Notice & Apology)</strong>
    非常抱歉！由于系统技术故障或网络超时，系统未能成功捕捉或记录您在本场口试中的语音/文字作答内容，因此无法为您提供针对您个人作答的个性化专属评估、评分与针对性指导。本报告中的评分、分析、优缺点及指导建议均基于系统默认/通用参考答案生成。<br/>
    <em style="font-size: 11px; color: #B45309; margin-top: 4px; display: block;">Apology Note: Your answer was not captured by the system, so no customized feedback, score, or report could be given for this session. The following feedback/score/report is based on a default/generic answer.</em>
  </div>
  ` : ''}

  <div class="summary-box">
    <strong>总评语：</strong>${grade.desc}
  </div>

  <div class="section-title">一、模拟口试练习综合评估 (Performance Assessment)</div>
  ${report.rubric_breakdown ? `
  <div class="rubric-grid">
    <div class="rubric-item">
      <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 4px;">
        <span>🗣️ 1. 语音与声调 (Pronunciation)</span>
        <span style="color: #7A8C70; font-family: monospace;">${report.rubric_breakdown.pronunciation_and_tones.score} / ${report.rubric_breakdown.pronunciation_and_tones.max_score}分</span>
      </div>
      <div style="color: #2D3748; font-size: 11px;">${report.rubric_breakdown.pronunciation_and_tones.observations}</div>
    </div>
    <div class="rubric-item">
      <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 4px;">
        <span>⚡ 2. 表达流利度 (Fluency)</span>
        <span style="color: #7A8C70; font-family: monospace;">${report.rubric_breakdown.fluency_and_delivery.score} / ${report.rubric_breakdown.fluency_and_delivery.max_score}分</span>
      </div>
      <div style="color: #2D3748; font-size: 11px;">${report.rubric_breakdown.fluency_and_delivery.observations}</div>
    </div>
    <div class="rubric-item">
      <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 4px;">
        <span>💡 3. 内容充实 (Content)</span>
        <span style="color: #7A8C70; font-family: monospace;">${report.rubric_breakdown.content_elaboration.score} / ${report.rubric_breakdown.content_elaboration.max_score}分</span>
      </div>
      <div style="color: #2D3748; font-size: 11px;">${report.rubric_breakdown.content_elaboration.observations}</div>
    </div>
    <div class="rubric-item">
      <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 4px;">
        <span>📚 4. 词汇与句型 (Vocabulary)</span>
        <span style="color: #7A8C70; font-family: monospace;">${report.rubric_breakdown.vocabulary_expression.score} / ${report.rubric_breakdown.vocabulary_expression.max_score}分</span>
      </div>
      <div style="color: #2D3748; font-size: 11px;">${report.rubric_breakdown.vocabulary_expression.observations}</div>
    </div>
  </div>
  ` : `
  <div class="rubric-grid">
    <div class="rubric-item">
      <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 4px;">
        <span>🗣️ 1. 语音与声调 (Pronunciation & Tones)</span>
        <span style="color: #7A8C70; font-family: monospace;">${Math.round((report.score / 30) * 8)} / 8分</span>
      </div>
      <div style="color: #718096; font-size: 11px;">评估声调准确度、咬字吐字与多音字发音。</div>
    </div>
    <div class="rubric-item">
      <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 4px;">
        <span>⚡ 2. 表达流利度 (Fluency & Delivery)</span>
        <span style="color: #7A8C70; font-family: monospace;">${Math.round((report.score / 30) * 8)} / 8分</span>
      </div>
      <div style="color: #718096; font-size: 11px;">评估语速流畅度、卡顿与思考填充词使用频率。</div>
    </div>
    <div class="rubric-item">
      <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 4px;">
        <span>💡 3. 内容充实 (Content & Elaboration)</span>
        <span style="color: #7A8C70; font-family: monospace;">${Math.round((report.score / 30) * 8)} / 8分</span>
      </div>
      <div style="color: #718096; font-size: 11px;">评估录像场景细节描述、个人经验展开与观点论证。</div>
    </div>
    <div class="rubric-item">
      <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 4px;">
        <span>📚 4. 词汇与句型 (Vocabulary & Expression)</span>
        <span style="color: #7A8C70; font-family: monospace;">${Math.round((report.score / 30) * 6)} / 6分</span>
      </div>
      <div style="color: #718096; font-size: 11px;">评估新加坡教育部规范词汇、成语与连接词运用。</div>
    </div>
  </div>
  `}

  <div style="background: #FFFBEB; border: 1px solid #FCD34D; border-radius: 10px; padding: 14px; margin-bottom: 20px;">
    <div style="font-weight: bold; font-size: 13px; color: #92400E; margin-bottom: 8px;">⏱️ 考场答题节奏与停顿时间实测 (Fluency & Pacing Timing)</div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
      <div style="background: #FFF; border: 1px solid #FDE68A; padding: 10px; border-radius: 8px;">
        <div style="font-size: 11px; color: #78350F; font-weight: bold;">平均思考停顿时间</div>
        <div style="font-size: 18px; font-weight: bold; color: #B45309; font-family: monospace; margin-top: 2px;">${avgPauseTime !== null ? `${avgPauseTime} 秒` : '未实测'}</div>
      </div>
      <div style="background: #FFF; border: 1px solid #A7F3D0; padding: 10px; border-radius: 8px;">
        <div style="font-size: 11px; color: #065F46; font-weight: bold;">平均作答表达用时</div>
        <div style="font-size: 18px; font-weight: bold; color: #047857; font-family: monospace; margin-top: 2px;">${avgAnswerTime !== null ? `${avgAnswerTime} 秒` : '未实测'}</div>
      </div>
    </div>
  </div>

  ${report.specific_phonetic_errors && report.specific_phonetic_errors.length > 0 ? `
  <div style="background: #FFF5F5; border: 1px solid #FEB2B2; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
    <div style="font-weight: bold; color: #9B2C2C; font-size: 12px; margin-bottom: 8px;">⚠️ 特定发音与声调纠错表 (Identified Phonetic & Tone Errors)</div>
    <table style="width: 100%; font-size: 11px; border-collapse: collapse; text-align: left;">
      <thead>
        <tr style="background: #FED7D7; color: #742A2A; font-weight: bold;">
          <th style="padding: 6px; border: 1px solid #FEB2B2;">词语</th>
          <th style="padding: 6px; border: 1px solid #FEB2B2;">误读发音</th>
          <th style="padding: 6px; border: 1px solid #FEB2B2;">正确拼音</th>
          <th style="padding: 6px; border: 1px solid #FEB2B2;">错误类型说明</th>
        </tr>
      </thead>
      <tbody>
        ${report.specific_phonetic_errors.map(err => `
          <tr style="background: #fff;">
            <td style="padding: 6px; border: 1px solid #FEB2B2; font-weight: bold;">${err.word}</td>
            <td style="padding: 6px; border: 1px solid #FEB2B2; color: #C53030;">${err.student_pronounced_as}</td>
            <td style="padding: 6px; border: 1px solid #FEB2B2; color: #276749; font-weight: bold;">${err.correct_pinyin}</td>
            <td style="padding: 6px; border: 1px solid #FEB2B2;">${err.error_type}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${report.teacher_coaching_feedback ? `
  <div style="background: #FEFCBF; border: 1px solid #F6E05E; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 12px; color: #744210;">
    <strong>🎓 AI 林老师总结建议：</strong> ${report.teacher_coaching_feedback}
  </div>
  ` : ''}

  <div class="section-title">二、答题步骤与内容分析 (Itemized Rubric Evaluation)</div>
  <div class="q-card">
    <div class="q-title">【第一题 Q1】录像内容与感受</div>
    <div class="q-question"><strong>❓ 虚拟考官提问：</strong>${q1Question}</div>
    <div class="q-text">${report.analysis.q1}</div>
  </div>
  <div class="q-card">
    <div class="q-title">【第二题 Q2】相关个人经历分享</div>
    <div class="q-question"><strong>❓ 虚拟考官提问：</strong>${q2Question}</div>
    <div class="q-text">${report.analysis.q2}</div>
  </div>
  <div class="q-card">
    <div class="q-title">【第三题 Q3】针对主题发表看法</div>
    <div class="q-question"><strong>❓ 虚拟考官提问：</strong>${q3Question}</div>
    <div class="q-text">${report.analysis.q3}</div>
  </div>
  <div class="q-card">
    <div class="q-title">【第四题 Q4】建议与改进措施</div>
    <div class="q-question"><strong>❓ 虚拟考官提问：</strong>${q4Question}</div>
    <div class="q-text">${report.analysis.q4}</div>
  </div>

  <div class="section-title">三、AI 林老师模范答案示范 (AI Teacher Lin Model Answers)</div>
  <div class="model-card">
    <div class="model-title">【第一题 Q1 模范答案示范】看录像说细节</div>
    <div class="model-q"><strong>针对虚拟考官提问：</strong>“${q1Question}”</div>
    <div class="q-text">${modelAnswers.q1}</div>
  </div>
  <div class="model-card">
    <div class="model-title">【第二题 Q2 模范答案示范】个人经历分享</div>
    <div class="model-q"><strong>针对虚拟考官提问：</strong>“${q2Question}”</div>
    <div class="q-text">${modelAnswers.q2}</div>
  </div>
  <div class="model-card">
    <div class="model-title">【第三题 Q3 模范答案示范】针对主题发表看法</div>
    <div class="model-q"><strong>针对虚拟考官提问：</strong>“${q3Question}”</div>
    <div class="q-text">${modelAnswers.q3}</div>
  </div>
  <div class="model-card">
    <div class="model-title">【第四题 Q4 模范答案示范】建议与改进措施</div>
    <div class="model-q"><strong>针对虚拟考官提问：</strong>“${q4Question}”</div>
    <div class="q-text">${modelAnswers.q4}</div>
  </div>

  <div class="section-title">四、优缺点细化评估 (3 Key Strengths & 3 Areas to Improve)</div>
  <div class="grid-2">
    <div>
      <h3 style="font-size: 13px; color: #276749; margin-bottom: 8px;">值得表扬的 3 个亮点：</h3>
      <ol>
        ${report.strengths.slice(0, 3).map(s => `<li>${s}</li>`).join('')}
      </ol>
    </div>
    <div>
      <h3 style="font-size: 13px; color: #9B2C2C; margin-bottom: 8px;">建议改进的 3 个改进建议：</h3>
      <ol>
        ${report.weaknesses.slice(0, 3).map(w => `<li>${w}</li>`).join('')}
      </ol>
    </div>
  </div>
</body>
</html>`;
  };

  // Download HTML file directly
  const handleDownloadHtml = () => {
    const todayDate = new Date().toISOString().slice(0, 10);
    const htmlContent = generateReportHtml();
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PSLE_华文模拟口试练习综合评估_${cleanTheme}_${todayDate}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto my-6 space-y-8 font-sans print:my-0 print:shadow-none">
      
      {/* 1. Main Premium Scorecard Header */}
      <div className="bg-white rounded-2xl border border-natural-border shadow-sm overflow-hidden relative print:border-none print:shadow-none">
        <div className="absolute top-0 right-0 p-8 opacity-5 text-natural-sage">
          <Award className="h-40 w-40" />
        </div>

        {/* Certificate style border on top */}
        <div className="h-2 bg-gradient-to-r from-natural-sage via-natural-gold to-natural-coral" />

        {/* System Failure Apology Banner (When student answers were not captured) */}
        {(report.isFallback || report.teacher_coaching_feedback?.includes('非常抱歉') || report.teacher_coaching_feedback?.includes('系统未能')) && (
          <div className="mx-6 sm:mx-8 mt-6 bg-amber-50/90 border-2 border-amber-300/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-1.5">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
              <span>系统致歉与预设报告声明 (System Notice & Apology)</span>
            </div>
            <p className="text-xs text-amber-950 leading-relaxed font-semibold">
              非常抱歉！由于系统技术故障或网络超时，系统未能成功捕捉或记录您在本场口试中的实际语音/文字作答，因此无法为您提供针对您个人作答的个性化专属评估、评分与指导。本报告中的评分、分析、优缺点及建议均基于系统默认/通用参考答案生成。
            </p>
            <p className="text-[11px] text-amber-800 font-mono italic">
              Apology Note: Your answer was not captured by the system, so no customized feedback, score, or report could be given for this session. The following feedback/score/report is based on a default/generic answer.
            </p>
          </div>
        )}
        
{/* Main Header Container (Wraps both text and score badge) */}
        <div className="p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Left Side: Titles and Disclaimer */}
          <div className="space-y-2 text-center md:text-left flex-1">
            <span className="inline-flex rounded-full bg-natural-beige px-2.5 py-0.5 text-xs font-bold text-natural-sage ring-1 ring-natural-sage/15 uppercase tracking-wider">
              PSLE Chinese Oral Practice Simulator Performance Assessment
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-natural-heading">
              PSLE 华文模拟口试练习综合评估
            </h2>
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 text-natural-muted text-xs font-bold">
              <span className="flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5 text-natural-sage" />
                主题：{cleanTheme}
              </span>
              <span className="hidden sm:inline">•</span>
              <span>满分：30 分 (看录像说话)</span>
            </div>
            <p className="text-[8pt] text-black">
              This performance assessment is based on the independent grading rubric of our app for practice reference only and does not reflect official PSLE scoring standards.
            </p>
          </div>

          {/* Right Side: Large dynamic Score Badge */}
          <div className="flex flex-col items-center justify-center p-6 bg-natural-beige/20 rounded-2xl border border-natural-border shadow-sm shrink-0 min-w-[160px]">
            <span className="text-[10px] font-bold text-natural-muted uppercase tracking-widest font-mono">这次练习评估</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-5xl font-display font-extrabold text-natural-sage">{report.score}</span>
              <span className="text-xl font-bold text-natural-muted">/30</span>
            </div>
            <span className={`mt-3 px-3 py-1 rounded-full text-xs font-bold border ${grade.color}`}>
              {grade.label}
            </span>
          </div>

        </div> {/* 

        {/* Evaluation description banner */}
        <div className="bg-natural-beige/30 border-t border-natural-border p-5 flex items-start gap-3">
          <Star className="h-5 w-5 text-natural-gold shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-natural-heading">总评语：</span>
            <p className="text-xs text-natural-text leading-relaxed font-semibold">
              {grade.desc}
            </p>
          </div>
        </div>

        {/* Oral Exam Rubric Component Scores (Breakdown: 30 Marks Total) */}
        <div className="border-t border-natural-border bg-white p-5 space-y-4">
          <h4 className="text-xs font-bold text-natural-heading uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-natural-sage" />
            模拟口试练习评分 (Marking Breakdown)
          </h4>

          {report.rubric_breakdown ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. Pronunciation & Tones */}
              <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#EADFCD] space-y-2">
                <div className="flex justify-between items-center border-b border-[#EADFCD] pb-2">
                  <span className="text-xs font-bold text-[#5C4D3C] flex items-center gap-1">
                    🗣️ 1. 语音与声调 (Pronunciation & Tones)
                  </span>
                  <span className="text-sm font-extrabold text-natural-sage font-mono">
                    {report.rubric_breakdown.pronunciation_and_tones.score} / {report.rubric_breakdown.pronunciation_and_tones.max_score}分
                  </span>
                </div>
                <p className="text-[11.5px] text-natural-text leading-relaxed font-medium">
                  {report.rubric_breakdown.pronunciation_and_tones.observations}
                </p>
              </div>

              {/* 2. Fluency & Delivery */}
              <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#EADFCD] space-y-2">
                <div className="flex justify-between items-center border-b border-[#EADFCD] pb-2">
                  <span className="text-xs font-bold text-[#5C4D3C] flex items-center gap-1">
                    ⚡ 2. 表达流利度 (Fluency & Delivery)
                  </span>
                  <span className="text-sm font-extrabold text-natural-sage font-mono">
                    {report.rubric_breakdown.fluency_and_delivery.score} / {report.rubric_breakdown.fluency_and_delivery.max_score}分
                  </span>
                </div>
                <p className="text-[11.5px] text-natural-text leading-relaxed font-medium">
                  {report.rubric_breakdown.fluency_and_delivery.observations}
                </p>
                {report.rubric_breakdown.fluency_and_delivery.filler_word_count && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10.5px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                      填充词检测：
                    </span>
                    {Object.entries(report.rubric_breakdown.fluency_and_delivery.filler_word_count).map(([wordKey, count]) => (
                      <span key={wordKey} className="text-[10.5px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                        “{wordKey.split('_')[1] || wordKey}”: {count} 次
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Content & Elaboration */}
              <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#EADFCD] space-y-2">
                <div className="flex justify-between items-center border-b border-[#EADFCD] pb-2">
                  <span className="text-xs font-bold text-[#5C4D3C] flex items-center gap-1">
                    💡 3. 内容充实 (Content & Elaboration)
                  </span>
                  <span className="text-sm font-extrabold text-natural-sage font-mono">
                    {report.rubric_breakdown.content_elaboration.score} / {report.rubric_breakdown.content_elaboration.max_score}分
                  </span>
                </div>
                <p className="text-[11.5px] text-natural-text leading-relaxed font-medium">
                  {report.rubric_breakdown.content_elaboration.observations}
                </p>
              </div>

              {/* 4. Vocabulary & Expression */}
              <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#EADFCD] space-y-2">
                <div className="flex justify-between items-center border-b border-[#EADFCD] pb-2">
                  <span className="text-xs font-bold text-[#5C4D3C] flex items-center gap-1">
                    📚 4. 词汇与句型 (Vocabulary & Expression)
                  </span>
                  <span className="text-sm font-extrabold text-natural-sage font-mono">
                    {report.rubric_breakdown.vocabulary_expression.score} / {report.rubric_breakdown.vocabulary_expression.max_score}分
                  </span>
                </div>
                <p className="text-[11.5px] text-natural-text leading-relaxed font-medium">
                  {report.rubric_breakdown.vocabulary_expression.observations}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#EADFCD] space-y-2">
                <div className="flex justify-between items-center border-b border-[#EADFCD] pb-2">
                  <span className="text-xs font-bold text-[#5C4D3C] flex items-center gap-1">
                    🗣️ 1. 语音与声调 (Pronunciation & Tones)
                  </span>
                  <span className="text-sm font-extrabold text-natural-sage font-mono">
                    {Math.round((report.score / 30) * 8)} / 8分
                  </span>
                </div>
                <p className="text-[11.5px] text-natural-text leading-relaxed font-medium">
                  评估声调准确度、咬字吐字与多音字发音。
                </p>
              </div>

              <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#EADFCD] space-y-2">
                <div className="flex justify-between items-center border-b border-[#EADFCD] pb-2">
                  <span className="text-xs font-bold text-[#5C4D3C] flex items-center gap-1">
                    ⚡ 2. 表达流利度 (Fluency & Delivery)
                  </span>
                  <span className="text-sm font-extrabold text-natural-sage font-mono">
                    {Math.round((report.score / 30) * 8)} / 8分
                  </span>
                </div>
                <p className="text-[11.5px] text-natural-text leading-relaxed font-medium">
                  评估语速流畅度、卡顿与思考填充词使用频率。
                </p>
              </div>

              <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#EADFCD] space-y-2">
                <div className="flex justify-between items-center border-b border-[#EADFCD] pb-2">
                  <span className="text-xs font-bold text-[#5C4D3C] flex items-center gap-1">
                    💡 3. 内容充实 (Content & Elaboration)
                  </span>
                  <span className="text-sm font-extrabold text-natural-sage font-mono">
                    {Math.round((report.score / 30) * 8)} / 8分
                  </span>
                </div>
                <p className="text-[11.5px] text-natural-text leading-relaxed font-medium">
                  评估录像场景细节描述、个人经验展开与观点论证。
                </p>
              </div>

              <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#EADFCD] space-y-2">
                <div className="flex justify-between items-center border-b border-[#EADFCD] pb-2">
                  <span className="text-xs font-bold text-[#5C4D3C] flex items-center gap-1">
                    📚 4. 词汇与句型 (Vocabulary & Expression)
                  </span>
                  <span className="text-sm font-extrabold text-natural-sage font-mono">
                    {Math.round((report.score / 30) * 6)} / 6分
                  </span>
                </div>
                <p className="text-[11.5px] text-natural-text leading-relaxed font-medium">
                  评估规范词汇、成语与连接词运用。
                </p>
              </div>
            </div>
          )}

          {/* Pacing & Timing Metrics Card */}
          <div className="bg-amber-50/50 rounded-xl border border-amber-200/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-600" />
                考场答题节奏与停顿时间实测 (Fluency & Pacing Timing Analysis)
              </h5>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                虚拟考官精准实测
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="bg-white p-3 rounded-lg border border-amber-200/80 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-amber-900 block">⏱️ 平均思考停顿时间 (Avg. Pause Time)</span>
                  <span className="text-[10px] text-amber-700/80">虚拟考官提问完毕至点击话筒秒数</span>
                </div>
                <span className="text-xl font-extrabold font-mono text-amber-900">
                  {avgPauseTime !== null ? `${avgPauseTime} 秒` : '未实测'}
                </span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-emerald-200/80 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-900 block">🎙️ 平均作答表达用时 (Avg. Answering Time)</span>
                  <span className="text-[10px] text-emerald-700/80">话筒开启作答至结束提交秒数</span>
                </div>
                <span className="text-xl font-extrabold font-mono text-emerald-900">
                  {avgAnswerTime !== null ? `${avgAnswerTime} 秒` : '未实测'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-amber-900/90 leading-relaxed bg-white/80 p-2.5 rounded-lg border border-amber-200/60 font-medium">
              💡 <b>口试答题节奏指引：</b> 口试答题允许 10秒以内的思考停顿，3~8秒的沉着思考属于最佳表现；推荐每题作答用时维持在 90~120秒（1.5~2分钟）左右，能确保内容充实、阐述详尽且条理分明。
            </p>
          </div>

          {/* Specific Phonetic Errors Table */}
          {report.specific_phonetic_errors && report.specific_phonetic_errors.length > 0 && (
            <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-4 space-y-2.5">
              <span className="font-bold text-xs text-rose-900 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-rose-600" />
                特定发音与声调纠错表 (Specific Phonetic & Tone Errors Identified from Audio)
              </span>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-natural-text border-collapse">
                  <thead>
                    <tr className="bg-rose-100/70 border-b border-rose-200 text-rose-900 font-bold">
                      <th className="p-2 border border-rose-200">词语</th>
                      <th className="p-2 border border-rose-200">学生误读发音</th>
                      <th className="p-2 border border-rose-200">正确拼音/读音</th>
                      <th className="p-2 border border-rose-200">声调与偏误说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.specific_phonetic_errors.map((err, idx) => (
                      <tr key={idx} className="bg-white border-b border-rose-100">
                        <td className="p-2 border border-rose-200 font-bold text-rose-900">{err.word}</td>
                        <td className="p-2 border border-rose-200 text-rose-700 font-mono">{err.student_pronounced_as}</td>
                        <td className="p-2 border border-rose-200 text-emerald-700 font-mono font-bold">{err.correct_pinyin}</td>
                        <td className="p-2 border border-rose-200 text-natural-text font-medium">{err.error_type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Teacher Coaching Feedback Banner */}
          {report.teacher_coaching_feedback && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-1">
              <span className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-amber-700" />
                AI 林老师导师总结建议：
              </span>
              <p className="text-xs text-amber-950 font-medium leading-relaxed">
                {report.teacher_coaching_feedback}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 2. Bento Grid: Analysis of the 4 Questions */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-natural-heading flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4.5 w-4.5 text-natural-sage" />
            <span>答题步骤与内容分析 (Itemized Rubric Evaluation)</span>
          </div>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Question 1 analysis */}
          <div className="bg-white rounded-xl p-5 border border-natural-border shadow-sm space-y-2.5 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-natural-border pb-2">
                <span className="font-semibold text-xs text-natural-sage font-mono">第一题 (Q1)</span>
                <span className="text-[11px] font-bold text-natural-heading bg-natural-beige/50 px-2 py-0.5 rounded-md">录像内容与感受</span>
              </div>
              <div className="bg-natural-beige/40 p-2.5 rounded-lg border border-natural-border/70 text-xs space-y-0.5">
                <span className="font-bold text-natural-sage text-[10.5px] block">❓ 虚拟考官提问：</span>
                <p className="text-natural-heading font-medium italic">{getExaminerQuestionForQ(1)}</p>
              </div>
              <p className="text-xs text-natural-text leading-relaxed font-semibold">
                {report.analysis.q1}
              </p>
            </div>
            {getStudentAudioForQ(1)?.audioUrl && (
              <div className="pt-2 border-t border-natural-border flex items-center justify-between gap-2">
                <audio src={getStudentAudioForQ(1)!.audioUrl} controls className="h-7 max-w-[160px]" />
                <button
                  type="button"
                  onClick={() => downloadAudioFile(getStudentAudioForQ(1)!.audioUrl!, `Student_Oral_Answer_Q1_Audio_${new Date().toISOString().slice(0, 10)}`, getStudentAudioForQ(1)!.audioMimeType)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-natural-sage text-white text-[10.5px] font-bold hover:bg-[#5E6D55] transition shadow-xs cursor-pointer shrink-0"
                >
                  <Download className="h-3 w-3" />
                  <span>下载Q1录音</span>
                </button>
              </div>
            )}
          </div>

          {/* Question 2 analysis */}
          <div className="bg-white rounded-xl p-5 border border-natural-border shadow-sm space-y-2.5 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-natural-border pb-2">
                <span className="font-semibold text-xs text-natural-sage font-mono">第二题 (Q2)</span>
                <span className="text-[11px] font-bold text-natural-heading bg-natural-beige/50 px-2 py-0.5 rounded-md">相关个人经历分享</span>
              </div>
              <div className="bg-natural-beige/40 p-2.5 rounded-lg border border-natural-border/70 text-xs space-y-0.5">
                <span className="font-bold text-natural-sage text-[10.5px] block">❓ 虚拟考官提问：</span>
                <p className="text-natural-heading font-medium italic">{getExaminerQuestionForQ(2)}</p>
              </div>
              <p className="text-xs text-natural-text leading-relaxed font-semibold">
                {report.analysis.q2}
              </p>
            </div>
            {getStudentAudioForQ(2)?.audioUrl && (
              <div className="pt-2 border-t border-natural-border flex items-center justify-between gap-2">
                <audio src={getStudentAudioForQ(2)!.audioUrl} controls className="h-7 max-w-[160px]" />
                <button
                  type="button"
                  onClick={() => downloadAudioFile(getStudentAudioForQ(2)!.audioUrl!, `Student_Oral_Answer_Q2_Audio_${new Date().toISOString().slice(0, 10)}`, getStudentAudioForQ(2)!.audioMimeType)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-natural-sage text-white text-[10.5px] font-bold hover:bg-[#5E6D55] transition shadow-xs cursor-pointer shrink-0"
                >
                  <Download className="h-3 w-3" />
                  <span>下载Q2录音</span>
                </button>
              </div>
            )}
          </div>

          {/* Question 3 analysis */}
          <div className="bg-white rounded-xl p-5 border border-natural-border shadow-sm space-y-2.5 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-natural-border pb-2">
                <span className="font-semibold text-xs text-natural-sage font-mono">第三题 (Q3)</span>
                <span className="text-[11px] font-bold text-natural-heading bg-natural-beige/50 px-2 py-0.5 rounded-md">针对主题发表看法</span>
              </div>
              <div className="bg-natural-beige/40 p-2.5 rounded-lg border border-natural-border/70 text-xs space-y-0.5">
                <span className="font-bold text-natural-sage text-[10.5px] block">❓ 虚拟考官提问：</span>
                <p className="text-natural-heading font-medium italic">{getExaminerQuestionForQ(3)}</p>
              </div>
              <p className="text-xs text-natural-text leading-relaxed font-semibold">
                {report.analysis.q3}
              </p>
            </div>
            {getStudentAudioForQ(3)?.audioUrl && (
              <div className="pt-2 border-t border-natural-border flex items-center justify-between gap-2">
                <audio src={getStudentAudioForQ(3)!.audioUrl} controls className="h-7 max-w-[160px]" />
                <button
                  type="button"
                  onClick={() => downloadAudioFile(getStudentAudioForQ(3)!.audioUrl!, `Student_Oral_Answer_Q3_Audio_${new Date().toISOString().slice(0, 10)}`, getStudentAudioForQ(3)!.audioMimeType)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-natural-sage text-white text-[10.5px] font-bold hover:bg-[#5E6D55] transition shadow-xs cursor-pointer shrink-0"
                >
                  <Download className="h-3 w-3" />
                  <span>下载Q3录音</span>
                </button>
              </div>
            )}
          </div>

          {/* Question 4 analysis */}
          <div className="bg-white rounded-xl p-5 border border-natural-border shadow-sm space-y-2.5 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-natural-border pb-2">
                <span className="font-semibold text-xs text-natural-sage font-mono">第四题 (Q4)</span>
                <span className="text-[11px] font-bold text-natural-heading bg-natural-beige/50 px-2 py-0.5 rounded-md">建议与改进措施</span>
              </div>
              <div className="bg-natural-beige/40 p-2.5 rounded-lg border border-natural-border/70 text-xs space-y-0.5">
                <span className="font-bold text-natural-sage text-[10.5px] block">❓ 虚拟考官提问：</span>
                <p className="text-natural-heading font-medium italic">{getExaminerQuestionForQ(4)}</p>
              </div>
              <p className="text-xs text-natural-text leading-relaxed font-semibold">
                {report.analysis.q4}
              </p>
            </div>
            {getStudentAudioForQ(4)?.audioUrl && (
              <div className="pt-2 border-t border-natural-border flex items-center justify-between gap-2">
                <audio src={getStudentAudioForQ(4)!.audioUrl} controls className="h-7 max-w-[160px]" />
                <button
                  type="button"
                  onClick={() => downloadAudioFile(getStudentAudioForQ(4)!.audioUrl!, `Student_Oral_Answer_Q4_Audio_${new Date().toISOString().slice(0, 10)}`, getStudentAudioForQ(4)!.audioMimeType)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-natural-sage text-white text-[10.5px] font-bold hover:bg-[#5E6D55] transition shadow-xs cursor-pointer shrink-0"
                >
                  <Download className="h-3 w-3" />
                  <span>下载Q4录音</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Student Audio Recordings & Gemini Prompt Backup Card */}
        <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200/60 pb-3">
            <div className="flex items-center gap-2">
              <FileAudio className="h-5 w-5 text-emerald-700" />
              <div>
                <h4 className="font-bold text-emerald-900 text-sm">学生作答录音音频下载与 Gemini 备用评测包</h4>
                <p className="text-xs text-emerald-800/80 font-medium">若需在 Gemini 中获取二次点评，可一键下载各题原声录音并复制评测 Prompt</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyGeminiPrompt}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-sm cursor-pointer shrink-0"
            >
              {copiedPrompt ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copiedPrompt ? '已复制 Gemini 评测提示词！' : '一键复制给 Gemini 的评测 Prompt'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(qNum => {
              const studentAnswer = getStudentAnswerForQ(qNum);
              const studentAudio = getStudentAudioForQ(qNum);
              const audioUrl = studentAudio?.audioUrl;
              const mimeType = studentAudio?.audioMimeType;
              const displayText = studentAnswer?.text || studentAudio?.text || '未检测到录音作答';

              return (
                <div key={qNum} className="bg-white p-3 rounded-xl border border-emerald-200/60 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-emerald-900">第 {qNum} 题作答录音</span>
                      <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        Q{qNum}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 line-clamp-2 font-medium">
                      {displayText}
                    </p>
                  </div>

                  {audioUrl ? (
                    <div className="space-y-1.5 pt-1 border-t border-slate-100">
                      <audio src={audioUrl} controls className="h-6 w-full" />
                      <button
                        type="button"
                        onClick={() => downloadAudioFile(audioUrl, `Student_Oral_Answer_Q${qNum}_Audio_${new Date().toISOString().slice(0, 10)}`, mimeType)}                        className="w-full inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold transition cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>下载第 {qNum} 题音频 clip</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-[10px] text-gray-400 italic pt-1">
                      （可从考场聊天记录点击下载或无语音附件）
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* NEW: 3. Teacher Lin's High-Score Model Answers Section */}
      <div className="bg-amber-50/40 rounded-2xl border border-amber-200/80 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900 text-base flex items-center gap-2">
                AI 林老师模范答案示范
                <Sparkles className="h-4 w-4 text-amber-600 animate-pulse" />
              </h3>
              <p className="text-xs text-amber-800/80 font-medium">
                针对《{cleanTheme}》四大题型的模范答案示范，支持点击朗读示范
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Q1 Model Answer */}
          <div className="bg-white rounded-xl p-5 border border-amber-200/60 shadow-sm space-y-3 relative group">
            <div className="flex items-center justify-between border-b border-amber-100 pb-2">
              <span className="font-bold text-xs text-amber-900 font-mono">Q1 看录像说细节 模范答案</span>
              <button
                onClick={() => handleTogglePlayModel('q1', modelAnswers.q1)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                  playingQ === 'q1' 
                    ? 'bg-amber-600 text-white shadow-sm' 
                    : 'bg-amber-100/70 hover:bg-amber-100 text-amber-800'
                }`}
              >
                {playingQ === 'q1' ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                <span>{playingQ === 'q1' ? '停止朗读' : '朗读示范'}</span>
              </button>
            </div>
            <div className="text-[11px] text-amber-900/90 font-medium bg-amber-100/50 p-2 rounded-md border border-amber-200/50">
              <span className="font-bold">针对虚拟考官提问：</span>“{getExaminerQuestionForQ(1)}”
            </div>
            <p className="text-xs text-natural-heading leading-relaxed font-medium bg-amber-50/30 p-3 rounded-lg border border-amber-100/50">
              {modelAnswers.q1}
            </p>
          </div>

          {/* Q2 Model Answer */}
          <div className="bg-white rounded-xl p-5 border border-amber-200/60 shadow-sm space-y-3 relative group">
            <div className="flex items-center justify-between border-b border-amber-100 pb-2">
              <span className="font-bold text-xs text-amber-900 font-mono">Q2 个人经历分享 模范答案</span>
              <button
                onClick={() => handleTogglePlayModel('q2', modelAnswers.q2)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                  playingQ === 'q2' 
                    ? 'bg-amber-600 text-white shadow-sm' 
                    : 'bg-amber-100/70 hover:bg-amber-100 text-amber-800'
                }`}
              >
                {playingQ === 'q2' ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                <span>{playingQ === 'q2' ? '停止朗读' : '朗读示范'}</span>
              </button>
            </div>
            <div className="text-[11px] text-amber-900/90 font-medium bg-amber-100/50 p-2 rounded-md border border-amber-200/50">
              <span className="font-bold">针对虚拟考官提问：</span>“{getExaminerQuestionForQ(2)}”
            </div>
            <p className="text-xs text-natural-heading leading-relaxed font-medium bg-amber-50/30 p-3 rounded-lg border border-amber-100/50">
              {modelAnswers.q2}
            </p>
          </div>

          {/* Q3 Model Answer */}
          <div className="bg-white rounded-xl p-5 border border-amber-200/60 shadow-sm space-y-3 relative group">
            <div className="flex items-center justify-between border-b border-amber-100 pb-2">
              <span className="font-bold text-xs text-amber-900 font-mono">Q3 观点发表论证 模范答案</span>
              <button
                onClick={() => handleTogglePlayModel('q3', modelAnswers.q3)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                  playingQ === 'q3' 
                    ? 'bg-amber-600 text-white shadow-sm' 
                    : 'bg-amber-100/70 hover:bg-amber-100 text-amber-800'
                }`}
              >
                {playingQ === 'q3' ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                <span>{playingQ === 'q3' ? '停止朗读' : '朗读示范'}</span>
              </button>
            </div>
            <div className="text-[11px] text-amber-900/90 font-medium bg-amber-100/50 p-2 rounded-md border border-amber-200/50">
              <span className="font-bold">针对虚拟考官提问：</span>“{getExaminerQuestionForQ(3)}”
            </div>
            <p className="text-xs text-natural-heading leading-relaxed font-medium bg-amber-50/30 p-3 rounded-lg border border-amber-100/50">
              {modelAnswers.q3}
            </p>
          </div>

          {/* Q4 Model Answer */}
          <div className="bg-white rounded-xl p-5 border border-amber-200/60 shadow-sm space-y-3 relative group">
            <div className="flex items-center justify-between border-b border-amber-100 pb-2">
              <span className="font-bold text-xs text-amber-900 font-mono">Q4 建议改进措施 模范答案</span>
              <button
                onClick={() => handleTogglePlayModel('q4', modelAnswers.q4)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                  playingQ === 'q4' 
                    ? 'bg-amber-600 text-white shadow-sm' 
                    : 'bg-amber-100/70 hover:bg-amber-100 text-amber-800'
                }`}
              >
                {playingQ === 'q4' ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                <span>{playingQ === 'q4' ? '停止朗读' : '朗读示范'}</span>
              </button>
            </div>
            <div className="text-[11px] text-amber-900/90 font-medium bg-amber-100/50 p-2 rounded-md border border-amber-200/50">
              <span className="font-bold">针对虚拟考官提问：</span>“{getExaminerQuestionForQ(4)}”
            </div>
            <p className="text-xs text-natural-heading leading-relaxed font-medium bg-amber-50/30 p-3 rounded-lg border border-amber-100/50">
              {modelAnswers.q4}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Strengths and Improvement Areas Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* EXACTLY 3 Strengths */}
        <div className="bg-white rounded-2xl border border-natural-border p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-natural-border pb-3">
            <CheckCircle2 className="h-5 w-5 text-natural-sage" />
            <h3 className="font-bold text-natural-heading text-sm">值得表扬的 3 个亮点 (Top 3 Strengths)</h3>
          </div>

          <ul className="space-y-3">
            {report.strengths.slice(0, 3).map((strength, idx) => (
              <li key={idx} className="flex gap-2.5 items-start text-xs text-natural-text font-semibold">
                <span className="h-4.5 w-4.5 shrink-0 rounded-full bg-natural-sage/10 text-natural-sage flex items-center justify-center font-mono font-bold text-[9px] mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* EXACTLY 3 Areas to Improve */}
        <div className="bg-white rounded-2xl border border-natural-border p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-natural-border pb-3">
            <AlertCircle className="h-5 w-5 text-natural-coral-dark" />
            <h3 className="font-bold text-natural-heading text-sm">建议改进的 3 个方面 (Top 3 Areas to Improve)</h3>
          </div>

          <ul className="space-y-3">
            {report.weaknesses.slice(0, 3).map((weakness, idx) => (
              <li key={idx} className="flex gap-2.5 items-start text-xs text-natural-text font-semibold">
                <span className="h-4.5 w-4.5 shrink-0 rounded-full bg-natural-coral/10 text-natural-coral-dark flex items-center justify-center font-mono font-bold text-[9px] mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{weakness}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 5. Action buttons */}
      <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 pt-6 border-t border-natural-border print:hidden">
        <button
          onClick={onBackToMenu}
          className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-natural-border bg-white hover:bg-natural-beige/40 text-natural-heading px-4 py-3 text-xs font-bold shadow-sm transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 text-natural-sage" />
          <span>返回选择菜单</span>
        </button>

        <button
          onClick={onGoToFeedback}
          className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100/70 text-emerald-800 px-4 py-3 text-xs font-bold shadow-sm transition cursor-pointer"
        >
          <GraduationCap className="h-4 w-4 text-emerald-600" />
          <span>开启AI林老师语音点评</span>
        </button>

        <button
          onClick={handleDownloadHtml}
          className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-natural-border bg-white hover:bg-natural-beige/40 text-natural-heading px-4 py-3 text-xs font-bold shadow-sm transition cursor-pointer"
        >
          <Download className="h-4 w-4 text-natural-coral-dark" />
          <span>导出 HTML 报告文件</span>
        </button>

        <button
          onClick={onRestart}
          className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-natural-sage hover:bg-[#5E6D55] text-white px-5 py-3 text-xs font-bold shadow-sm transition cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
          <span>再练一次 / 选择新主题</span>
        </button>
      </div>
    </div>
  );
}
