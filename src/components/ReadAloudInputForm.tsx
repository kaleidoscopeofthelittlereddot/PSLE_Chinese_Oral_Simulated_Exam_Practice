import React, { useState } from 'react';
import { BookOpen, Camera, Upload, ArrowRight, Sparkles, Loader2, Video, FileText } from 'lucide-react';
import { ReadAloudConfig } from '../types';

interface ReadAloudInputFormProps {
  apiKey: string; // Added to handle direct client-side OCR calls
  onStartReadAloud: (config: ReadAloudConfig) => void;
  onSwitchToVideoExam: () => void;
}

const SAMPLE_PASSAGES = [
  {
    title: '《公德心与社区环境》',
    text: '上周末，我和妈妈到邻里的公园散步。公园里树木葱茏，鲜花盛开，环境十分幽雅。不远处，几个小朋友在草地上欢快地捉迷藏，发出阵阵清脆的笑声。这时，一位叔叔喝完饮料后，顺手把空罐丢在了草地上。我看见了，立刻走过去把空罐捡起来，扔进了分类垃圾桶。叔叔见状不好意思地低下了头。维持环境整洁，需要我们每个人从自己做起。',
  },
  {
    title: '《水资源的宝贵》',
    text: '在新加坡，水是非常宝贵的资源。每天早晨，当我们打开水龙头，清澈干净的水源源不断地流出来，这看似理所当然，背后却是许多人辛勤付出的汗水。为了确保我国的水供应，政府大力兴建了许多蓄水池，并引进了先进的科技。作为学生，我们在学校和家里洗手或刷牙时，应该及时关紧水龙头，切不可随意浪费。节约用水，人人有责。',
  },
  {
    title: '《温馨的邻里关怀》',
    text: '林太太是一位年近七旬的独居老奶奶。上个星期天，她突然感到身体不适，头晕目眩。住在隔壁的小明和妈妈得知情况后，二话不说立刻前去帮忙，不仅细心地搀扶林太太休息，还替她联系了社区医生。邻居们闻讯也纷纷送来热腾腾的汤面和新鲜的水果。俗话说：“远亲不如近邻”，这种互帮互助、充满温情的邻里关系，让整个社区都洋溢着幸福的欢笑声。',
  },
];

