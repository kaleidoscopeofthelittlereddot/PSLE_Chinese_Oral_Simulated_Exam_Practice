import React from 'react';
import { Award, CheckCircle2, AlertTriangle, Sparkles, Volume2, RotateCcw, Home, Download, ArrowLeft, BookmarkCheck, ThumbsUp, TrendingUp } from 'lucide-react';
import { ReadAloudReportData, ReadAloudConfig } from '../types';

interface ReadAloudReportProps {
  report: ReadAloudReportData;
  config: ReadAloudConfig;
  onRestart: () => void;
  onBackToMain: () => void;
}

export default function ReadAloudReport({
  report,
  config,
  onRestart,
  onBackToMain,
}: ReadAloudReportProps) {
  const getGradeBand = (score: number) => {
    if (score >= 18) return { label: '卓越 (Excellent)', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' };
    if (score >= 15) return { label: '良好 (Good)', color: 'text-blue-700 bg-blue-50 border-blue-300' };
    if (score >= 12) return { label: '尚可 (Average)', color: 'text-amber-700 bg-amber-50 border-amber-300' };
    return { label: '需努力 (Needs Work)', color: 'text-rose-700 bg-rose-50 border-rose-300' };
  };

  const gradeBand = getGradeBand(report.score);

  // Generate printable/downloadable HTML for Read Aloud Report
  const generateReportHtml = () => {
    const cleanTitle = config.passageTitle || '朗读短文';
    const todayDate = new Date().toLocaleDateString('zh-CN');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>PSLE 华文模拟口试练习：朗读短文综合评估 - ${cleanTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; padding: 32px; color: #2D3748; background: #fff; max-width: 880px; margin: 0 auto; line-height: 1.6; }
    .header { border-bottom: 3px solid #7A8C70; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    h1 { color: #2D3748; font-size: 24px; margin: 0; font-weight: 800; }
    .subtitle { color: #718096; font-size: 13px; margin-top: 4px; font-weight: bold; }
    .score-badge { text-align: right; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px 20px; border-radius: 12px; }
    .score-num { font-size: 38px; font-weight: 800; color: #7A8C70; line-height: 1; }
    .summary-box { background: #F7FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; margin-bottom: 20px; font-size: 13px; }
    .passage-box { background: #FAF7F2; border: 1px solid #EADFCD; border-radius: 10px; padding: 16px; margin-bottom: 20px; font-size: 13.5px; line-height: 1.8; color: #4A5568; }
    .passage-title { font-weight: bold; color: #5C4D3C; font-size: 14px; margin-bottom: 8px; border-bottom: 1px solid #EADFCD; padding-bottom: 4px; }
    .section-title { font-size: 15px; font-weight: bold; color: #2D3748; margin-top: 26px; margin-bottom: 12px; border-left: 4px solid #7A8C70; padding-left: 10px; }
    .rubric-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .rubric-item { background: #FAF7F2; border: 1px solid #EADFCD; padding: 12px; border-radius: 8px; font-size: 12px; }
    .error-table { width: 100%; font-size: 12px; border-collapse: collapse; text-align: left; margin-bottom: 16px; }
    .error-table th { background: #FED7D7; color: #742A2A; padding: 8px; border: 1px solid #FEB2B2; font-weight: bold; }
    .error-table td { padding: 8px; border: 1px solid #FEB2B2; background: #fff; }
    .expr-card { background: #FAF7F2; border: 1px solid #EADFCD; border-radius: 8px; padding: 10px 14px; margin-bottom: 8px; font-size: 12.5px; color: #2D3748; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
    ol, ul { padding-left: 20px; font-size: 12.5px; margin: 0; color: #2D3748; }
    li { margin-bottom: 6px; }
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
      <h1>PSLE 华文模拟口试练习：朗读短文综合评估</h1>
      <div class="subtitle">短文题目：${cleanTitle} | 评估日期：${todayDate}</div>
    </div>
    <div class="score-badge">
      <div style="font-size: 11px; color: #718096; font-weight: bold;">这次练习评估</div>
      <div class="score-num">${report.score} <span style="font-size: 16px; color: #A0AEC0;">/ 20</span></div>
      <div style="font-size: 11px; font-weight: bold; color: #7A8C70; margin-top: 4px;">${gradeBand.label}</div>
    </div>
  </div>

  <div class="summary-box">
    <strong>考官综合总评：</strong>${report.overallComments}
  </div>

  <div class="passage-box">
    <div class="passage-title">📖 朗读短文 (Passage Text)</div>
    <div>${config.passageText.replace(/\n/g, '<br/>')}</div>
  </div>

  <div class="section-title">一、详细综合评估 (Performance Assessment)</div>
  <div class="rubric-grid">
    <div class="rubric-item">
      <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 4px;">
        <span>🗣️ 1. 语音与声调 (Pronunciation & Tones)</span>
        <span style="color: #7A8C70; font-family: monospace;">${report.rubricBreakdown.pronunciation.score} / ${report.rubricBreakdown.pronunciation.maxScore}分</span>
      </div>
      <div style="color: #2D3748; font-size: 11.5px;">${report.rubricBreakdown.pronunciation.comments}</div>
    </div>
    <div class="rubric-item">
      <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 4px;">
        <span>⚡ 2. 流利度与节奏 (Fluency)</span>
        <span style="color: #7A8C70; font-family: monospace;">${report.rubricBreakdown.fluency.score} / ${report.rubricBreakdown.fluency.maxScore}分</span>
      </div>
      <div style="color: #2D3748; font-size: 11.5px;">${report.rubricBreakdown.fluency.comments}</div>
    </div>
    <div class="rubric-item">
      <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 4px;">
        <span>🎭 3. 语调与表情达意 (Expression)</span>
        <span style="color: #7A8C70; font-family: monospace;">${report.rubricBreakdown.expression.score} / ${report.rubricBreakdown.expression.maxScore}分</span>
      </div>
      <div style="color: #2D3748; font-size: 11.5px;">${report.rubricBreakdown.expression.comments}</div>
    </div>
    <div class="rubric-item">
      <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 4px;">
        <span>🎯 4. 字面准确率 (Textual Accuracy)</span>
        <span style="color: #7A8C70; font-family: monospace;">${report.rubricBreakdown.accuracy.score} / ${report.rubricBreakdown.accuracy.maxScore}分</span>
      </div>
      <div style="color: #2D3748; font-size: 11.5px;">${report.rubricBreakdown.accuracy.comments}</div>
    </div>
  </div>

  <div class="section-title">二、错读与发音失准字词明细 (Misread Words & Phonetic Errors)</div>
  ${report.misreadWords && report.misreadWords.length > 0 ? `
  <table class="error-table">
    <thead>
      <tr>
        <th>字词</th>
        <th>上下文语境</th>
        <th>错读发音</th>
        <th>正确拼音</th>
        <th>错误类型说明</th>
      </tr>
    </thead>
    <tbody>
      ${report.misreadWords.map(item => `
        <tr>
          <td style="font-weight: bold; color: #9B2C2C;">${item.character}</td>
          <td>${item.context || '-'}</td>
          <td style="color: #C53030; font-family: monospace;">${item.pronouncedAs}</td>
          <td style="color: #276749; font-weight: bold; font-family: monospace;">${item.correctPinyin}</td>
          <td>${item.errorType}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  ` : `
  <div style="background: #F0FDF4; border: 1px solid #BBF7D0; color: #166534; padding: 12px; border-radius: 8px; font-size: 13px; font-weight: 500;">
    ✅ 太棒了！AI 考官未检测到明显的字词错读或严重变调问题。
  </div>
  `}

  <div class="section-title">三、感情与语调需加强词语 (Phrases Needing Expression)</div>
  ${report.expressionNeeds && report.expressionNeeds.length > 0 ? report.expressionNeeds.map((sent, idx) => `
    <div class="expr-card">
      <strong>${idx + 1}.</strong> ${sent}
    </div>
  `).join('') : `
    <div style="background: #FAF7F2; padding: 10px; border-radius: 6px; font-size: 12px; color: #718096;">
      抑扬顿挫得当，语调自然流利。
    </div>
  `}

  <div class="section-title">四、优缺点与建议 (Strengths & Areas to Improve)</div>
  <div class="grid-2">
    <div style="background: #F0FDF4; border: 1px solid #DCFCE7; padding: 14px; border-radius: 8px;">
      <h3 style="font-size: 13px; color: #166534; margin-top: 0; margin-bottom: 8px;">👍 朗读优点 (Strengths)：</h3>
      <ul>
        ${report.strengths.slice(0, 3).map(s => `<li>${s}</li>`).join('')}
      </ul>
    </div>
    <div style="background: #FFFBEB; border: 1px solid #FEF3C7; padding: 14px; border-radius: 8px;">
      <h3 style="font-size: 13px; color: #92400E; margin-top: 0; margin-bottom: 8px;">📈 建议改进方向 (Areas to Improve)：</h3>
      <ul>
        ${report.improvements.slice(0, 3).map(imp => `<li>${imp}</li>`).join('')}
      </ul>
    </div>
  </div>
</body>
</html>`;
  };

  const handleDownloadHtml = () => {
    const todayDate = new Date().toISOString().slice(0, 10);
    const htmlContent = generateReportHtml();
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanTitle = (config.passageTitle || '朗读短文').replace(/[\\/:*?"<>|]/g, '_');
    link.setAttribute('download', `PSLE_华文模拟口试朗读短文综合评估_${cleanTitle}_${todayDate}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EADFCD] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EADFCD]/60 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-natural-sage/10 text-natural-sage-dark text-xs font-bold mb-1">
              <Award className="h-3.5 w-3.5" />
              <span>PSLE 华文模拟口试练习：朗读短文综合评估</span>
            </div>
            <h2 className="text-2xl font-bold font-display text-[#5C4D3C]">
              {config.passageTitle || '《朗读短文综合评估》'}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#FAF7F2] hover:bg-[#F3ECE0] text-[#6D5C4A] border border-[#D8C3A8] rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-natural-coral-dark" />
              <span>导出 HTML 报告</span>
            </button>

            <button
              type="button"
              onClick={onRestart}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#FAF7F2] hover:bg-[#F3ECE0] text-[#6D5C4A] border border-[#D8C3A8] rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>再次练习朗读</span>
            </button>
            <button
              type="button"
              onClick={onBackToMain}
              className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-[#FAF7F2] text-[#6D5C4A] border border-[#D8C3A8] rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Home className="h-3.5 w-3.5" />
              <span>返回口试主页</span>
            </button>
          </div>
        </div>

        {/* Score Overview Card */}
        <div className="bg-[#FAF7F2] p-6 sm:p-8 rounded-2xl border border-[#D8C3A8] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-xs font-bold text-natural-muted uppercase tracking-wider">
              这次练习评估
            </span>
            <div className="flex items-baseline gap-2 justify-center md:justify-start">
              <span className="text-5xl sm:text-6xl font-black font-display text-[#5C4D3C]">
                {report.score}
              </span>
              <span className="text-xl font-bold text-natural-muted">/ 20 分</span>
            </div>
            <div className={`inline-block px-3 py-1 rounded-full border text-xs font-bold ${gradeBand.color}`}>
              {gradeBand.label}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#EADFCD] text-xs leading-relaxed text-natural-text max-w-md">
            <p className="font-semibold text-[#6D5C4A] mb-1 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-natural-sage" />
              考官综合总评：
            </p>
            <p className="text-natural-muted font-medium">{report.overallComments}</p>
          </div>
        </div>

        {/* Recorded Audio Replay */}
        {config.audioUrl && (
          <div className="bg-white p-4 rounded-2xl border border-[#EADFCD] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-natural-sage/10 text-natural-sage-dark">
                <Volume2 className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#6D5C4A]">试听本次朗读音频</span>
                <p className="text-[11px] text-natural-muted font-medium">您可以随时播放或下载音频进行自我检讨</p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <audio src={config.audioUrl} controls className="h-9 w-full sm:w-60" />
              <a
                href={config.audioUrl}
                download="my_read_aloud_recording.webm"
                className="p-2 bg-[#FAF7F2] hover:bg-[#F3ECE0] text-[#6D5C4A] border border-[#D8C3A8] rounded-xl text-xs font-bold transition shadow-2xs shrink-0 cursor-pointer"
                title="下载音频"
              >
                <Download className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}

        {/* Section 1: 4 Rubric Component Breakdown */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-[#6D5C4A] uppercase tracking-wider flex items-center gap-2">
            <BookmarkCheck className="h-4 w-4 text-natural-sage" />
            详细综合评估 (Performance Assessment)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Pronunciation & Tones */}
            <div className="bg-white p-5 rounded-2xl border border-[#EADFCD] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#5C4D3C]">1. 语音与声调 (Pronunciation & Tones)</span>
                <span className="font-mono font-bold text-sm text-natural-sage-dark">
                  {report.rubricBreakdown.pronunciation.score} / {report.rubricBreakdown.pronunciation.maxScore} 分
                </span>
              </div>
              <p className="text-xs text-natural-muted font-medium leading-relaxed bg-[#FAF7F2] p-3 rounded-xl border border-[#EADFCD]/60">
                {report.rubricBreakdown.pronunciation.comments}
              </p>
            </div>

            {/* 2. Fluency */}
            <div className="bg-white p-5 rounded-2xl border border-[#EADFCD] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#5C4D3C]">2. 流利度与节奏 (Fluency)</span>
                <span className="font-mono font-bold text-sm text-natural-sage-dark">
                  {report.rubricBreakdown.fluency.score} / {report.rubricBreakdown.fluency.maxScore} 分
                </span>
              </div>
              <p className="text-xs text-natural-muted font-medium leading-relaxed bg-[#FAF7F2] p-3 rounded-xl border border-[#EADFCD]/60">
                {report.rubricBreakdown.fluency.comments}
              </p>
            </div>

            {/* 3. Expression & Intonation */}
            <div className="bg-white p-5 rounded-2xl border border-[#EADFCD] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#5C4D3C]">3. 语调与表情达意 (Expression)</span>
                <span className="font-mono font-bold text-sm text-natural-sage-dark">
                  {report.rubricBreakdown.expression.score} / {report.rubricBreakdown.expression.maxScore} 分
                </span>
              </div>
              <p className="text-xs text-natural-muted font-medium leading-relaxed bg-[#FAF7F2] p-3 rounded-xl border border-[#EADFCD]/60">
                {report.rubricBreakdown.expression.comments}
              </p>
            </div>

            {/* 4. Textual Accuracy */}
            <div className="bg-white p-5 rounded-2xl border border-[#EADFCD] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#5C4D3C]">4. 字面准确度 (Textual Accuracy)</span>
                <span className="font-mono font-bold text-sm text-natural-sage-dark">
                  {report.rubricBreakdown.accuracy.score} / {report.rubricBreakdown.accuracy.maxScore} 分
                </span>
              </div>
              <p className="text-xs text-natural-muted font-medium leading-relaxed bg-[#FAF7F2] p-3 rounded-xl border border-[#EADFCD]/60">
                {report.rubricBreakdown.accuracy.comments}
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Misread Words Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-[#6D5C4A] uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            错读与发音失准字词明细 (Misread Words & Phonetic Errors)
          </h3>

          {report.misreadWords && report.misreadWords.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {report.misreadWords.map((item, idx) => (
                <div key={idx} className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-200/80 space-y-1 text-xs">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-rose-900">
                      “{item.character}” ({item.context || '原文语境'})
                    </span>
                    <span className="text-[10px] bg-rose-200/60 text-rose-800 px-2 py-0.5 rounded-md">
                      {item.errorType}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-rose-800 font-medium pt-1">
                    <span>误读为：<strong className="text-rose-900">{item.pronouncedAs}</strong></span>
                    <span>正音应为：<strong className="text-emerald-700">{item.correctPinyin}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>太棒了！AI 考官未检测到明显的字词错读或严重变调问题。</span>
            </div>
          )}
        </div>

        {/* Section 3: Expression Improvement Sentences */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-[#6D5C4A] uppercase tracking-wider flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-natural-sage" />
            感情与语调需加强词语 (Phrases Needing Expression)
          </h3>

          <div className="space-y-2">
            {report.expressionNeeds && report.expressionNeeds.length > 0 ? (
              report.expressionNeeds.map((sent, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#EADFCD] text-xs text-natural-text font-medium leading-relaxed flex items-start gap-2.5">
                  <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-natural-sage/20 text-natural-sage-dark text-[11px] font-bold">
                    {idx + 1}
                  </span>
                  <span>{sent}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-natural-muted bg-[#FAF7F2] p-3 rounded-xl border border-[#EADFCD]">
                抑扬顿挫得当，语调自然流利。
              </p>
            )}
          </div>
        </div>

        {/* Section 4: Strengths & Areas of Improvement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Strengths */}
          <div className="space-y-3 bg-emerald-50/40 p-5 rounded-2xl border border-emerald-200/80">
            <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
              <ThumbsUp className="h-4 w-4 text-emerald-600" />
              朗读优点 (Strengths)
            </h4>
            <ul className="space-y-2">
              {report.strengths.slice(0, 3).map((s, idx) => (
                <li key={idx} className="text-xs font-medium text-emerald-950 flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Areas of Improvement */}
          <div className="space-y-3 bg-amber-50/40 p-5 rounded-2xl border border-amber-200/80">
            <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-600" />
              建议改进方向 (Areas to Improve)
            </h4>
            <ul className="space-y-2">
              {report.improvements.slice(0, 3).map((imp, idx) => (
                <li key={idx} className="text-xs font-medium text-amber-950 flex items-start gap-2">
                  <span className="flex-shrink-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{imp}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 pt-6 border-t border-[#EADFCD] print:hidden">
          <button
            type="button"
            onClick={onBackToMain}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-[#D8C3A8] bg-white hover:bg-[#FAF7F2] text-[#6D5C4A] px-4 py-3 text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Home className="h-4 w-4 text-natural-sage-dark" />
            <span>返回口试主页</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadHtml}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-natural-coral-dark/30 bg-rose-50/60 hover:bg-rose-100/70 text-rose-900 px-5 py-3 text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Download className="h-4 w-4 text-natural-coral-dark" />
            <span>导出 HTML 报告文件</span>
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-natural-sage hover:bg-[#5E6D55] text-white px-5 py-3 text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            <span>再次练习朗读短文</span>
          </button>
        </div>

      </div>
    </div>
  );
}
