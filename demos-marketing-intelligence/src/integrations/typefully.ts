import axios, { AxiosInstance } from 'axios';

export interface TypefullyDraft {
  content: string | string[];
  schedule_date?: string;
  threadify?: boolean;
  share?: boolean;
  num_tweets?: number;
  media?: Array<{
    url?: string;
    file_path?: string;
  }>;
}

export interface TypefullyDraftResponse {
  id: string;
  content: string[];
  created_at: string;
  status: 'draft' | 'scheduled' | 'published';
  url: string;
}

export interface TypefullyAnalytics {
  impressions: number;
  engagements: number;
  clicks: number;
  retweets: number;
  likes: number;
  replies: number;
}

export class TypefullyClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: 'https://api.typefully.com/v1',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  /**
   * Create a draft in Typefully
   */
  async createDraft(draft: TypefullyDraft): Promise<TypefullyDraftResponse> {
    try {
      const response = await this.client.post('/drafts', draft);
      return response.data;
    } catch (error: any) {
      throw new Error(`Typefully API error: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Create a tweet thread
   */
  async createThread(tweets: string[], share = true): Promise<TypefullyDraftResponse> {
    return this.createDraft({
      content: tweets,
      share,
    });
  }

  /**
   * Schedule a draft for later
   */
  async scheduleDraft(draft: TypefullyDraft, scheduleDate: Date): Promise<TypefullyDraftResponse> {
    return this.createDraft({
      ...draft,
      schedule_date: scheduleDate.toISOString(),
    });
  }

  /**
   * Get all drafts
   */
  async getDrafts(): Promise<TypefullyDraftResponse[]> {
    try {
      const response = await this.client.get('/drafts');
      return response.data.drafts || [];
    } catch (error: any) {
      throw new Error(`Failed to fetch drafts: ${error.message}`);
    }
  }

  /**
   * Get analytics for published tweets
   */
  async getAnalytics(tweetId?: string): Promise<TypefullyAnalytics> {
    try {
      const url = tweetId ? `/analytics/${tweetId}` : '/analytics';
      const response = await this.client.get(url);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch analytics: ${error.message}`);
    }
  }

  /**
   * Delete a draft
   */
  async deleteDraft(draftId: string): Promise<void> {
    try {
      await this.client.delete(`/drafts/${draftId}`);
    } catch (error: any) {
      throw new Error(`Failed to delete draft: ${error.message}`);
    }
  }

  /**
   * Get account information
   */
  async getAccount(): Promise<any> {
    try {
      const response = await this.client.get('/account');
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch account: ${error.message}`);
    }
  }
}

export default TypefullyClient;
