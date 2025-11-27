import { GoogleGenAI, Type, Schema } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

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

export async function POST(req: NextRequest) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: "API Key not configured" }, { status: 500 });
    }

    try {
        const { userInput, currentPrompt, modification } = await req.json();
        const ai = new GoogleGenAI({ apiKey });

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

        let userContent = `Create a comprehensive prompt for: "${userInput}"`;

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

        // Create a readable stream from the generator
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of result) {
                        const text = chunk.text;
                        if (text) {
                            controller.enqueue(new TextEncoder().encode(text));
                        }
                    }
                    controller.close();
                } catch (e) {
                    controller.error(e);
                }
            }
        });

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
            },
        });

    } catch (error) {
        console.error("Expand API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
