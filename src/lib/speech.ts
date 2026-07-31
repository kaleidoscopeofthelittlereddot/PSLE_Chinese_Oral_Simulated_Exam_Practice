// Speech synthesis and recognition wrappers for Singapore Chinese (or standard Chinese fallback)

export interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
}

export function getChineseVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  const voices = window.speechSynthesis.getVoices();
  // Filter for standard Chinese (zh-SG, zh-CN, zh-HK, zh-TW)
  return voices.filter(voice => 
    voice.lang.includes('zh-SG') || 
    voice.lang.includes('zh-CN') || 
    voice.lang.toLowerCase().includes('zh-hans') ||
    voice.lang.includes('zh')
  );
}

// Speak text using speechSynthesis
export function speakChineseText(
  text: string, 
  onStart?: () => void, 
  onEnd?: () => void,
  onError?: (err: any) => void
) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    if (onError) onError('Speech synthesis not supported in this browser.');
    return;
  }

  try {
    // Cancel any ongoing speaking
    window.speechSynthesis.cancel();
  } catch (cancelErr) {
    console.warn('Error calling speechSynthesis.cancel:', cancelErr);
  }

  // Create utterance (clean any actions or markdown punctuation)
  const cleanText = text
    .replace(/\(.*?\)/g, '') // Remove brackets like (微笑)
    .replace(/\[.*?\]/g, '') // Remove brackets like [笑]
    .replace(/\*.*?\*/g, '') // Remove markdown emphasis like *点头*
    .trim();

  // If there is no text left, call onEnd immediately and exit
  if (!cleanText) {
    if (onEnd) onEnd();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'zh-CN'; // Fallback lang

  // Try to find a Singapore or Chinese voice
  const voices = getChineseVoices();
  const sgVoice = voices.find(v => v.lang.includes('zh-SG')) || 
                  voices.find(v => v.lang.includes('zh-CN')) || 
                  voices[0];
  
  if (sgVoice) {
    utterance.voice = sgVoice;
  }
  
  utterance.rate = 0.95; // Slightly slower, perfect for MOE examiner clarity
  utterance.pitch = 1.0;

  if (onStart) utterance.onstart = onStart;
  if (onEnd) utterance.onend = onEnd;
  
  utterance.onerror = (e) => {
    console.error('Speech synthesis error:', e.error || e);
    // If it's a benign interruption or cancellation, trigger onEnd to restore UI state
    if (e.error === 'interrupted' || e.error === 'canceled') {
      if (onEnd) onEnd();
    } else {
      if (onError) onError(e);
    }
  };

  // Delay actual speak call slightly to give .cancel() time to complete,
  // preventing Chromium from immediately interrupting/canceling the new utterance.
  setTimeout(() => {
    try {
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
    } catch (speakErr) {
      console.error('Error in speak():', speakErr);
      if (onError) onError(speakErr);
    }
  }, 60);
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn('Error during stopSpeaking:', e);
    }
  }
}

// Bypasses browser gesture/autoplay blocks by speaking a short silent utterance
// when a user actively clicks on buttons to start or move between stages.
export function unlockSpeechSynthesis() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  try {
    const utterance = new SpeechSynthesisUtterance(' ');
    utterance.volume = 0;
    utterance.rate = 10; // Instantaneous
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('Failed to unlock speechSynthesis:', e);
  }
}

// Create a cross-browser Speech Recognition helper
export class ChineseSpeechRecognizer {
  private recognition: any = null;
  public onResultCallback: (transcript: string, isFinal: boolean) => void = () => {};
  public onEndCallback: (finalTranscript: string) => void = () => {};
  public onErrorCallback: (error: any) => void = () => {};
  private isListening: boolean = false;
  private accumulatedTranscript: string = '';
  private currentSegmentTranscript: string = '';

  constructor() {
    if (typeof window === 'undefined') return;
    
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true; // Keep recording across pauses and extended answers
      this.recognition.interimResults = true;
      this.recognition.lang = 'zh-CN'; // Speech input in standard Chinese

      this.recognition.onresult = (event: any) => {
        let fullTranscript = '';

        for (let i = 0; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result && result[0]) {
            fullTranscript += result[0].transcript;
          }
        }

        // Update current segment transcript with the full accumulated results of this active session
        this.currentSegmentTranscript = fullTranscript;

        // Combine any previously accumulated transcripts from previous runs with the current session's transcript
        const totalTranscript = [this.accumulatedTranscript, this.currentSegmentTranscript]
          .filter(Boolean)
          .join(' ')
          .trim();

        // Pass true for isFinal if the last result in event.results is final
        const isLastResultFinal = event.results.length > 0 && event.results[event.results.length - 1].isFinal;

        this.onResultCallback(totalTranscript, isLastResultFinal);
      };

      this.recognition.onend = () => {
        // If isListening is still true, the browser ended recognition unexpectedly (e.g. timeout or silence)
        if (this.isListening) {
          // Save the current segment's content into accumulated transcript so it isn't lost
          if (this.currentSegmentTranscript) {
            this.accumulatedTranscript = [this.accumulatedTranscript, this.currentSegmentTranscript]
              .filter(Boolean)
              .join(' ')
              .trim();
            this.currentSegmentTranscript = '';
          }
          
          // Auto-restart to keep the microphone active until the user clicks finish
          // Add a safe delay to prevent overlapping with previous instances and browser issues
          setTimeout(() => {
            if (this.isListening) {
              try {
                this.recognition.start();
              } catch (e) {
                console.warn('Failed to auto-restart speech recognition, retrying with backoff:', e);
                // Try again with a larger backoff
                setTimeout(() => {
                  if (this.isListening) {
                    try {
                      this.recognition.start();
                    } catch (e2) {
                      console.error('Failed second attempt to auto-restart speech recognition:', e2);
                      this.isListening = false;
                      const finalTranscript = [this.accumulatedTranscript, this.currentSegmentTranscript]
                        .filter(Boolean)
                        .join(' ')
                        .trim();
                      this.onEndCallback(finalTranscript);
                    }
                  }
                }, 300);
              }
            }
          }, 80);
        } else {
          // User manually stopped the recognition
          const finalTranscript = [this.accumulatedTranscript, this.currentSegmentTranscript]
            .filter(Boolean)
            .join(' ')
            .trim();
          this.onEndCallback(finalTranscript);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Speech recognition error event:', event.error);
        if (event.error === 'no-speech' || event.error === 'aborted') {
          // Do not treat silent pause or aborted connection as a terminal error.
          // The onend handler will automatically restart the audio session.
          return;
        }
        
        this.isListening = false;
        const finalTranscript = [this.accumulatedTranscript, this.currentSegmentTranscript]
          .filter(Boolean)
          .join(' ')
          .trim();
        this.onEndCallback(finalTranscript);
        this.onErrorCallback(event.error);
      };
    }
  }

  public isSupported(): boolean {
    return !!this.recognition;
  }

  public start() {
    if (!this.recognition || this.isListening) return;
    try {
      this.isListening = true;
      this.accumulatedTranscript = '';
      this.currentSegmentTranscript = '';
      this.recognition.start();
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
      this.isListening = false;
    }
  }

  public stop() {
    if (!this.recognition || !this.isListening) return;
    try {
      this.isListening = false;
      this.recognition.stop();
    } catch (e) {
      console.error('Failed to stop speech recognition:', e);
    }
  }
}
