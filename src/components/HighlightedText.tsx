import React from 'react';

interface HighlightedTextProps {
    text: string;
    className?: string;
}

export const HighlightedText: React.FC<HighlightedTextProps> = ({ text, className }) => {
    if (!text) return null;

    return (
        <span className={className}>
            {text.split(/(\*[^*]+\*)/g).map((part, i) => {
                if (part.startsWith('*') && part.endsWith('*')) {
                    return (
                        <span
                            key={i}
                            className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-400 animate-pulse drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                        >
                            {part.slice(1, -1)}
                        </span>
                    );
                }
                return <span key={i}>{part}</span>;
            })}
        </span>
    );
};
