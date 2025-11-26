export interface PromptSection {
  title: string;
  content: string;
}

export interface PromptStructure {
  subject: string;
  environment: string;
  atmosphere: string;
  microDetails: string;
  techSpecs: string;
  colorGrading: string;
  composition: string;
}

export type AppState = 
  | 'idle' 
  | 'expanding_prompt' 
  | 'generating_image' 
  | 'complete' 
  | 'error';

export interface HistoryItem {
  imageUrl: string;
  prompt: PromptStructure;
  timestamp: number;
}