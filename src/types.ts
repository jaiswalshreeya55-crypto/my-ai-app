export interface GroundedSource {
  title: string;
  url: string;
  domain: string;
}

export interface QAItem {
  id: string;
  timestamp: number;
  prompt: string;
  imagePreview?: string;
  response: string;
  sources: GroundedSource[];
  searchQueries?: string[];
  fallbackNotice?: string;
  modelUsed?: string;
}

export type ActiveTab =
  | 'math'
  | 'chat'
  | 'image'
  | 'video'
  | 'music'
  | 'maps'
  | 'live'
  | 'creations'
  | 'background';

export interface BgPreset {
  id: string;
  name: string;
  value: string;
  type: 'color' | 'gradient';
  category: 'purple' | 'neutral' | 'pastel';
}

export interface UserCreationItem {
  id: string;
  userId: string;
  type: 'math' | 'chat' | 'image' | 'video' | 'music' | 'maps';
  title: string;
  prompt: string;
  outputUrl?: string;
  metadata?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
}

export interface MapPlace {
  title: string;
  uri: string;
  snippet?: string;
}
