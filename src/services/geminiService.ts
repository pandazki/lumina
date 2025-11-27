import { PromptStructure } from "@/types";

export const expandPrompt = async (
  userInput: string,
  currentPrompt?: PromptStructure,
  modification?: string,
  onUpdate?: (partial: Partial<PromptStructure>) => void
): Promise<PromptStructure> => {

  const response = await fetch('/api/expand', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userInput, currentPrompt, modification })
  });

  if (!response.ok) {
    throw new Error('Failed to expand prompt');
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  let accumulatedText = "";
  const partialStructure: Partial<PromptStructure> = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunkText = new TextDecoder().decode(value);
    accumulatedText += chunkText;

    // Robust Partial JSON Parsing (Same logic as before, but client-side)
    const keys = ["subject", "environment", "atmosphere", "microDetails", "techSpecs", "colorGrading", "composition"];
    const keyIndices: { key: string, start: number, contentStart: number }[] = [];

    // 1. Find start positions of all known keys
    for (const key of keys) {
      const keyPattern = `"${key}"\\s*:\\s*"`;
      const match = accumulatedText.match(new RegExp(keyPattern));
      if (match && match.index !== undefined) {
        keyIndices.push({
          key,
          start: match.index,
          contentStart: match.index + match[0].length
        });
      }
    }

    // 2. Sort by position to determine order
    keyIndices.sort((a, b) => a.start - b.start);

    let hasUpdate = false;
    for (let i = 0; i < keyIndices.length; i++) {
      const current = keyIndices[i];
      const next = keyIndices[i + 1];

      let rawContent = "";
      if (next) {
        rawContent = accumulatedText.substring(current.contentStart, next.start);
      } else {
        rawContent = accumulatedText.substring(current.contentStart);
      }

      // 3. Clean up the content
      let endIdx = -1;
      for (let j = 0; j < rawContent.length; j++) {
        if (rawContent[j] === '"' && (j === 0 || rawContent[j - 1] !== '\\')) {
          endIdx = j;
          break;
        }
      }

      let cleanContent = endIdx !== -1 ? rawContent.substring(0, endIdx) : rawContent;

      cleanContent = cleanContent
        .replace(/\\"/g, '"')
        .replace(/\\n/g, '\n')
        .replace(/\\\\/g, '\\');

      if (partialStructure[current.key as keyof PromptStructure] !== cleanContent) {
        partialStructure[current.key as keyof PromptStructure] = cleanContent;
        hasUpdate = true;
      }
    }

    if (hasUpdate && onUpdate) {
      onUpdate({ ...partialStructure });
    }
  }

  try {
    const final = JSON.parse(accumulatedText) as PromptStructure;
    return final;
  } catch (e) {
    console.warn("Final JSON parse failed", e);

    // Return what we have if mostly complete
    return {
      subject: partialStructure.subject || "",
      environment: partialStructure.environment || "",
      atmosphere: partialStructure.atmosphere || "",
      microDetails: partialStructure.microDetails || "",
      techSpecs: partialStructure.techSpecs || "",
      colorGrading: partialStructure.colorGrading || "",
      composition: partialStructure.composition || "",
      ...partialStructure
    } as PromptStructure;
  }
};

export const generateImage = async (promptData: PromptStructure): Promise<string> => {
  const response = await fetch('/api/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ promptData })
  });

  if (!response.ok) {
    throw new Error('Failed to generate image');
  }

  const data = await response.json();
  return data.imageUrl;
};
