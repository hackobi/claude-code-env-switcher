import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '..', 'data');

export interface ContentItem {
  id: string;
  type: 'tweet' | 'thread' | 'article' | 'announcement';
  status: 'idea' | 'draft' | 'review' | 'scheduled' | 'published';
  content: string;
  threadParts?: string[];
  articleBody?: string;
  source: 'linear' | 'trend' | 'sdk-update' | 'manual';
  brandScore?: number;
  createdAt: string;
  scheduledFor?: string;
  typefullyId?: string;
  paragraphId?: string;
  imageUrl?: string;
}

export interface BrandVoiceProfile {
  lastUpdated: string;
  samplesAnalyzed: number;
  sources: {
    twitter: number;
    paragraph: number;
  };
  voiceCharacteristics: {
    tone: string[];
    commonPhrases: string[];
    avoidedPhrases: string[];
    technicalLevel: number;
    casualness: number;
    enthusiasm: number;
  };
  topicPatterns: {
    shippingAnnouncements: string[];
    technicalExplanations: string[];
    communityEngagement: string[];
  };
  exampleTweets: {
    excellent: string[];
    good: string[];
  };
}

export async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function getContentItems(): Promise<ContentItem[]> {
  try {
    const data = await fs.readFile(path.join(DATA_DIR, 'content-items.json'), 'utf-8');
    return JSON.parse(data).items || [];
  } catch {
    return [];
  }
}

export async function saveContentItem(item: ContentItem): Promise<ContentItem> {
  await ensureDataDir();
  const items = await getContentItems();

  if (!item.id) {
    item.id = Date.now().toString();
  }
  if (!item.createdAt) {
    item.createdAt = new Date().toISOString();
  }

  const existingIndex = items.findIndex(i => i.id === item.id);
  if (existingIndex >= 0) {
    items[existingIndex] = item;
  } else {
    items.push(item);
  }

  await fs.writeFile(
    path.join(DATA_DIR, 'content-items.json'),
    JSON.stringify({ items }, null, 2)
  );

  return item;
}

export async function updateContentStatus(
  id: string,
  status: ContentItem['status']
): Promise<ContentItem | null> {
  const items = await getContentItems();
  const item = items.find(i => i.id === id);

  if (!item) return null;

  item.status = status;
  await fs.writeFile(
    path.join(DATA_DIR, 'content-items.json'),
    JSON.stringify({ items }, null, 2)
  );

  return item;
}

export async function deleteContentItem(id: string): Promise<boolean> {
  const items = await getContentItems();
  const filtered = items.filter(i => i.id !== id);

  if (filtered.length === items.length) return false;

  await fs.writeFile(
    path.join(DATA_DIR, 'content-items.json'),
    JSON.stringify({ items: filtered }, null, 2)
  );

  return true;
}

export async function getBrandVoiceProfile(): Promise<BrandVoiceProfile | null> {
  try {
    const data = await fs.readFile(path.join(DATA_DIR, 'brand-voice-profile.json'), 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function saveBrandVoiceProfile(profile: BrandVoiceProfile): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(
    path.join(DATA_DIR, 'brand-voice-profile.json'),
    JSON.stringify(profile, null, 2)
  );
}

export interface VisualStyleProfile {
  lastUpdated: string | null;
  samplesAnalyzed: number;
  sources: {
    twitter: number;
    paragraph: number;
  };
  colorPalette: {
    primary: string[];
    backgrounds: string[];
  };
  styleCharacteristics: {
    composition: string[];
    themes: string[];
    mood: string[];
  };
  avoidedPatterns: string[];
  exampleImageUrls: string[];
}

export async function getVisualStyleProfile(): Promise<VisualStyleProfile | null> {
  try {
    const data = await fs.readFile(path.join(DATA_DIR, 'visual-style-profile.json'), 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function saveVisualStyleProfile(profile: VisualStyleProfile): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(
    path.join(DATA_DIR, 'visual-style-profile.json'),
    JSON.stringify(profile, null, 2)
  );
}
