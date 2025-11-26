import React, { useState } from 'react';
import { Pencil, Sparkles, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '../src/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface PromptSectionProps {
    title: string;
    content: string;
    onEdit: (newInstruction: string) => void;
    className?: string;
}

const PromptSection: React.FC<PromptSectionProps> = ({ title, content, onEdit, className }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editValue.trim()) {
            onEdit(editValue);
            setIsEditing(false);
            setEditValue("");
        }
    };

    return (
        <Card className={cn("group relative overflow-hidden border-white/10 bg-white/5 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10", className)}>
            <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 space-y-0">
                <CardTitle className="text-xs font-medium uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
                    {title}
                </CardTitle>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setIsEditing(!isEditing)}
                >
                    <Pencil className="h-3 w-3" />
                </Button>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <AnimatePresence mode="wait">
                    {isEditing ? (
                        <motion.form
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            onSubmit={handleSubmit}
                            className="space-y-2"
                        >
                            <Input
                                autoFocus
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                placeholder={`Refine ${title.toLowerCase()}...`}
                                className="h-8 text-sm bg-black/20 border-white/10 focus-visible:ring-purple-500/50"
                            />
                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => setIsEditing(false)}
                                >
                                    <X className="h-3 w-3 mr-1" /> Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    className="h-6 px-2 text-xs bg-purple-600 hover:bg-purple-500 text-white border-none"
                                >
                                    <Sparkles className="h-3 w-3 mr-1" /> Update
                                </Button>
                            </div>
                        </motion.form>
                    ) : (
                        <motion.div
                            key={content}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground/90 transition-colors"
                        >
                            {content ? (
                                content.split(/(\*[^*]+\*)/g).map((part, i) => {
                                    if (part.startsWith('*') && part.endsWith('*')) {
                                        return (
                                            <span key={i} className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                                                {part.slice(1, -1)}
                                            </span>
                                        );
                                    }
                                    return <span key={i}>{part}</span>;
                                })
                            ) : (
                                <span className="italic opacity-50">Waiting for input...</span>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
};

export default PromptSection;
