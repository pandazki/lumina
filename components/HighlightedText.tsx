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
                            className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.2)]"
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
