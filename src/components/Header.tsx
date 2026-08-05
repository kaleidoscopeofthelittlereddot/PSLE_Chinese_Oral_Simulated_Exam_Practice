import React from 'react';
import { Award, BookOpen, Volume2, Shield } from 'lucide-react';

interface HeaderProps {
  examState: string;
  theme?: string;
}

export default function Header({ examState, theme }: HeaderProps) {
const isReadAloud = examState.startsWith('read_aloud');

  return (
    <header className="border-b border-natural-border bg-natural-beige sticky top-0 z-50 transition-all duration-300 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-natural-sage shadow-sm ring-2 ring-white text-white">
              <span className="font-display text-lg font-bold tracking-wider">华</span>
            </div>
            
            <div className="flex flex-col">
              <h1 className="font-display text-sm sm:text-base font-bold tracking-tight text-natural-heading flex items-center gap-1.5">
                PSLE 模拟口试练习

                {isReadAloud ? (
                  <span className="hidden sm:inline-block rounded-full bg-natural-sage/20 px-2 py-0.5 text-[10px] font-semibold text-[#45573d] ring-1 ring-natural-sage/40 transition-colors">
                    朗读短文
                  </span>
                ) : (
                  <span className="hidden sm:inline-block rounded-full bg-natural-coral/20 px-2 py-0.5 text-[10px] font-semibold text-natural-coral-dark ring-1 ring-natural-coral/30 transition-colors">
                    看录像说话
                  </span>
                )}

              </h1>
              <p className="text-[10.5px] font-semibold text-natural-muted tracking-wide font-sans uppercase">
                PSLE Chinese Oral Practice Simulator
              </p>
            </div>
          </div>

          {/* Current Exam State & Context badge */}
          <div className="flex items-center gap-4">
            {theme && (
              <div className="hidden md:flex items-center gap-2 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-natural-heading ring-1 ring-natural-border">
                <BookOpen className="h-3.5 w-3.5 text-natural-sage" />
                <span>主题：{theme.split(' (')[0]}</span>
              </div>
            )}

            {/* Active Status Display */}
            <div className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-full border border-natural-border">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-natural-sage opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-natural-sage"></span>
              </div>
              <span className="text-xs font-bold text-natural-text tracking-wide font-sans">
                {examState === 'setup' && '口试设置中'}
                {examState === 'video_watching' && '看录像中'}
                {examState === 'exam_active' && '考官提问中'}
                {examState === 'exam_completed' && '考完等待反馈'}
                {examState === 'feedback_active' && '导师点评与示范中'}
                {examState === 'report_ready' && '成绩报告已生成'}
                {examState === 'read_aloud_setup' && '朗读短文：篇章选择/输入'}
                {examState === 'read_aloud_prep' && '朗读短文：朗读准备中'}
                {examState === 'read_aloud_recording' && '朗读短文：录音中'}
                {examState === 'read_aloud_report' && '朗读短文：评估报告已生成'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

