import React, { useEffect, useRef } from 'react';
import { PromptStructure } from '../types';
import { HighlightedText } from './HighlightedText';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from './ui/scroll-area';
import { Loader2, Zap } from 'lucide-react';

interface CinematicTreatmentProps {
    promptData: PromptStructure;
    status: 'streaming' | 'generating';
}

export const CinematicTreatment: React.FC<CinematicTreatmentProps> = ({ promptData, status }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const hasStarted = (Object.values(promptData) as string[]).some(val => val.length > 0);

    // Auto-scroll to bottom as content streams in
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [promptData]);

    const sections = [
        { title: "Subject", content: promptData.subject },
        { title: "Atmosphere", content: promptData.atmosphere },
        { title: "Environment", content: promptData.environment },
        { title: "Camera", content: promptData.techSpecs },
        { title: "Color", content: promptData.colorGrading },
        { title: "Micro Details", content: promptData.microDetails },
        { title: "Composition", content: promptData.composition },
    ];

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 relative overflow-hidden">
            {/* Background Ambient */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-purple-900/5 to-black/0 pointer-events-none" />

            {/* Initializing State */}
            <AnimatePresence>
                {!hasStarted && status === 'streaming' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-black/50 backdrop-blur-sm"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full animate-pulse" />
                            <Zap className="h-12 w-12 text-purple-400 animate-bounce relative z-10" />
                        </div>
                        <p className="mt-4 text-sm font-mono text-purple-300 tracking-widest uppercase animate-pulse">
                            Establishing Neural Link...
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>



            <div className="w-full max-w-4xl h-full flex flex-col relative z-0">
                <motion.h2
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-2xl font-light text-zinc-400 mb-8 text-center uppercase tracking-[0.3em]"
                >
                    Director's Treatment
                </motion.h2>

                <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-12 pb-20">
                        {sections.map((section, index) => (
                            section.content && section.content.length > 0 && (
                                <motion.div
                                    key={section.title}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="group"
                                >
                                    <h3 className="text-sm font-bold text-purple-500 uppercase tracking-widest mb-3 flex items-center gap-3">
                                        <span className="h-[1px] w-8 bg-purple-500/50" />
                                        {section.title}
                                    </h3>
                                    <div className="pl-11 text-lg md:text-xl lg:text-2xl font-light leading-relaxed text-zinc-200">
                                        <HighlightedText text={section.content} />
                                    </div>
                                </motion.div>
                            )
                        ))}
                        <div ref={scrollRef} />
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
};
