import axios from 'axios';

const RAPIDAPI_HOST = 'twitter-api45.p.rapidapi.com';

export interface TweetMedia {
  url: string;
  type: 'photo' | 'video' | 'animated_gif';
  width?: number;
  height?: number;
}

export interface Tweet {
  id: string;
  text: string;
  createdAt: string;
  favorites: number;
  retweets: number;
  views?: string;
  media?: TweetMedia[];
}

export async function fetchDemosTweets(
  rapidApiKey: string,
  count: number = 100
): Promise<Tweet[]> {
  if (!rapidApiKey) {
    throw new Error('RAPIDAPI_KEY is required');
  }

  try {
    const response = await axios.get(
      `https://${RAPIDAPI_HOST}/timeline.php`,
      {
        params: {
          screenname: 'DemosNetwork',
        },
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': RAPIDAPI_HOST,
        },
      }
    );

    const timeline = response.data?.timeline || [];

    return timeline.slice(0, count).map((tweet: any) => {
      // Extract media from the response structure
      const media: TweetMedia[] = [];

      if (tweet.media?.photo) {
        for (const photo of tweet.media.photo) {
          media.push({
            url: photo.media_url_https,
            type: 'photo',
            width: photo.sizes?.w,
            height: photo.sizes?.h,
          });
        }
      }

      if (tweet.media?.video) {
        for (const video of tweet.media.video) {
          media.push({
            url: video.media_url_https || video.url,
            type: 'video',
          });
        }
      }

      return {
        id: tweet.tweet_id || tweet.id,
        text: tweet.text || tweet.full_text || '',
        createdAt: tweet.created_at || new Date().toISOString(),
        favorites: tweet.favorites || 0,
        retweets: tweet.retweets || 0,
        views: tweet.views,
        media: media.length > 0 ? media : undefined,
      };
    });
  } catch (error: any) {
    if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (error.response?.status === 401) {
      throw new Error('Invalid RapidAPI key');
    }
    throw new Error(`Failed to fetch tweets: ${error.message}`);
  }
}

export async function extractTweetImages(
  rapidApiKey: string,
  count: number = 50
): Promise<string[]> {
  const tweets = await fetchDemosTweets(rapidApiKey, count);
  const imageUrls: string[] = [];

  for (const tweet of tweets) {
    if (tweet.media) {
      for (const media of tweet.media) {
        if (media.type === 'photo' && media.url) {
          imageUrls.push(media.url);
        }
      }
    }
  }

  return imageUrls;
}
