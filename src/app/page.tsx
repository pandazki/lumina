'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PromptStructure, AppState, HistoryItem } from '@/types';
import { expandPrompt, generateImage } from '@/services/geminiService';
import { PromptSection } from '@/components/PromptSection';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { CinematicTreatment } from '@/components/CinematicTreatment';
import { HistorySidebar } from '@/components/HistorySidebar';
import {
  Wand2,
  Image as ImageIcon,
  Download,
  RefreshCw,
  Code,
  ChevronRight,
  Loader2,
  History as HistoryIcon,
  Maximize2,
  X
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const DEFAULT_PROMPT: PromptStructure = {
  subject: "",
  environment: "",
  atmosphere: "",
  microDetails: "",
  techSpecs: "",
  colorGrading: "",
  composition: ""
};

export default function Home() {
  const [userInput, setUserInput] = useState("");
  const [promptData, setPromptData] = useState<PromptStructure>(DEFAULT_PROMPT);
  const [appState, setAppState] = useState<AppState>('idle');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Scroll to bottom of prompt list when updating
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const handleGenerate = async () => {
    if (!userInput.trim()) return;

    setAppState('expanding_prompt');
    setPromptData(DEFAULT_PROMPT); // Reset
    setGeneratedImage(null);

    try {
      // 1. Expand Prompt (Streaming)
      const finalPrompt = await expandPrompt(userInput, undefined, undefined, (partial) => {
        setPromptData(prev => ({ ...prev, ...partial }));
      });

      setPromptData(finalPrompt);

      // 2. Generate Image
      setAppState('generating_image');
      const imageUrl = await generateImage(finalPrompt);

      setGeneratedImage(imageUrl);
      setAppState('complete');

      // 3. Add to History
      const newItem: HistoryItem = {
        id: crypto.randomUUID(),
        promptData: finalPrompt,
        prompt: userInput,
        imageUrl: imageUrl,
        timestamp: Date.now()
      };
      setHistory(prev => [newItem, ...prev]);

    } catch (error) {
      console.error("Workflow failed:", error);
      setAppState('error');
    }
  };

  const handleRegenerate = async () => {
    if (!promptData.subject) return;

    setAppState('generating_image');
    try {
      const imageUrl = await generateImage(promptData);
      setGeneratedImage(imageUrl);
      setAppState('complete');

      // Add to History
      const newItem: HistoryItem = {
        id: crypto.randomUUID(),
        promptData: promptData,
        prompt: userInput,
        imageUrl: imageUrl,
        timestamp: Date.now()
      };
      setHistory(prev => [newItem, ...prev]);
    } catch (error) {
      console.error("Regeneration failed:", error);
      setAppState('error');
    }
  };



  const handleDownload = (type: 'image' | 'json') => {
    if (type === 'image' && generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `lumina-creation-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (type === 'json') {
      const blob = new Blob([JSON.stringify(promptData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lumina-prompt-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleDownloadAll = async () => {
    const zip = new JSZip();

    // Add current session items from history
    history.forEach((item, index) => {
      // Add Image
      const imgData = item.imageUrl.split(',')[1]; // Remove data:image/png;base64, prefix
      zip.file(`image-${index}-${item.id}.png`, imgData, { base64: true });

      // Add JSON
      zip.file(`prompt-${index}-${item.id}.json`, JSON.stringify(item.promptData, null, 2));
    });

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `lumina-assets-${Date.now()}.zip`);
  };

  const handleDeleteHistory = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const handleSelectHistory = (item: HistoryItem) => {
    setPromptData(item.promptData);
    setGeneratedImage(item.imageUrl);
    setAppState('complete');
    // setIsHistoryOpen(false); // Keep sidebar open as requested
  };

  const [isFullscreen, setIsFullscreen] = useState(false);

  // Close fullscreen on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-purple-500/30 overflow-hidden flex">

      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-500 ease-in-out relative h-full",
        isHistoryOpen ? "mr-80" : "mr-0"
      )}>

        {/* Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-zinc-950/50 backdrop-blur-md z-10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Wand2 className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
              Lumina <span className="text-purple-500 text-xs font-mono uppercase tracking-widest ml-1">PRO</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadAll}
                className="hidden md:flex gap-2 border-white/10 hover:bg-white/5"
              >
                <Download className="w-4 h-4" />
                Download All Assets
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className={cn("text-zinc-400 hover:text-white", isHistoryOpen && "bg-white/10 text-white")}
            >
              <HistoryIcon className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden relative h-[calc(100vh-4rem)]">
          {/* Sidebar - Director's Treatment */}
          <AnimatePresence mode="wait">
            {(appState === 'idle' || appState === 'complete' || appState === 'error') && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: '400px', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="border-r border-white/5 bg-zinc-900/30 backdrop-blur-sm flex flex-col z-20 h-full"
              >
                <div className="p-4 border-b border-white/5 flex items-center justify-between flex-shrink-0">
                  <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Director's Treatment</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setShowJson(!showJson)}
                  >
                    <Code className="h-3 w-3" />
                  </Button>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-6">
                    {showJson ? (
                      <pre className="text-xs font-mono text-zinc-400 bg-black/50 p-4 rounded-lg overflow-auto">
                        {JSON.stringify(promptData, null, 2)}
                      </pre>
                    ) : (
                      Object.entries(promptData).map(([key, value]) => (
                        <PromptSection
                          key={key}
                          title={key}
                          content={value}
                        />
                      ))
                    )}
                    <div ref={scrollRef} />
                  </div>
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Stage */}
          <div className="flex-1 relative bg-zinc-950 flex flex-col h-full">
            {/* Cinematic View Overlay */}
            <AnimatePresence>
              {(appState === 'expanding_prompt' || appState === 'generating_image') && (
                <motion.div
                  key="cinematic"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-30 bg-zinc-950"
                >
                  <CinematicTreatment
                    promptData={promptData}
                    status={appState === 'generating_image' ? 'generating' : 'streaming'}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Content Area */}
            <div className="flex-1 flex items-center justify-center p-8 relative">
              {/* Background Texture */}
              <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] filter contrast-150 brightness-100"></div>

              <AnimatePresence mode="wait">
                {generatedImage ? (
                  <motion.div
                    key={generatedImage}
                    initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                    transition={{ duration: 0.5, ease: "circOut" }}
                    className="relative group max-w-5xl w-full aspect-video rounded-lg overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10"
                  >
                    <img src={generatedImage} alt="Generated Result" className="w-full h-full object-cover" />

                    {/* Overlay Actions */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-between p-6">
                      <div className="flex gap-2">
                        <Button onClick={() => setIsFullscreen(true)} variant="secondary" size="icon" className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md">
                          <Maximize2 className="w-4 h-4" />
                        </Button>
                        <Button onClick={() => handleDownload('image')} variant="secondary" size="icon" className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button onClick={() => handleDownload('json')} variant="secondary" size="icon" className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md">
                          <Code className="w-4 h-4" />
                        </Button>
                      </div>
                      <Button onClick={handleRegenerate} variant="default" className="gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20 rounded-full px-6">
                        <RefreshCw className="w-4 h-4" /> Regenerate
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  appState === 'idle' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center space-y-4 max-w-md"
                    >
                      <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 ring-1 ring-white/10">
                        <ImageIcon className="w-8 h-8 text-zinc-600" />
                      </div>
                      <h2 className="text-2xl font-light text-zinc-300">Ready to Create</h2>
                      <p className="text-zinc-500">Describe your vision, and Lumina will handle the direction, lighting, and composition.</p>
                    </motion.div>
                  )
                )}
              </AnimatePresence>
            </div>

            {/* Input Bar */}
            <div className="p-6 pb-8 max-w-4xl mx-auto w-full relative z-40">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl opacity-20 group-hover:opacity-40 blur transition duration-500"></div>
                <div className="relative flex gap-2 bg-zinc-900/90 backdrop-blur-xl py-2 pl-2 pr-3 rounded-xl border border-white/10 shadow-2xl items-center">
                  <div className="relative flex-1 min-w-0">
                    {/* Overlay for collapsed state (Truncated view) */}
                    {!isInputFocused && (
                      <div className="absolute inset-0 py-2.5 px-4 text-lg pointer-events-none truncate text-zinc-100">
                        {userInput || <span className="text-zinc-600">Describe your scene...</span>}
                      </div>
                    )}

                    <textarea
                      ref={textareaRef}
                      value={userInput}
                      onChange={(e) => {
                        setUserInput(e.target.value);
                        // Auto-grow
                        e.target.style.height = 'auto';
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                      }}
                      onFocus={() => {
                        setIsInputFocused(true);
                        // Animate to full height without snapping to auto first
                        if (textareaRef.current) {
                          const targetHeight = Math.min(textareaRef.current.scrollHeight, 200);
                          textareaRef.current.style.height = `${Math.max(targetHeight, 48)}px`;
                        }
                      }}
                      onBlur={() => {
                        setIsInputFocused(false);
                        // Reset to single line
                        if (textareaRef.current) {
                          textareaRef.current.style.height = '3rem'; // h-12
                        }
                      }}
                      // Hide placeholder in textarea since we show it in the overlay when collapsed
                      // When focused, the overlay is hidden, so we need placeholder here too? 
                      // Actually, when focused, we want standard behavior.
                      placeholder={isInputFocused ? "Describe your scene (e.g., 'A cyberpunk street food vendor in Tokyo...')" : ""}
                      className={cn(
                        "w-full bg-transparent border-none text-lg resize-none focus:ring-0 focus:outline-none placeholder:text-zinc-600 py-2.5 px-4 transition-[height] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] scrollbar-hide",
                        isInputFocused ? "max-h-[200px] overflow-y-auto opacity-100" : "h-12 overflow-hidden opacity-0 cursor-text"
                      )}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleGenerate();
                        }
                      }}
                      disabled={appState === 'expanding_prompt' || appState === 'generating_image'}
                    />
                  </div>
                  <Button
                    size="lg"
                    onClick={handleGenerate}
                    disabled={!userInput.trim() || appState === 'expanding_prompt' || appState === 'generating_image'}
                    className="h-12 px-8 bg-white text-black hover:bg-zinc-200 transition-all font-medium min-w-[140px]"
                  >
                    {appState === 'idle' || appState === 'complete' || appState === 'error' ? (
                      <>Generate <ChevronRight className="w-4 h-4 ml-2" /></>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">
                          {appState === 'expanding_prompt' ? 'Directing...' : 'Developing...'}
                        </span>
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* History Sidebar */}
      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onDelete={handleDeleteHistory}
        onSelect={handleSelectHistory}
      />

      {/* Fullscreen Overlay */}
      <AnimatePresence>
        {isFullscreen && generatedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-8"
            onClick={() => setIsFullscreen(false)}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-6 right-6 text-zinc-400 hover:text-white hover:bg-white/10"
              onClick={() => setIsFullscreen(false)}
            >
              <X className="w-8 h-8" />
            </Button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={generatedImage}
              alt="Fullscreen View"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
