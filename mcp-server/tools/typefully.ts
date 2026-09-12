import axios from 'axios';

const TYPEFULLY_API_BASE = 'https://api.typefully.com/v2';

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

async function getSocialSetId(apiKey: string): Promise<string> {
  const response = await axios.get(`${TYPEFULLY_API_BASE}/social-sets`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });
  const data = response.data;
  const sets = data?.results || data?.social_sets || (Array.isArray(data) ? data : []);
  if (!Array.isArray(sets) || sets.length === 0) {
    throw new Error('No social sets found on Typefully account');
  }
  return String(sets[0].id);
}

export async function scheduleToTypefully(
  apiKey: string,
  draft: TypefullyDraft
): Promise<TypefullyResponse> {
  if (!apiKey) {
    throw new Error('TYPEFULLY_API_KEY is required');
  }

  try {
    const socialSetId = await getSocialSetId(apiKey);

    const posts = draft.threadParts
      ? draft.threadParts.map(text => ({ text }))
      : [{ text: draft.content }];

    const payload: any = {
      platforms: {
        x: {
          enabled: true,
          posts,
        },
      },
    };

    if (draft.scheduledTime) {
      payload.publish_at = draft.scheduledTime;
    }

    const response = await axios.post(
      `${TYPEFULLY_API_BASE}/social-sets/${socialSetId}/drafts`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      id: response.data.id,
      status: response.data.status || 'draft',
      scheduledTime: response.data.scheduled_date,
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
    const socialSetId = await getSocialSetId(apiKey);
    const response = await axios.get(
      `${TYPEFULLY_API_BASE}/social-sets/${socialSetId}/drafts`,
      {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      }
    );

    return response.data?.drafts || response.data || [];
  } catch (error: any) {
    throw new Error(`Failed to get Typefully drafts: ${error.message}`);
  }
}
