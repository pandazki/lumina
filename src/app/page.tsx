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
import { toast } from 'sonner';

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

  // Track active session to prevent race conditions
  const activeSessionId = useRef<string | null>(null);

  const [referenceImages, setReferenceImages] = useState<string[]>([]);

  // Check if ANY generation is in progress (for disabling inputs)
  const isGlobalGenerating = history.some(item => item.status === 'generating') || appState === 'expanding_prompt';

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const newImages: string[] = [];

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve) => {
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          });
          newImages.push(base64);
        }
      }
    }

    if (newImages.length > 0) {
      setReferenceImages(prev => {
        const combined = [...prev, ...newImages];
        if (combined.length > 5) {
          toast.error("Maximum 5 reference images allowed");
          return combined.slice(0, 5);
        }
        return combined;
      });
    }
  };

  const handleRemoveImage = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!userInput.trim()) return;

    const sessionId = crypto.randomUUID();
    activeSessionId.current = sessionId;

    setAppState('expanding_prompt');
    setPromptData(DEFAULT_PROMPT); // Reset
    setGeneratedImage(null);

    try {
      // 1. Expand Prompt (Streaming)
      const currentImages = [...referenceImages]; // Capture current images
      const finalPrompt = await expandPrompt(userInput, undefined, undefined, currentImages, (partial) => {
        // Only update if this session is still active
        if (activeSessionId.current === sessionId) {
          setPromptData(prev => ({ ...prev, ...partial }));
        }
      });

      // 2. Add Placeholder to History (Status: Generating)
      const placeholderId = crypto.randomUUID();
      const placeholderItem: HistoryItem = {
        id: placeholderId,
        promptData: finalPrompt,
        prompt: userInput,
        imageUrl: '', // Placeholder
        timestamp: Date.now(),
        status: 'generating',
        referenceImages: currentImages
      };
      setHistory(prev => [placeholderItem, ...prev]);
      // setReferenceImages([]); // Don't clear images, keep them for context/tweaking just like userInput

      if (activeSessionId.current === sessionId) {
        setPromptData(finalPrompt);
        setAppState('generating_image');
      }

      // 3. Generate Image
      const imageUrl = await generateImage(finalPrompt, currentImages); // Pass original images (before clear, but we need to capture them)

      // 4. Update History Item (Status: Complete)
      setHistory(prev => prev.map(item =>
        item.id === placeholderId
          ? { ...item, imageUrl, status: 'complete' }
          : item
      ));

      // 5. Update UI or Notify
      if (activeSessionId.current === sessionId) {
        setGeneratedImage(imageUrl);
        setAppState('complete');
      } else {
        // Silent completion
        toast.success("Image generation complete", {
          action: {
            label: "View",
            onClick: () => {
              activeSessionId.current = sessionId; // Re-claim session
              setPromptData(finalPrompt);
              setGeneratedImage(imageUrl);
              setAppState('complete');
            }
          }
        });
      }

    } catch (error) {
      console.error("Workflow failed:", error);
      // Remove placeholder on error
      setHistory(prev => prev.filter(item => item.status !== 'generating')); // Or filter by ID if we tracked it

      if (activeSessionId.current === sessionId) {
        setAppState('error');
      }
    }
  };

  const handleRegenerate = async (count: number = 1) => {
    if (!promptData.subject) return;

    const sessionId = crypto.randomUUID();
    activeSessionId.current = sessionId;

    setAppState('generating_image');

    // Create placeholders for all requested images
    const placeholders: HistoryItem[] = Array.from({ length: count }).map(() => ({
      id: crypto.randomUUID(),
      promptData: promptData,
      prompt: userInput,
      imageUrl: '',
      timestamp: Date.now(),
      status: 'generating',
      referenceImages: referenceImages
    }));

    // Add all placeholders to history at once
    setHistory(prev => [...placeholders, ...prev]);

    try {
      // Launch parallel generation requests
      const promises = placeholders.map(async (placeholder) => {
        try {
          const imageUrl = await generateImage(promptData, referenceImages);

          // Update individual history item upon completion
          setHistory(prev => prev.map(item =>
            item.id === placeholder.id
              ? { ...item, imageUrl, status: 'complete' }
              : item
          ));

          return { id: placeholder.id, imageUrl, success: true };
        } catch (err) {
          console.error(`Generation failed for ${placeholder.id}`, err);
          // Remove failed item
          setHistory(prev => prev.filter(item => item.id !== placeholder.id));
          return { id: placeholder.id, success: false };
        }
      });

      const results = await Promise.all(promises);
      const successful = results.filter(r => r.success && r.imageUrl);

      if (successful.length > 0) {
        // If the session is still active, show the first successful image
        if (activeSessionId.current === sessionId) {
          // @ts-ignore
          setGeneratedImage(successful[0].imageUrl);
          setAppState('complete');
        } else {
          toast.success(`${successful.length} image(s) regenerated`, {
            action: {
              label: "View",
              onClick: () => {
                activeSessionId.current = sessionId;
                // @ts-ignore
                setGeneratedImage(successful[0].imageUrl);
                setAppState('complete');
              }
            }
          });
        }
      } else {
        if (activeSessionId.current === sessionId) {
          setAppState('error');
        }
      }

    } catch (error) {
      console.error("Regeneration failed:", error);
      if (activeSessionId.current === sessionId) {
        setAppState('error');
      }
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
    // Start a new "viewing" session, invalidating any background generation for the main view
    activeSessionId.current = crypto.randomUUID();

    setPromptData(item.promptData);
    setGeneratedImage(item.imageUrl);
    setUserInput(item.prompt);
    setReferenceImages(item.referenceImages || []);
    setAppState('complete');
    // setIsHistoryOpen(false); // Keep sidebar open as requested
  };

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showRegenerateMenu, setShowRegenerateMenu] = useState(false);

  // Close fullscreen on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-amber-500/30 overflow-hidden flex">

      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-500 ease-in-out relative h-full",
        isHistoryOpen ? "mr-80" : "mr-0"
      )}>

        {/* Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-zinc-950/50 backdrop-blur-md z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 relative overflow-hidden rounded-full">
              <img src="/logo.png" alt="Lumina Logo" className="w-full h-full object-cover mix-blend-screen scale-150" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-stone-200 to-stone-500 font-serif">
              Lumina <span className="text-amber-500 text-xs font-mono uppercase tracking-widest ml-1 font-sans">PRO</span>
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
                  <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest font-serif">Director's Treatment</h2>
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
                          images={key === 'referenceAnalysis' ? referenceImages : undefined}
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
                  className="absolute inset-0 z-30 bg-zinc-950 flex flex-col"
                >
                  <div className="flex-1 relative overflow-hidden">
                    <CinematicTreatment promptData={promptData} status={appState === 'generating_image' ? 'generating' : 'streaming'} referenceImages={referenceImages} />
                  </div>
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
                    transition={{ duration: 0.15, ease: "circOut" }}
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
                      <div className="flex items-center bg-gradient-to-r from-amber-700 to-amber-600 rounded-full shadow-lg shadow-amber-900/20 border border-amber-500/20 p-0.5">
                        <Button
                          onClick={() => handleRegenerate(1)}
                          disabled={isGlobalGenerating}
                          variant="ghost"
                          className="gap-2 text-white hover:bg-white/10 rounded-l-full px-4 h-9 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isGlobalGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                          Regenerate
                        </Button>
                        <div className="h-4 w-[1px] bg-white/20" />
                        <div
                          className="relative h-full"
                          onMouseEnter={() => setShowRegenerateMenu(true)}
                          onMouseLeave={() => setShowRegenerateMenu(false)}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 px-2 text-white hover:bg-white/10 rounded-r-full"
                          >
                            <span className="text-xs font-mono opacity-80">x1</span>
                          </Button>

                          {/* Hover Menu */}
                          <AnimatePresence>
                            {showRegenerateMenu && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                transition={{ duration: 0.2, ease: "circOut" }}
                                className="absolute bottom-full right-0 mb-1 w-14 bg-zinc-950/90 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl shadow-black/50 flex flex-col-reverse p-1 gap-1"
                              >
                                {[1, 2, 3, 4].map((num) => (
                                  <button
                                    key={num}
                                    onClick={() => {
                                      handleRegenerate(num);
                                      setShowRegenerateMenu(false);
                                    }}
                                    className="w-full h-8 flex items-center justify-center text-xs font-mono text-zinc-400 hover:text-amber-400 hover:bg-white/5 transition-colors rounded-lg"
                                  >
                                    x{num}
                                  </button>
                                ))}
                                <div className="text-[10px] text-center text-zinc-600 font-sans uppercase tracking-wider py-1 border-b border-white/5 mb-1">
                                  Batch
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
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
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-600/20 to-yellow-600/20 rounded-xl opacity-20 group-hover:opacity-40 blur transition duration-500"></div>
                <div className="relative flex gap-2 bg-stone-900/90 backdrop-blur-xl py-2 pl-2 pr-3 rounded-xl border border-white/5 shadow-2xl items-center">
                  <div className="relative flex-1 min-w-0">
                    {/* Overlay for collapsed state (Truncated view) */}
                    <AnimatePresence>
                      {!isInputFocused && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="absolute inset-0 flex items-start px-4 pointer-events-none"
                        >
                          {/* Mini Previews */}
                          {referenceImages.length > 0 && (
                            <div className="flex -space-x-2 mr-3 shrink-0 transition-all duration-300 self-center">
                              {referenceImages.slice(0, 3).map((img, idx) => (
                                <div key={idx} className="w-8 h-8 rounded-md border border-white/20 bg-zinc-800 overflow-hidden shadow-lg relative z-[10]">
                                  <img src={img} className="w-full h-full object-cover" />
                                </div>
                              ))}
                              {referenceImages.length > 3 && (
                                <div className="w-8 h-8 rounded-md border border-white/20 bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-400 shadow-lg relative z-[0]">
                                  +{referenceImages.length - 3}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="truncate text-lg text-zinc-100 leading-6 pt-3.5 w-full">
                            {userInput || <span className="text-zinc-600">Describe your scene...</span>}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Reference Images Preview */}
                    <AnimatePresence>
                      {isInputFocused && referenceImages.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pt-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
                            {referenceImages.map((img, idx) => (
                              <motion.div
                                key={idx}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                className="relative group flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border border-white/10 bg-black/50"
                              >
                                <img src={img} alt={`Ref ${idx}`} className="w-full h-full object-cover" />
                                <button
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveImage(idx);
                                  }}
                                  className="absolute top-0.5 right-0.5 bg-black/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <textarea
                      ref={textareaRef}
                      rows={1}
                      value={userInput}
                      onChange={(e) => {
                        setUserInput(e.target.value);
                        // Auto-grow
                        e.target.style.height = 'auto';
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                      }}
                      onPaste={handlePaste}
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
                        "w-full bg-transparent border-none text-lg resize-none focus:ring-0 focus:outline-none placeholder:text-zinc-600 pt-3.5 pb-2.5 px-4 leading-6 transition-[height] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] scrollbar-hide",
                        isInputFocused ? "max-h-[200px] overflow-y-auto opacity-100" : "h-12 overflow-hidden opacity-0 cursor-text"
                      )}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleGenerate();
                        }
                      }}
                      disabled={isGlobalGenerating}
                    />
                  </div>
                  <Button
                    size="lg"
                    onClick={handleGenerate}
                    disabled={!userInput.trim() || isGlobalGenerating}
                    className="h-12 px-8 bg-white text-black hover:bg-zinc-200 transition-all font-medium min-w-[140px]"
                  >
                    {isGlobalGenerating ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">
                          {appState === 'expanding_prompt' ? 'Directing...' : 'Developing...'}
                        </span>
                      </div>
                    ) : (
                      <>Generate <ChevronRight className="w-4 h-4 ml-2" /></>
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
