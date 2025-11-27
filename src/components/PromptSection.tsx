import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { HighlightedText } from './HighlightedText';

interface PromptSectionProps {
    title: string;
    content: string;
    images?: string[];
    className?: string;
}

export const PromptSection: React.FC<PromptSectionProps> = ({ title, content, images, className }) => {
    return (
        <Card className={cn("group relative overflow-hidden border-white/10 bg-white/5 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10", className)}>
            <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 space-y-0">
                <CardTitle className="text-xs font-medium uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <motion.div
                    key={content}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground/90 transition-colors"
                >
                    {content ? (
                        <HighlightedText text={content} />
                    ) : (
                        <span className="italic opacity-50">Waiting for input...</span>
                    )}

                    {images && images.length > 0 && (
                        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {images.map((img, idx) => (
                                <div key={idx} className="relative flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border border-white/10 bg-black/50">
                                    <img src={img} alt={`Ref ${idx}`} className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </CardContent>
        </Card>
    );
};


