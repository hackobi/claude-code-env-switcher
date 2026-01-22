import axios from 'axios';

const TYPEFULLY_API_BASE = 'https://api.typefully.com/v1';

export interface TypefullyDraft {
  content: string;
  threadParts?: string[];
  scheduledTime?: string;
}

export interface TypefullyResponse {
  id: string;
  status: string;
  scheduledTime?: string;
}

export async function scheduleToTypefully(
  apiKey: string,
  draft: TypefullyDraft
): Promise<TypefullyResponse> {
  if (!apiKey) {
    throw new Error('TYPEFULLY_API_KEY is required');
  }

  try {
    // For threads, join with double newlines
    const content = draft.threadParts
      ? draft.threadParts.join('\n\n')
      : draft.content;

    const payload: any = {
      content,
      threadify: !!draft.threadParts,
    };

    if (draft.scheduledTime) {
      payload.schedule_date = draft.scheduledTime;
    }

    const response = await axios.post(
      `${TYPEFULLY_API_BASE}/drafts/`,
      payload,
      {
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      id: response.data.id,
      status: response.data.status || 'scheduled',
      scheduledTime: response.data.schedule_date,
    };
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error('Invalid Typefully API key');
    }
    if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded');
    }
    throw new Error(`Failed to schedule to Typefully: ${error.message}`);
  }
}

export async function getTypefullyDrafts(apiKey: string): Promise<any[]> {
  if (!apiKey) {
    throw new Error('TYPEFULLY_API_KEY is required');
  }

  try {
    const response = await axios.get(`${TYPEFULLY_API_BASE}/drafts/`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    return response.data || [];
  } catch (error: any) {
    throw new Error(`Failed to get Typefully drafts: ${error.message}`);
  }
}
