import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Download, RotateCcw, ArrowRight, ArrowLeft, Volume2, Sparkles, Loader2, CheckCircle2, AlertTriangle, Database } from 'lucide-react';
import { ReadAloudConfig } from '../types';
import { saveReadAloudBackup, getReadAloudBackup, clearReadAloudBackup } from '../lib/audioBackupDB';

interface ReadAloudRecordingProps {
  config: ReadAloudConfig;
  onGenerateReport: (audioBlob: Blob, audioBase64: string, mimeType: string) => void;
  onBackToPrep: () => void;
  isGeneratingReport: boolean;
  reportError: string | null;
}

export default function ReadAloudRecording({
  config,
  onGenerateReport,
  onBackToPrep,
  isGeneratingReport,
  reportError,
}: ReadAloudRecordingProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(config.audioUrl || null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(config.audioBlob || null);
  const [audioBase64, setAudioBase64] = useState<string | null>(config.audioBase64 || null);
  const [mimeType, setMimeType] = useState<string>(config.audioMimeType || 'audio/webm');
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const [restoredFromBackup, setRestoredFromBackup] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  // Restore audio from IndexedDB on load if present
  useEffect(() => {
    let isMounted = true;
    async function checkIndexedDB() {
      if (!recordedAudioUrl) {
        const backup = await getReadAloudBackup('read_aloud_latest');
        if (isMounted && backup && backup.audioBlob) {
          const restoredUrl = URL.createObjectURL(backup.audioBlob);
          setRecordedAudioUrl(restoredUrl);
          setRecordedBlob(backup.audioBlob);
          if (backup.audioBase64) setAudioBase64(backup.audioBase64);
          if (backup.audioMimeType) setMimeType(backup.audioMimeType);
          setRestoredFromBackup(true);
        }
      }
    }
    checkIndexedDB();

    return () => {
      isMounted = false;
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    setMicPermissionError(null);
    setRestoredFromBackup(false);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let selectedMimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        selectedMimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        selectedMimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        selectedMimeType = 'audio/ogg';
      }

      setMimeType(selectedMimeType);
      const mediaRecorder = new MediaRecorder(stream, { mimeType: selectedMimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: selectedMimeType });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);
        setRecordedBlob(audioBlob);

        // Convert Blob to Base64 and store into IndexedDB
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const resultStr = reader.result as string;
          const base64Str = resultStr.split(',')[1] || '';
          setAudioBase64(base64Str);

          // Save to IndexedDB
          saveReadAloudBackup({
            id: 'read_aloud_latest',
            passageTitle: config.passageTitle || '朗读短文',
            passageText: config.passageText,
            audioBlob,
            audioBase64: base64Str,
            audioMimeType: selectedMimeType,
            timestamp: new Date().toISOString(),
          });
        };

        // Stop media tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access failed:', err);
      setMicPermissionError('无法访问麦克风，请检查浏览器麦克风权限设置并确保已开启许可。');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  const handleReRecord = async () => {
    setRecordedAudioUrl(null);
    setRecordedBlob(null);
    setAudioBase64(null);
    setRecordingTime(0);
    setRestoredFromBackup(false);
    await clearReadAloudBackup('read_aloud_latest');
  };

  const handleSubmitReport = () => {
    if (!recordedBlob || !audioBase64) return;
    onGenerateReport(recordedBlob, audioBase64, mimeType);
  };

  const formatSec = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#EADFCD] shadow-sm space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EADFCD]/60 pb-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToPrep}
              disabled={isRecording || isGeneratingReport}
              className="p-2 rounded-xl text-natural-muted hover:text-natural-heading hover:bg-[#FAF7F2] transition cursor-pointer disabled:opacity-50"
              title="返回准备页面"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <span className="text-xs font-bold text-natural-sage tracking-wider uppercase">
                步骤 2/2：正式朗读录音
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-display text-[#5C4D3C]">
                {config.passageTitle || '《朗读短文》'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#FAF7F2] border border-[#D8C3A8] px-4 py-2 rounded-xl text-xs font-bold text-[#6D5C4A]">
            <Mic className={`h-4 w-4 ${isRecording ? 'text-red-500 animate-pulse' : 'text-natural-sage'}`} />
            <span>{isRecording ? `正在录音 (${formatSec(recordingTime)})` : recordedAudioUrl ? '已完成录音' : '准备就绪'}</span>
          </div>
        </div>

        {/* Top Quick Recording Control Bar (Convenient start/stop without scrolling) */}
        {!recordedAudioUrl && (
          <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#D8C3A8] shadow-2xs">
            {!isRecording ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-natural-muted font-medium">
                  💡 <b>顶部便捷控制：</b>准备完毕后可直接在此处点击开启录音：
                </span>
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-sm transition transform active:scale-95 cursor-pointer shrink-0"
                >
                  <Mic className="h-4 w-4 animate-pulse" />
                  <span>开始麦克风录音 (Start Recording)</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 h-5">
                    <div className="w-1 h-5 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1 h-6 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1 h-4 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs font-mono font-bold text-red-600">
                    正在朗读录音中... {formatSec(recordingTime)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 bg-gray-800 hover:bg-black text-white rounded-xl font-bold text-xs shadow-sm transition cursor-pointer shrink-0"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                  <span>完成朗读 (Stop Recording)</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Display Reading Passage Text */}
        <div className="bg-[#FAF7F2]/60 p-6 sm:p-8 rounded-2xl border border-[#EADFCD] space-y-3">
          <div className="text-xs font-bold text-[#6D5C4A] uppercase tracking-wider flex items-center justify-between">
            <span>请保持语速平稳、发音饱满地朗读以下文本：</span>
          </div>

          <div className="text-lg sm:text-2xl leading-relaxed sm:leading-loose text-natural-text font-medium tracking-wide bg-white p-6 sm:p-8 rounded-xl border border-natural-border/60 shadow-xs selection:bg-natural-sage/20">
            {config.passageText}
          </div>
        </div>

        {/* Recording Controls Area */}
        <div className="p-6 rounded-2xl bg-[#FAF7F2] border border-[#D8C3A8] text-center space-y-4">
          {!recordedAudioUrl ? (
            <div className="space-y-4">
              {!isRecording ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={startRecording}
                    className="mx-auto flex items-center justify-center gap-3 px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-base shadow-md transition transform active:scale-95 cursor-pointer"
                  >
                    <Mic className="h-6 w-6 animate-pulse" />
                    <span>点击开始麦克风录音 (Start Recording)</span>
                  </button>
                  <p className="text-xs text-natural-muted font-medium">
                    提示：请确保处于安静环境，声音洪亮清晰。录音将自动备份至本地 IndexedDB。
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Waveform Visualizer Animation */}
                  <div className="flex items-center justify-center gap-1.5 h-10">
                    <div className="w-1.5 h-8 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-10 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-6 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    <div className="w-1.5 h-10 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '450ms' }} />
                    <div className="w-1.5 h-7 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                  </div>

                  <div className="text-lg font-mono font-bold text-red-600">
                    录音中... {formatSec(recordingTime)}
                  </div>

                  <button
                    type="button"
                    onClick={stopRecording}
                    className="mx-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-gray-800 hover:bg-black text-white rounded-2xl font-bold text-sm shadow-md transition cursor-pointer"
                  >
                    <Square className="h-5 w-5 fill-current" />
                    <span>完成朗读 (Stop Recording)</span>
                  </button>
                </div>
              )}

              {micPermissionError && (
                <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-200 font-semibold max-w-md mx-auto">
                  {micPermissionError}
                </p>
              )}
            </div>
          ) : (
            /* Recorded Audio Preview & Actions */
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-sm font-bold text-emerald-700 bg-emerald-50 py-2 px-4 rounded-xl border border-emerald-200 max-w-md mx-auto">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{restoredFromBackup ? '已从 IndexedDB 本地数据库成功恢复录音音频！' : '录音完成并已自动存入 IndexedDB 本地数据库！'}</span>
              </div>

              {/* Audio Player Element */}
              <div className="max-w-md mx-auto bg-white p-3 rounded-xl border border-[#D8C3A8]">
                <audio src={recordedAudioUrl} controls className="w-full h-10" />
              </div>

              {/* Auxiliary Download & Re-record Actions */}
              <div className="flex items-center justify-center gap-3 pt-1">
                <a
                  href={recordedAudioUrl}
                  download="read_aloud_practice.webm"
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#FAF7F2] text-[#6D5C4A] border border-[#D8C3A8] rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>下载音频文件</span>
                </a>

                <button
                  type="button"
                  onClick={handleReRecord}
                  disabled={isGeneratingReport}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#FAF7F2] text-[#6D5C4A] border border-[#D8C3A8] rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>重新录音</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Generate Report Button & Honest Error Notice */}
        {recordedAudioUrl && (
          <div className="space-y-4 pt-2">
            {reportError && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>评估请求处理提示 (Evaluation Processing Notice)</span>
                </div>
                <p className="text-amber-800 leading-relaxed font-medium">
                  {reportError}
                </p>
                <div className="flex items-center gap-1.5 text-emerald-800 text-[11px] font-semibold pt-1">
                  <Database className="h-3.5 w-3.5 text-emerald-600" />
                  <span>您的朗读录音文件已完整保存在 IndexedDB 中，不会丢失。您可以直接再次发起评估。</span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmitReport}
              disabled={isGeneratingReport}
              className="w-full py-4 px-6 bg-natural-sage hover:bg-natural-sage-dark text-white rounded-2xl font-bold text-base shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isGeneratingReport ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>AI 考官正在深度评估朗读发音与语调...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 text-amber-200" />
                  <span>{reportError ? '重新生成评估报告 (Try Generating Report Again)' : '生成朗读短文评估报告 (Generate Report)'}</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
