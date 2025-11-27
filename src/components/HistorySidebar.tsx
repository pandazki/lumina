import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HistoryItem } from '@/types';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Trash2, X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HistorySidebarProps {
    isOpen: boolean;
    onClose: () => void;
    history: HistoryItem[];
    onDelete: (id: string) => void;
    onSelect: (item: HistoryItem) => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
    isOpen,
    onClose,
    history,
    onDelete,
    onSelect,
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop for mobile */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                    />

                    {/* Sidebar Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 bottom-0 w-80 bg-zinc-950/95 backdrop-blur-xl border-l border-white/10 z-50 flex flex-col shadow-2xl"
                    >
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-widest flex items-center gap-2">
                                <Clock className="w-4 h-4 text-purple-500" />
                                History
                            </h2>
                            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10">
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-4">
                                {history.length === 0 ? (
                                    <div className="text-center py-10 text-zinc-500 text-sm">
                                        <p>No history yet.</p>
                                        <p className="text-xs mt-1">Generated images will appear here.</p>
                                    </div>
                                ) : (
                                    history.map((item) => (
                                        <motion.div
                                            key={item.id}
                                            layout
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="group relative rounded-lg overflow-hidden border border-white/10 bg-zinc-900/50 hover:border-purple-500/50 transition-colors"
                                        >
                                            <div
                                                className="aspect-video w-full cursor-pointer relative"
                                                onClick={() => onSelect(item)}
                                            >
                                                <img
                                                    src={item.imageUrl}
                                                    alt={item.promptData.subject}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                                    <p className="text-xs text-white font-medium line-clamp-1">{item.promptData.subject}</p>
                                                    <p className="text-[10px] text-zinc-400">{new Date(item.timestamp).toLocaleTimeString()}</p>
                                                </div>
                                            </div>

                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity scale-90 hover:scale-100"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDelete(item.id);
                                                }}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
