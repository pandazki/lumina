import React, { useState, useRef } from 'react';
import { PromptStructure, AppState } from './types';
import { expandPrompt, generateImage } from './services/geminiService';
import { Sparkles, Aperture, Download, Eye, Loader2, Image as ImageIcon, Code } from 'lucide-react';
import PromptSection from './components/PromptSection';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { ScrollArea } from './components/ui/scroll-area';
import { Separator } from './components/ui/separator';
import { cn } from './src/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { CinematicTreatment } from './components/CinematicTreatment';

const DEFAULT_PROMPT: PromptStructure = {
  subject: "",
  environment: "",
  atmosphere: "",
  microDetails: "",
  techSpecs: "",
  colorGrading: "",
  composition: ""
};

const App: React.FC = () => {
  const [userInput, setUserInput] = useState("");
  const [promptData, setPromptData] = useState<PromptStructure>(DEFAULT_PROMPT);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>('idle');
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const imageRef = useRef<HTMLDivElement>(null);

  const handleInitialGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    setAppState('expanding_prompt');
    setLoadingMsg("Consulting the Director...");
    setImageUrl(null); // Clear previous image
    setPromptData(DEFAULT_PROMPT);

    try {
      const expanded = await expandPrompt(userInput, undefined, undefined, (partial) => {
        setPromptData(prev => ({ ...prev, ...partial }));
      });
      setPromptData(expanded);

      setAppState('generating_image');
      setLoadingMsg("Developing Raw Negative...");

      const url = await generateImage(expanded);
      setImageUrl(url);
      setAppState('complete');
    } catch (error) {
      console.error(error);
      setAppState('error');
      setTimeout(() => setAppState('idle'), 3000);
    }
  };

  const handleModification = async (section: keyof PromptStructure, instruction: string) => {
    if (appState === 'generating_image' || appState === 'expanding_prompt') return;

    const originalState = appState;
    setAppState('expanding_prompt');
    setLoadingMsg(`Refining ${section}...`);

    try {
      // 1. Re-expand prompt with modification
      const updatedPrompt = await expandPrompt(userInput, promptData, `For the ${section}, please: ${instruction}`, (partial) => {
        setPromptData(prev => ({ ...prev, ...partial }));
      });
      setPromptData(updatedPrompt);

      // 2. Auto-regenerate image
      setAppState('generating_image');
      setLoadingMsg("Reprocessing Scene...");
      const url = await generateImage(updatedPrompt);
      setImageUrl(url);
      setAppState('complete');
    } catch (error) {
      console.error(error);
      setAppState('error');
      // Revert state if failed
      setTimeout(() => setAppState(originalState === 'complete' ? 'complete' : 'idle'), 3000);
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;

    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `lumina-nanobanana-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Also download prompt
    const blob = new Blob([JSON.stringify(promptData, null, 2)], { type: 'application/json' });
    const textLink = document.createElement('a');
    textLink.href = URL.createObjectURL(blob);
    textLink.download = `lumina-prompt-${Date.now()}.json`;
    document.body.appendChild(textLink);
    textLink.click();
    document.body.removeChild(textLink);
  };



  // ...

  const isCinematicMode = appState === 'expanding_prompt' || appState === 'generating_image';

  return (
    <div className="flex h-screen w-full bg-[#09090b] text-foreground overflow-hidden font-sans selection:bg-purple-500/30">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[150px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      {/* Sidebar - Director's Treatment */}
      {/* Hidden during cinematic mode */}
      <aside className={cn(
        "border-r border-white/10 bg-zinc-900/50 backdrop-blur-xl flex flex-col z-10 hidden lg:flex transition-all duration-500 ease-in-out overflow-hidden",
        isCinematicMode ? "w-0 opacity-0 border-none" : "w-96 opacity-100"
      )}>
        <div className="p-6 border-b border-white/10 min-w-[24rem]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-yellow-400 to-orange-600 flex items-center justify-center shadow-[0_0_20px_rgba(255,165,0,0.3)] ring-1 ring-white/20">
              <Aperture className="text-black h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight leading-none text-white">Lumina</h1>
              <span className="text-[10px] font-medium text-zinc-400 tracking-[0.2em] uppercase">Pro Studio</span>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 min-w-[24rem]">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="h-3 w-3" /> Director's Treatment
              </h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-zinc-500 hover:text-white"
                onClick={() => setShowFullPrompt(!showFullPrompt)}
                title="View JSON Source"
              >
                <Code className="h-3 w-3" />
              </Button>
            </div>

            <AnimatePresence>
              {showFullPrompt && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 bg-black/50 rounded-lg border border-white/10 text-[10px] font-mono text-green-400/80 overflow-x-auto whitespace-pre-wrap shadow-inner">
                    {JSON.stringify(promptData, null, 2)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              <PromptSection
                title="Subject"
                content={promptData.subject}
                onEdit={(val) => handleModification('subject', val)}
              />
              <PromptSection
                title="Atmosphere"
                content={promptData.atmosphere}
                onEdit={(val) => handleModification('atmosphere', val)}
              />
              <PromptSection
                title="Environment"
                content={promptData.environment}
                onEdit={(val) => handleModification('environment', val)}
              />
              <div className="grid grid-cols-1 gap-4">
                <PromptSection
                  title="Camera"
                  content={promptData.techSpecs}
                  onEdit={(val) => handleModification('techSpecs', val)}
                />
                <PromptSection
                  title="Color"
                  content={promptData.colorGrading}
                  onEdit={(val) => handleModification('colorGrading', val)}
                />
              </div>
              <PromptSection
                title="Micro Details"
                content={promptData.microDetails}
                onEdit={(val) => handleModification('microDetails', val)}
              />
            </div>
          </div>
        </ScrollArea>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-10 min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-transparent backdrop-blur-sm">
          <div className="lg:hidden flex items-center gap-2">
            <Aperture className="h-5 w-5 text-orange-500" />
            <span className="font-bold text-white">Lumina PRO</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {appState === 'complete' && (
              <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download Assets</span>
              </Button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-10 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {isCinematicMode ? (
              <motion.div
                key="cinematic"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full"
              >
                <CinematicTreatment
                  promptData={promptData}
                  status={appState === 'generating_image' ? 'generating' : 'streaming'}
                />
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative w-full h-full max-w-5xl max-h-[calc(100vh-12rem)] rounded-2xl overflow-hidden border border-white/10 bg-zinc-950/50 shadow-2xl flex items-center justify-center group ring-1 ring-white/5"
              >
                {/* State: IDLE */}
                {appState === 'idle' && (
                  <div className="text-center opacity-40 flex flex-col items-center gap-4">
                    <div className="h-24 w-24 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                      <ImageIcon className="h-10 w-10 text-zinc-400" />
                    </div>
                    <p className="text-lg font-light tracking-wide text-zinc-400">Ready to visualize your imagination</p>
                  </div>
                )}

                {/* State: ERROR */}
                {appState === 'error' && (
                  <div className="text-red-400 text-center px-6">
                    <p className="font-bold text-xl mb-2">Generation Failed</p>
                    <p className="text-sm opacity-70">The connection to the creative matrix was interrupted.</p>
                  </div>
                )}

                {/* State: COMPLETE */}
                {imageUrl && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative w-full h-full"
                  >
                    <img
                      src={imageUrl}
                      alt="Generated Masterpiece"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Floating Input Bar */}
        <div className="absolute bottom-6 left-0 right-0 px-6 flex justify-center pointer-events-none z-30">
          <div className="w-full max-w-3xl pointer-events-auto">
            <form onSubmit={handleInitialGenerate} className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-xl p-2 flex items-center gap-2 shadow-2xl ring-1 ring-white/5">
                <Input
                  className="border-none bg-transparent focus-visible:ring-0 text-lg h-12 px-4 shadow-none placeholder:text-zinc-500 text-white"
                  placeholder="Describe your vision (e.g., A cyberpunk ramen shop in rain...)"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  disabled={appState === 'expanding_prompt' || appState === 'generating_image'}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!userInput || (appState !== 'idle' && appState !== 'complete' && appState !== 'error')}
                  className={cn(
                    "h-12 w-12 rounded-lg transition-all duration-300",
                    userInput ? "bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/25 text-white" : "bg-zinc-800 text-zinc-500"
                  )}
                >
                  {appState === 'expanding_prompt' || appState === 'generating_image' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;