export type ContentType = 'tweet' | 'thread' | 'article' | 'announcement';
export type ContentStatus = 'draft' | 'review' | 'scheduled' | 'published' | 'rejected';
export type ContentSource = 'linear' | 'trend' | 'sdk-update' | 'manual';

// Brand score threshold for content to pass review
export const BRAND_SCORE_THRESHOLD = 60;

/** Full context from the original trigger (trend, task, influencer tweet, etc.) */
export interface SourceContext {
  type: string;
  /** Trending topic name */
  topic?: string;
  /** Sample tweets from the trend or the influencer's original tweet */
  sampleTweets?: string[];
  /** Why this trend is relevant to Demos/Web3 */
  relevanceToWeb3?: string;
  /** AI reasoning for why this content was generated */
  reasoning?: string;
  /** Linear task title */
  taskTitle?: string;
  /** Linear task description */
  taskDescription?: string;
  /** Linear task labels */
  taskLabels?: string[];
  /** Influencer's Twitter username (for influencer_tweet type) */
  influencerUsername?: string;
  /** Original tweet ID from the influencer */
  influencerTweetId?: string;
  /** Direct link to the influencer's tweet */
  influencerTweetUrl?: string;
  /** Engagement metrics from the influencer's tweet */
  engagement?: {
    likes: number;
    retweets: number;
    replies: number;
  };
}

export interface ContentItem {
  id: string;
  type: ContentType;
  status: ContentStatus;
  content: string;
  threadParts?: string[];
  articleBody?: string;
  source: ContentSource;
  brandScore?: number;
  relevanceScore?: number;
  createdAt: string;
  scheduledFor?: string;
  typefullyId?: string;
  paragraphId?: string;
  /** Final image with overlay (logo + tagline) */
  imageUrl?: string;
  /** Base image without overlay - used for re-applying different taglines */
  baseImageUrl?: string;
  sourceText?: string;
  /** Full context from the original trigger for editing reference */
  sourceContext?: SourceContext;
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

export interface VisualStyleProfile {
  lastUpdated: string;
  samplesAnalyzed: number;
  sources: { twitter: number; paragraph: number };
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

export const COLUMN_CONFIG: Record<ContentStatus, { label: string; icon: string; color: string }> = {
  draft: { label: 'Drafts', icon: '✏️', color: 'blue' },
  review: { label: 'Review', icon: '🔍', color: 'orange' },
  scheduled: { label: 'Scheduled', icon: '📅', color: 'purple' },
  published: { label: 'Published', icon: '✅', color: 'green' },
  rejected: { label: 'Rejected', icon: '❌', color: 'red' },
};

export const CONTENT_TYPE_CONFIG: Record<ContentType, { label: string; icon: string }> = {
  tweet: { label: 'Tweet', icon: '🐦' },
  thread: { label: 'Thread', icon: '🧵' },
  article: { label: 'Article', icon: '📝' },
  announcement: { label: 'Announcement', icon: '📢' },
};
