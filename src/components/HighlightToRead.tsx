import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Square, Sparkles } from 'lucide-react';
import { speakChineseText, stopSpeaking } from '../lib/speech';

export default function HighlightToRead() {
  const [selectedText, setSelectedText] = useState('');
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const checkSelection = () => {
      if (isSpeaking) return;

      let text = '';
      let rect: DOMRect | null = null;

      // 1. Check standard DOM window selection (rendered text on screen)
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
        const selText = selection.toString().trim();
        if (selText) {
          text = selText;
          try {
            const range = selection.getRangeAt(0);
            const rangeRect = range.getBoundingClientRect();
            if (rangeRect.width > 0 || rangeRect.height > 0) {
              rect = rangeRect;
            }
          } catch (e) {
            console.warn('Get range rect error:', e);
          }
        }
      }

      // 2. Check if text selection is inside a <textarea> or <input>
      if (!text) {
        const activeEl = document.activeElement;
        if (
          activeEl &&
          (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT') &&
          'selectionStart' in activeEl
        ) {
          const inputEl = activeEl as HTMLInputElement | HTMLTextAreaElement;
          const start = inputEl.selectionStart || 0;
          const end = inputEl.selectionEnd || 0;
          if (end > start) {
            const inputSelText = inputEl.value.substring(start, end).trim();
            if (inputSelText) {
              text = inputSelText;
              const elRect = inputEl.getBoundingClientRect();
              rect = new DOMRect(elRect.left, elRect.top, elRect.width, 32);
            }
          }
        }
      }

      if (text && rect) {
        // Calculate position relative to VIEWPORT (fixed position)
        let top = rect.top - 44;
        let left = rect.left + rect.width / 2;

        // If selection is too close to top of viewport, show below
        if (top < 12) {
          top = rect.bottom + 8;
        }

        // Clamp left within viewport bounds
        left = Math.max(90, Math.min(window.innerWidth - 90, left));

        setSelectedText(text);
        setTooltipPos({ top, left });
      } else {
        setSelectedText('');
        setTooltipPos(null);
      }
    };

    const handleSelectionChange = () => {
      // Short delay for mouseup / selection settling
      setTimeout(checkSelection, 10);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (tooltipRef.current && tooltipRef.current.contains(e.target as Node)) {
        return;
      }
      if (!isSpeaking) {
        setTooltipPos(null);
        setSelectedText('');
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mouseup', handleSelectionChange);
    document.addEventListener('touchend', handleSelectionChange);
    document.addEventListener('keyup', handleSelectionChange);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mouseup', handleSelectionChange);
      document.removeEventListener('touchend', handleSelectionChange);
      document.removeEventListener('keyup', handleSelectionChange);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [isSpeaking]);

  const handlePlaySelection = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    if (!selectedText) return;

    speakChineseText(
      selectedText,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false),
      (err) => {
        console.error('Highlight speak error:', err);
        setIsSpeaking(false);
      }
    );
  };

  if (!tooltipPos || !selectedText) {
    return null;
  }

  return (
    <div
      ref={tooltipRef}
      style={{
        position: 'fixed',
        top: `${tooltipPos.top}px`,
        left: `${tooltipPos.left}px`,
        transform: 'translateX(-50%)',
      }}
      className="z-[9999] animate-in fade-in zoom-in-95 duration-150"
    >
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()} // Keep highlight selection active
        onClick={handlePlaySelection}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5C4D3C] hover:bg-[#4A3E30] text-white rounded-full shadow-xl border border-[#D8C3A8]/40 text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 group"
      >
        {isSpeaking ? (
          <>
            <Square className="h-3.5 w-3.5 fill-amber-300 text-amber-300 animate-pulse" />
            <span className="text-amber-200">停止</span>
          </>
        ) : (
          <>
            <Volume2 className="h-3.5 w-3.5 text-amber-300 group-hover:scale-110 transition-transform" />
            <span>查检读音</span>
            <Sparkles className="h-3 w-3 text-amber-300 opacity-70" />
          </>
        )}
      </button>
      {/* Arrow beak pointing downwards to highlighted text */}
      <div className="w-2 h-2 bg-[#5C4D3C] rotate-45 mx-auto -mt-1 border-r border-b border-[#D8C3A8]/40" />
    </div>
  );
}
