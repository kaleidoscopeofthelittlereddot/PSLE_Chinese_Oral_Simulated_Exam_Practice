import React, { useState, useEffect } from 'react';
import { Clock, Play, Pause, RotateCcw, ArrowRight, ArrowLeft, Volume2, Sparkles, CheckCircle2 } from 'lucide-react';
import { ReadAloudConfig } from '../types';

interface ReadAloudPrepProps {
  config: ReadAloudConfig;
  onProceedToRecording: () => void;
  onBackToInput: () => void;
}

export default function ReadAloudPrep({
  config,
  onProceedToRecording,
  onBackToInput,
}: ReadAloudPrepProps) {
  const [timeLeftSec, setTimeLeftSec] = useState(240); // 4 minutes = 240 seconds
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    let timer: any = null;
    if (isRunning && timeLeftSec > 0) {
      timer = setInterval(() => {
        setTimeLeftSec((prev) => prev - 1);
      }, 1000);
    } else if (timeLeftSec === 0) {
      setIsRunning(false);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, timeLeftSec]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setTimeLeftSec(240);
    setIsRunning(true);
  };

  const minutes = Math.floor(timeLeftSec / 60);
  const seconds = timeLeftSec % 60;
  const progressPercent = Math.max(0, Math.min(100, ((240 - timeLeftSec) / 240) * 100));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#EADFCD] shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-[#EADFCD]/60 pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToInput}
              className="p-2 rounded-xl text-natural-muted hover:text-natural-heading hover:bg-[#FAF7F2] transition cursor-pointer"
              title="返回修改短文"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <span className="text-xs font-bold text-natural-sage tracking-wider uppercase">
                步骤 1/2：默读准备环节
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-display text-[#5C4D3C]">
                {config.passageTitle || '《朗读短文》'}
              </h2>
            </div>
          </div>
        </div>

        {/* Timer Progress Bar */}
        <div className="w-full bg-[#FAF7F2] h-2 rounded-full overflow-hidden border border-[#EADFCD]">
          <div
            className="bg-natural-sage h-full transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Reading Passage Box with Timer directly above text next to Word Count */}
        <div className="bg-[#FAF7F2]/60 p-5 sm:p-8 rounded-2xl border border-[#EADFCD] space-y-4">
          <div className="text-xs font-bold text-[#6D5C4A] uppercase tracking-wider flex flex-wrap items-center justify-between gap-3 border-b border-[#EADFCD]/60 pb-3">
            <span className="text-sm font-bold text-[#5C4D3C]">短文 (Reading Passage)</span>

            <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-normal normal-case text-natural-sage font-sans tracking-normal bg-natural-sage/10 border border-natural-sage/20 px-2 py-0.5 rounded-lg hidden sm:inline-block">
                💡 划亮词句 可查检读音
              </span>
              {/* Compact Countdown Timer Widget */}
              <div className="flex items-center gap-2 bg-white border border-[#D8C3A8] px-3 py-1.5 rounded-xl shadow-2xs">
                <Clock className={`h-4 w-4 ${timeLeftSec < 30 ? 'text-red-500 animate-pulse' : 'text-natural-sage'}`} />
                <span className="text-xs font-mono font-bold text-[#5C4D3C]">
                  倒计时: {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </span>
                <div className="flex items-center gap-1 pl-1 border-l border-[#D8C3A8]/60">
                  <button
                    type="button"
                    onClick={toggleTimer}
                    className="p-1 rounded bg-[#FAF7F2] hover:bg-[#F3ECE0] text-[#6D5C4A] transition cursor-pointer"
                    title={isRunning ? '暂停倒计时' : '继续倒计时'}
                  >
                    {isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={resetTimer}
                    className="p-1 rounded bg-[#FAF7F2] hover:bg-[#F3ECE0] text-[#6D5C4A] transition cursor-pointer"
                    title="重置 4 分钟"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <span className="text-xs font-bold text-[#6D5C4A] bg-white border border-[#D8C3A8] px-2.5 py-1 rounded-xl">
                字数：{config.passageText.length} 字
              </span>
            </div>
          </div>

          <div className="text-base sm:text-xl leading-relaxed sm:leading-loose text-natural-text font-medium tracking-wide bg-white p-6 rounded-xl border border-natural-border/60 shadow-xs selection:bg-natural-sage/20">
            {config.passageText}
          </div>
        </div>

        {/* PSLE Prep Tips Box */}
        <div className="bg-white p-5 rounded-2xl border border-[#EADFCD] space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#6D5C4A]">
            <Sparkles className="h-4 w-4 text-natural-sage" />
            <span>PSLE 华文口试朗读得高分秘诀提示：</span>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-natural-muted font-medium">
            <li className="flex items-start gap-2 bg-[#FAF7F2] p-3 rounded-xl border border-[#EADFCD]/60">
              <CheckCircle2 className="h-4 w-4 text-natural-sage shrink-0 mt-0.5" />
              <span><b>生字与变调：</b>扫描文中难读生字，注意“一”与“不”的变调规则。</span>
            </li>
            <li className="flex items-start gap-2 bg-[#FAF7F2] p-3 rounded-xl border border-[#EADFCD]/60">
              <CheckCircle2 className="h-4 w-4 text-natural-sage shrink-0 mt-0.5" />
              <span><b>断句与节奏：</b>逗号做短暂停顿，句号做明显停顿，切忌中途回读。</span>
            </li>
            <li className="flex items-start gap-2 bg-[#FAF7F2] p-3 rounded-xl border border-[#EADFCD]/60">
              <CheckCircle2 className="h-4 w-4 text-natural-sage shrink-0 mt-0.5" />
              <span><b>语气与抑扬：</b>问句语气上扬，感叹句富有感情，避免机械念经。</span>
            </li>
          </ul>
        </div>

        {/* Action Button */}
        <div>
          <button
            type="button"
            onClick={onProceedToRecording}
            className="w-full py-4 px-6 bg-natural-sage hover:bg-natural-sage-dark text-white rounded-2xl font-bold text-base shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>准备完毕，开始录音朗读 (Start Reading)</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
