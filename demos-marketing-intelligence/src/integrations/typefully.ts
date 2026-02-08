import axios, { AxiosInstance } from 'axios';

export interface TypefullyDraft {
  content: string | string[];
  schedule_date?: string;
  share?: boolean;
  media?: Array<{
    url?: string;
    file_path?: string;
  }>;
}

export interface TypefullyDraftResponse {
  id: string;
  status: 'draft' | 'scheduled' | 'published';
  created_at: string;
  share_url?: string;
  private_url?: string;
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
  private socialSetId: string | null;
  private socialSetResolved = false;

  constructor(apiKey: string, socialSetId?: string) {
    // Only use socialSetId if it's a valid integer (not a placeholder like "your_account_id")
    this.socialSetId = socialSetId && /^\d+$/.test(socialSetId) ? socialSetId : null;
    this.client = axios.create({
      baseURL: 'https://api.typefully.com/v2',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
  }

  private async resolveSocialSetId(): Promise<string> {
    if (this.socialSetId && this.socialSetResolved) return this.socialSetId;

    if (this.socialSetId) {
      this.socialSetResolved = true;
      return this.socialSetId;
    }

    // Auto-fetch the first social set from the account
    const response = await this.client.get('/social-sets');
    const data = response.data;
    const sets = data?.results || data?.social_sets || (Array.isArray(data) ? data : []);
    if (!Array.isArray(sets) || sets.length === 0) {
      throw new Error('No social sets found on this Typefully account');
    }
    this.socialSetId = String(sets[0].id);
    this.socialSetResolved = true;
    console.log(`  [Typefully] Auto-resolved social set ID: ${this.socialSetId}`);
    return this.socialSetId;
  }

  /**
   * Convert content string/array to v2 posts format
   */
  private contentToPosts(content: string | string[]): Array<{ text: string }> {
    if (Array.isArray(content)) {
      return content.map(text => ({ text }));
    }
    return [{ text: content }];
  }

  /**
   * Create a draft in Typefully (v2 API)
   */
  async createDraft(draft: TypefullyDraft): Promise<TypefullyDraftResponse> {
    try {
      const socialSetId = await this.resolveSocialSetId();
      const posts = this.contentToPosts(draft.content);

      const body: any = {
        platforms: {
          x: {
            enabled: true,
            posts,
          },
        },
        share: draft.share ?? true,
      };

      if (draft.schedule_date) {
        body.publish_at = draft.schedule_date;
      }

      const response = await this.client.post(
        `/social-sets/${socialSetId}/drafts`,
        body
      );
      return response.data;
    } catch (error: any) {
      const errData = error.response?.data;
      const msg = errData?.error?.message || errData?.message || error.message;
      const details = errData?.error?.details ? `: ${JSON.stringify(errData.error.details)}` : '';
      throw new Error(`Typefully API error: ${msg}${details}`);
    }
  }

  /**
   * Create a tweet thread
   */
  async createThread(tweets: string[], share = true): Promise<TypefullyDraftResponse> {
    return this.createDraft({ content: tweets, share });
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
  async getDrafts(status?: string): Promise<TypefullyDraftResponse[]> {
    try {
      const socialSetId = await this.resolveSocialSetId();
      const params = status ? { status } : {};
      const response = await this.client.get(
        `/social-sets/${socialSetId}/drafts`,
        { params }
      );
      return response.data?.drafts || response.data || [];
    } catch (error: any) {
      throw new Error(`Failed to fetch drafts: ${error.message}`);
    }
  }

  /**
   * Delete a draft
   */
  async deleteDraft(draftId: string): Promise<void> {
    try {
      const socialSetId = await this.resolveSocialSetId();
      await this.client.delete(`/social-sets/${socialSetId}/drafts/${draftId}`);
    } catch (error: any) {
      throw new Error(`Failed to delete draft: ${error.message}`);
    }
  }

  /**
   * Get account / social sets info
   */
  async getSocialSets(): Promise<any> {
    try {
      const response = await this.client.get('/social-sets');
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch social sets: ${error.message}`);
    }
  }

  /**
   * Get current user info
   */
  async getMe(): Promise<any> {
    try {
      const response = await this.client.get('/me');
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch user info: ${error.message}`);
    }
  }
}

export default TypefullyClient;
