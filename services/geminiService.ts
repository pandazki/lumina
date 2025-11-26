import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PromptStructure } from "../types";

// Helper to get client (handling key refresh if needed)
const getClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("VITE_GEMINI_API_KEY is missing from environment variables");
    console.log("Available env vars:", import.meta.env);
    throw new Error("API Key not found. Please set VITE_GEMINI_API_KEY in .env.local");
  }
  return new GoogleGenAI({ apiKey });
};

const REFERENCE_PROMPT = `
THE DEER - SUBJECT IN EXQUISITE DETAIL: A magnificent mature male sika deer stands in a moment of frozen alertness 25 meters into the forest depth. Every single element is rendered with biological accuracy...
THE ANCIENT FOREST ENVIRONMENT: This is a primordial temperate broadleaf forest in its most mystical state. Giant tree trunks of Chinese oak and maple dominate...
ATMOSPHERIC MASTERY - THE FOG AND LIGHT: Dense morning fog fills the forest in multiple stratified layers... Golden hour sunlight penetrates the canopy...
MICROSCOPIC DETAILS THAT SELL REALISM: Spider web stretched between two branches... Individual water droplets... Visible air particles...
TECHNICAL PHOTOGRAPHY SPECIFICATIONS: Shot on a Canon EOS R5 with EF 500mm f/4L IS II USM lens, aperture f/4... ISO 1600...
COLOR GRADING AND POST-PROCESSING: Professional wildlife photography processing: Shadows lifted 15%... Slight orange/teal color grade... Film grain added at 5%...
COMPOSITIONAL MASTERY: Rule of thirds applied... Leading lines from fallen logs...
`;

const PROMPT_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    subject: { type: Type.STRING, description: "Detailed description of the main subject with biological/physical accuracy." },
    environment: { type: Type.STRING, description: "The setting, including textures, flora, materials." },
    atmosphere: { type: Type.STRING, description: "Lighting, weather, fog, mood, volumetric effects." },
    microDetails: { type: Type.STRING, description: "Tiny details that sell realism (dust, droplets, imperfections)." },
    techSpecs: { type: Type.STRING, description: "Camera, lens, shutter speed, ISO, aperture settings." },
    colorGrading: { type: Type.STRING, description: "Post-processing notes, color palette, grading style." },
    composition: { type: Type.STRING, description: "Framing, angles, leading lines, focus points." },
  },
  required: ["subject", "environment", "atmosphere", "microDetails", "techSpecs", "colorGrading", "composition"],
};

export const expandPrompt = async (
  userUnput: string,
  currentPrompt?: PromptStructure,
  modification?: string,
  onUpdate?: (partial: Partial<PromptStructure>) => void
): Promise<PromptStructure> => {
  const ai = getClient();

  const systemInstruction = `
    You are a world-class visual director and prompt engineer. 
    Your goal is to take a simple concept and expand it into a highly detailed, premium quality image prompt.
    
    CRITICAL INSTRUCTION:
    - Analyze the user's request for any specific ARTISTIC STYLE (e.g., "Manga", "Oil Painting", "3D Render", "Pixel Art").
    - If a style is specified, YOU MUST ADAPT ALL DESCRIPTIONS TO MATCH THAT STYLE.
    - If NO style is specified, default to "Impossibly Photorealistic" (National Geographic style).

    REFERENCE STYLE (Use this level of detail, but adapt the content to the requested style):
    ${REFERENCE_PROMPT}

    RULES:
    1. You must output JSON.
    2. Be extremely specific. Use technical terms appropriate for the style.
    3. **HIGHLIGHT KEY ELEMENTS**: Wrap the most important visual elements (colors, specific objects, lighting effects) in asterisks, e.g., *crimson red*, *bioluminescent glow*, *carbon fiber texture*.
    4. Ensure internal consistency with the chosen style.
    5. Maintain a "Masterpiece" aesthetic regardless of the medium.
    6. If modifying, keep the previous context but apply the user's specific change requested.
  `;

  let userContent = `Create a comprehensive prompt for: "${userUnput}"`;

  if (currentPrompt && modification) {
    userContent = `
      Based on the following existing prompt structure:
      ${JSON.stringify(currentPrompt)}

      Please modify it according to this request: "${modification}"
      Keep the rest of the high-quality details consistent.
    `;
  }

  const result = await ai.models.generateContentStream({
    model: 'gemini-3-pro-preview',
    contents: userContent,
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: PROMPT_SCHEMA,
      temperature: 0.7,
      maxOutputTokens: 4096,
    }
  });

  let accumulatedText = "";
  const partialStructure: Partial<PromptStructure> = {};

  for await (const chunk of result) {
    const chunkText = chunk.text;
    if (!chunkText) continue;
    accumulatedText += chunkText;

    // Robust Partial JSON Parsing
    // We want to extract values even before the closing quote arrives to enable true streaming.

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
        // Content is between this key and the next
        rawContent = accumulatedText.substring(current.contentStart, next.start);
      } else {
        // Last key: Content is everything until the end
        rawContent = accumulatedText.substring(current.contentStart);
      }

      // 3. Clean up the content
      // Find the first unescaped quote to mark the end of the value
      let endIdx = -1;
      for (let j = 0; j < rawContent.length; j++) {
        if (rawContent[j] === '"' && (j === 0 || rawContent[j - 1] !== '\\')) {
          endIdx = j;
          break;
        }
      }

      let cleanContent = endIdx !== -1 ? rawContent.substring(0, endIdx) : rawContent;

      // Unescape JSON characters for display
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

    // Check if we have enough data to proceed
    const requiredKeys = ["subject", "environment", "atmosphere", "microDetails", "techSpecs", "colorGrading", "composition"];
    const missingKeys = requiredKeys.filter(k => !partialStructure[k as keyof PromptStructure]);

    if (missingKeys.length > 2) { // Allow at most 2 missing keys before failing
      throw new Error(`Generation incomplete. Missing keys: ${missingKeys.join(", ")}`);
    }

    // If parse fails but we have most data, return what we have
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
  const ai = getClient();

  // Construct the monolithic prompt from the structured data
  const fullPrompt = `
    Subject: ${promptData.subject}
    Environment: ${promptData.environment}
    Atmosphere: ${promptData.atmosphere}
    Micro-Details: ${promptData.microDetails}
    Technical Specs: ${promptData.techSpecs}
    Color Grading: ${promptData.colorGrading}
    Composition: ${promptData.composition}
    
    Requirements: 16:9 aspect ratio, 4K resolution, high fidelity.
  `;

  console.log("Generating image with prompt length:", fullPrompt.length);

  try {
    // Reverting to the user-specified model
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: [
        {
          parts: [
            { text: fullPrompt }
          ]
        }
      ],
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "1024x1024"
        }
      }
    });

    console.log("Image generation response received:", JSON.stringify(response, null, 2));

    // Extract image - handle multiple potential locations
    if (response.candidates) {
      for (const candidate of response.candidates) {
        if (candidate.content?.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.data) {
              return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            }
          }
        }
      }
    }

    throw new Error("No image data found in response");

  } catch (error) {
    console.error("Image generation failed:", error);
    throw error;
  }
};