export default function ReadAloudInputForm({
  apiKey,
  onStartReadAloud,
  onSwitchToVideoExam,
}: ReadAloudInputFormProps) {
  const [passageTitle, setPassageTitle] = useState(SAMPLE_PASSAGES[0].title);
  const [passageText, setPassageText] = useState(SAMPLE_PASSAGES[0].text);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const handleSelectSample = (sample: { title: string; text: string }) => {
    setPassageTitle(sample.title);
    setPassageText(sample.text);
  };

  // ==========================================
  // DIRECT GEMINI VISION OCR LOGIC
  // ==========================================
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setOcrError('请上传图片格式文件（如 JPG, PNG 等）。');
      return;
    }

    if (!apiKey) {
      setOcrError('请先在主页设置您的 Gemini API Key。');
      return;
    }

    setIsExtractingText(true);
    setOcrError(null);



    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          resolve(dataUrl.split(',')[1]);
        };
        reader.onerror = () => reject(new Error('读取图片失败，请重试'));
        reader.readAsDataURL(file);
      });

        // Direct call to Gemini 3.6 Flash for Vision extraction
	const prompt = "请仔细识别并提取这张图片中的中文短文/文章内容。要求：只输出提取出的完整中文正文文本，去除标题与杂音，不要包含任何额外的解释、标记或 Markdown 代码块。";
        
	const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inlineData: { mimeType: file.type, data: base64Data } }
              ]
            }],
            generationConfig: {
              temperature: 0.2
            }
          }),
        });

        const data = await res.json();
        
        if (res.ok && data.candidates) {
          const extractedText = data.candidates[0]?.content?.parts[0]?.text;
          if (extractedText) {
            setPassageText(extractedText.trim());
            setPassageTitle(`《自定义短文 - ${file.name.slice(0, 10)}》`);
          } else {
            throw new Error('未检测到文字');
          }
        } else {
          throw new Error(data.error?.message || '无法成功提取图片中的文字');
        }
     
    } catch (err: any) {
      console.error(err);
      setOcrError('文字识别失败，请确保图片字迹清晰，或直接手动输入短文。');
    } finally {
      setIsExtractingText(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passageText.trim()) return;
    onStartReadAloud({
      passageTitle: passageTitle || '《朗读短文》',
      passageText: passageText.trim(),
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#EADFCD] shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EADFCD]/60 pb-6 mb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-natural-sage/10 text-natural-sage-dark text-xs font-bold">
              <BookOpen className="h-3.5 w-3.5" />
              <span>PSLE 华文模拟口试练习</span>
            </div>
            <h2 className="text-2xl font-bold font-display text-[#5C4D3C]">
              朗读短文练习 (Read-Aloud Practice)
            </h2>
          </div>

          <button
            type="button"
            onClick={onSwitchToVideoExam}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-[#FAF7F2] hover:bg-[#F3ECE0] text-[#6D5C4A] border border-[#D8C3A8] rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
          >
            <Video className="h-4 w-4 text-natural-sage" />
            <span>切换 看录像说话练习</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-bold text-[#6D5C4A] uppercase tracking-wider">
              <Sparkles className="h-4 w-4 text-natural-sage" />
              1. 选择预设精选篇章 (Select Preset Passage)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {SAMPLE_PASSAGES.map((sample, idx) => {
                const isSelected = passageText === sample.text;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSample(sample)}
                    className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#D8C3A8] bg-[#FAF7F2] ring-1 ring-[#D8C3A8] shadow-2xs'
                        : 'border-natural-border bg-white hover:border-[#D8C3A8] hover:bg-[#FAF7F2]/50'
                    }`}
                  >
                    <div className="font-bold text-sm text-[#5C4D3C] mb-1">
                      {sample.title}
                    </div>
                    <p className="text-xs text-natural-muted line-clamp-3 leading-relaxed">
                      {sample.text}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-natural-bg/60 border border-[#EADFCD] space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-bold text-[#6D5C4A]">
                <Camera className="h-4 w-4 text-natural-sage" />
                2. 上传课本/试卷照片智能提取短文 (Upload Photo of Text)
              </label>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#D8C3A8] hover:bg-[#FAF7F2] text-[#6D5C4A] rounded-xl text-xs font-bold cursor-pointer transition shadow-2xs">
                {isExtractingText ? (
                  <Loader2 className="h-4 w-4 text-natural-sage animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 text-natural-sage" />
                )}
                <span>{isExtractingText ? '正在智能识别图片文字...' : '选择并上传短文照片'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isExtractingText}
                  className="hidden"
                />
              </label>
              <span className="text-xs text-natural-muted">
                支持 JPG, PNG 等照片格式（AI 智能识别文字）
              </span>
            </div>

            {isExtractingText && (
              <div className="flex items-center gap-3 p-3 bg-natural-sage/15 text-natural-sage-dark border border-natural-sage/30 rounded-xl text-xs font-semibold animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin shrink-0 text-natural-sage" />
                <span>请稍候...请先仔细核对短文内容再开始练习。</span>
              </div>
            )}

            {ocrError && (
              <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200 font-medium">
                {ocrError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-bold text-[#6D5C4A] uppercase tracking-wider">
                <FileText className="h-4 w-4 text-natural-sage" />
                3. 短文内容 (Passage Text)
              <span className="text-xs font-normal normal-case text-natural-sage font-sans tracking-normal bg-natural-sage/10 border border-natural-sage/20 px-2 py-0.5 rounded-lg hidden sm:inline-block">
                💡 划亮词句 可查检读音
              </span>
              </label>

              <span className="text-xs font-semibold text-natural-muted">
                字数：{passageText.length} 字
              </span>
            </div>
            <textarea
              value={passageText}
              onChange={(e) => setPassageText(e.target.value)}
              placeholder="请输入或粘贴想要朗读的中文短文（建议 120-180 字左右）..."
              rows={6}
              required
              className="w-full rounded-2xl border border-natural-border bg-white p-4 text-sm sm:text-base leading-relaxed focus:border-[#D8C3A8] focus:outline-none focus:ring-2 focus:ring-[#EADFCD] transition-all font-medium text-natural-text placeholder:text-natural-muted/50 resize-y"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!passageText.trim() || isExtractingText}
              className="w-full py-4 px-6 bg-natural-sage hover:bg-natural-sage-dark text-white rounded-2xl font-bold text-base shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>进入短文朗读环节 Start Session</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}