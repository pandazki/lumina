import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: "API Key not configured" }, { status: 500 });
    }

    try {
        const { promptData, images } = await req.json();
        const ai = new GoogleGenAI({ apiKey });

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

        const contents: any[] = [{ text: fullPrompt }];

        if (images && Array.isArray(images) && images.length > 0) {
            images.forEach((img: string) => {
                const match = img.match(/^data:(image\/[a-z]+);base64,(.+)$/);
                if (match) {
                    contents.unshift({ // Add images BEFORE text
                        inlineData: {
                            mimeType: match[1],
                            data: match[2]
                        }
                    });
                }
            });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: [
                {
                    parts: contents
                }
            ],
            config: {
                imageConfig: {
                    aspectRatio: "16:9",
                    imageSize: "1024x1024"
                }
            }
        });

        // Extract image - handle multiple potential locations
        let imageUrl = null;
        if (response.candidates) {
            for (const candidate of response.candidates) {
                if (candidate.content?.parts) {
                    for (const part of candidate.content.parts) {
                        if (part.inlineData && part.inlineData.data) {
                            imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                            break;
                        }
                    }
                }
                if (imageUrl) break;
            }
        }

        if (!imageUrl) {
            throw new Error("No image data found in response");
        }

        return NextResponse.json({ imageUrl });

    } catch (error) {
        console.error("Image API Error:", error);
        return NextResponse.json({ error: "Image generation failed" }, { status: 500 });
    }
}
