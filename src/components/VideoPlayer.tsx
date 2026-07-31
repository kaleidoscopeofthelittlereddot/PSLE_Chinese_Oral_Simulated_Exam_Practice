import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, ArrowRight, Video, FileText, MonitorPlay, Clock } from 'lucide-react';
import { ExamConfig, VideoScene } from '../types';
import { speakChineseText, stopSpeaking } from '../lib/speech';

interface VideoPlayerProps {
  config: ExamConfig;
  onFinishedWatching: () => void;
}

export default function VideoPlayer({ config, onFinishedWatching }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isNarrating, setIsNarrating] = useState(false);
  const [isSpeakingScene, setIsSpeakingScene] = useState(false);

  // 6-minute (360s) Preparation Timer
  const [prepTimeLeft, setPrepTimeLeft] = useState(360);
  const [isPrepTimerRunning, setIsPrepTimerRunning] = useState(true);

  const totalScenes = config.scenes.length;

  // Countdown timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPrepTimerRunning && prepTimeLeft > 0) {
      timer = setInterval(() => {
        setPrepTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (prepTimeLeft === 0) {
      setIsPrepTimerRunning(false);
    }
    return () => clearInterval(timer);
  }, [isPrepTimerRunning, prepTimeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Speak a specific scene description
  const speakCurrentScene = (sceneIdx = currentSceneIndex) => {
    const sceneDesc = config.scenes[sceneIdx]?.description;
    if (!sceneDesc) return;

    stopSpeaking();
    setIsNarrating(false);
    setIsSpeakingScene(true);

    speakChineseText(
      `场景${sceneIdx + 1}：${sceneDesc}`,
      () => setIsSpeakingScene(true),
      () => setIsSpeakingScene(false),
      () => setIsSpeakingScene(false)
    );
  };

  // Auto-speak scene description whenever the active scene changes during video play
  useEffect(() => {
    if (isPlaying) {
      speakCurrentScene(currentSceneIndex);
    }
  }, [currentSceneIndex, isPlaying]);

  // Simulate timeline progression when playing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            stopSpeaking();
            setIsNarrating(false);
            setIsSpeakingScene(false);
            return 100;
          }
          const nextProgress = prev + 1;
          
          // Calculate active scene index based on progress
          const sceneShare = 100 / totalScenes;
          const targetSceneIndex = Math.min(
            Math.floor(nextProgress / sceneShare),
            totalScenes - 1
          );
          if (targetSceneIndex !== currentSceneIndex) {
            setCurrentSceneIndex(targetSceneIndex);
          }
          return nextProgress;
        });
      }, 600); // Speed of the timeline play (100 steps * 600ms = 60s total duration)
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentSceneIndex, totalScenes]);

  const handlePlay = () => {
    if (progress >= 100) {
      setProgress(0);
      setCurrentSceneIndex(0);
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
    stopSpeaking();
    setIsNarrating(false);
    setIsSpeakingScene(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentSceneIndex(0);
    stopSpeaking();
    setIsNarrating(false);
    setIsSpeakingScene(false);
  };

  const handleSpeakNarration = () => {
    if (isNarrating) {
      stopSpeaking();
      setIsNarrating(false);
    } else {
      setIsSpeakingScene(false);
      setIsNarrating(true);
      speakChineseText(
        `旁白：${config.narration}`,
        () => setIsNarrating(true),
        () => setIsNarrating(false),
        () => setIsNarrating(false)
      );
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-natural-border overflow-hidden max-w-4xl mx-auto my-6 font-sans">
      {/* Simulation Screen Header */}
      <div className="bg-natural-beige px-4 py-3 border-b border-natural-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-natural-heading">
          <MonitorPlay className="h-4 w-4 text-natural-sage" />
          <span className="text-xs font-bold uppercase tracking-wider font-mono">Video Simulator 录像播映</span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-natural-coral animate-pulse" />
          <span className="text-[10px] font-bold text-natural-coral font-mono tracking-widest">CONNECTED</span>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="relative h-72 bg-natural-dark-beige flex flex-col justify-between p-6 overflow-hidden border-b border-natural-border">
        {/* Background visual styling */}
        <div className="absolute inset-0 bg-[#E0D8CB]/30 pointer-events-none" />

        {/* Video Screen Content */}
        <div className="relative flex-1 flex flex-col justify-center items-center z-10 text-center px-4">
          {progress === 0 && !isPlaying ? (
            <div className="space-y-4">
              <button
                onClick={handlePlay}
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-natural-sage/20 text-natural-sage hover:bg-natural-sage/30 hover:scale-105 transition-all duration-300 ring-4 ring-natural-sage/10 border border-natural-sage/20 cursor-pointer"
              >
                <Play className="h-8 w-8 fill-current translate-x-0.5" />
              </button>
              <div>
                <h3 className="text-natural-heading font-display text-lg font-bold">准备看录像说话</h3>
                <p className="text-natural-muted text-xs mt-1 max-w-sm mx-auto font-semibold">
                  点击播放键开始放映录像。建议仔细观察视频中的人物行为与场景细节。
                </p>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-6">
              {/* Scene Display Card */}
              <div className="mx-auto max-w-xl bg-white/95 backdrop-blur-md rounded-xl p-5 border border-natural-border shadow-md text-left transform scale-100 transition duration-500">
                <div className="flex items-center justify-between border-b border-natural-border pb-2 mb-3">
                  <span className="text-xs font-bold text-natural-sage tracking-wider flex items-center gap-1">
                    <Video className="h-3.5 w-3.5" />
                    SCENE {currentSceneIndex + 1} OF {totalScenes}
                  </span>
                  
                  {/* Read Scene Audio Button */}
                  <button
                    onClick={() => speakCurrentScene(currentSceneIndex)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                      isSpeakingScene
                        ? 'bg-natural-sage text-white border-natural-sage animate-pulse'
                        : 'bg-natural-sage/10 text-natural-sage border-natural-sage/20 hover:bg-natural-sage/20'
                    }`}
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>{isSpeakingScene ? '朗读中...' : '语音朗读场景'}</span>
                  </button>
                </div>
                
                <p className="text-natural-text text-sm sm:text-base font-bold leading-relaxed tracking-wide min-h-[60px]">
                  {config.scenes[currentSceneIndex]?.description}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Floating subtitling/narration bar hidden (narration by listening only) */}

        {/* Video bottom progress bar */}
        <div className="relative z-10 w-full mt-auto">
          <div className="h-1.5 w-full bg-[#D4CBBF] rounded-full overflow-hidden mb-4">
            <div 
              className="h-full bg-natural-sage rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            {/* Control buttons */}
            <div className="flex items-center gap-2">
              {isPlaying ? (
                <button
                  onClick={handlePause}
                  className="p-2.5 rounded-lg bg-white border border-natural-border text-natural-heading hover:bg-natural-beige/40 hover:text-natural-sage transition cursor-pointer"
                >
                  <Pause className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handlePlay}
                  className="p-2.5 rounded-lg bg-natural-coral text-white hover:bg-natural-coral-dark hover:scale-105 transition cursor-pointer"
                >
                  <Play className="h-4 w-4 fill-current translate-x-0.5" />
                </button>
              )}
              
              <button
                onClick={handleReset}
                className="p-2.5 rounded-lg bg-white border border-natural-border text-natural-heading hover:bg-natural-beige/40 transition cursor-pointer"
                title="重播"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              <button
                onClick={handleSpeakNarration}
                className={`p-2.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold border transition cursor-pointer ${
                  isNarrating 
                    ? 'bg-natural-sage/20 text-natural-sage border-natural-sage/30' 
                    : 'bg-white text-natural-heading border-natural-border hover:text-natural-sage hover:bg-natural-beige/40'
                }`}
                title="播音旁白"
              >
                <Volume2 className="h-4 w-4" />
                <span>旁白朗读</span>
              </button>

              {/* 6-Minute Prep Countdown Timer (Moved next to Narration) */}
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-natural-border shadow-xs ml-1">
                <Clock className={`h-4 w-4 ${prepTimeLeft <= 60 && prepTimeLeft > 0 ? 'text-amber-600 animate-bounce' : prepTimeLeft === 0 ? 'text-red-600' : 'text-natural-sage'}`} />
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-natural-muted leading-none">6分钟准备倒计时</span>
                  <span className={`text-xs font-bold font-mono leading-tight ${prepTimeLeft <= 60 && prepTimeLeft > 0 ? 'text-amber-600 animate-pulse' : prepTimeLeft === 0 ? 'text-red-600 font-extrabold' : 'text-natural-heading'}`}>
                    {prepTimeLeft === 0 ? '00:00 (时间到)' : formatTime(prepTimeLeft)}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 ml-1 border-l border-natural-border pl-1.5">
                  <button
                    type="button"
                    onClick={() => setIsPrepTimerRunning(!isPrepTimerRunning)}
                    className="p-1 rounded text-natural-muted hover:text-natural-heading hover:bg-natural-beige/60 transition cursor-pointer"
                    title={isPrepTimerRunning ? "暂停倒计时" : "继续倒计时"}
                  >
                    {isPrepTimerRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPrepTimeLeft(360); setIsPrepTimerRunning(true); }}
                    className="p-1 rounded text-natural-muted hover:text-natural-heading hover:bg-natural-beige/60 transition cursor-pointer"
                    title="重置6分钟准备倒计时"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Video metadata length display */}
            <span className="text-[10px] font-bold text-natural-muted font-mono tracking-wider">
              {Math.floor((progress * 60) / 100)}s / 60s (EST)
            </span>
          </div>
        </div>
      </div>

      {/* Screen action cards */}
      <div className="bg-natural-beige p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <h4 className="text-natural-heading text-sm font-bold flex items-center gap-1.5 justify-center md:justify-start">
            <FileText className="h-4 w-4 text-natural-sage" />
            看录像提示要点
          </h4>
          <p className="text-natural-text text-xs leading-relaxed max-w-xl font-medium">
            考生共有 <span className="font-bold text-natural-sage font-mono">6 分钟</span> 的看视频、听旁白与思考准备时间（倒计时：<span className="font-bold font-mono">{formatTime(prepTimeLeft)}</span>）。
            你可以反复播放并观察细节。准备完毕后，请点击右侧按钮进入考场，考官将对你提问 4个问题。
          </p>
        </div>

        <button
          onClick={onFinishedWatching}
          className="w-full md:w-auto flex items-center justify-center gap-2 rounded-xl bg-natural-coral hover:bg-natural-coral-dark px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-natural-coral/10 transition duration-300 transform active:scale-98 shrink-0 cursor-pointer"
        >
          <span>进入口试考场 (Enter Exam)</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

