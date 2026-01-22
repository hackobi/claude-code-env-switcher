import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ParagraphPost {
  title: string;
  content: string;
  url: string;
  publishedAt: string;
  excerpt?: string;
}

/**
 * Scrapes Demos' Paragraph blog for content
 */
export class ParagraphScraper {
  private baseUrl = 'https://paragraph.com/@demos';

  /**
   * Fetch recent posts from Demos Paragraph blog
   */
  async fetchRecentPosts(maxPosts = 20): Promise<ParagraphPost[]> {
    try {
      console.log(`Fetching posts from ${this.baseUrl}...`);

      // Fetch main blog page
      const response = await axios.get(this.baseUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DemosBot/1.0)',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const posts: ParagraphPost[] = [];

      // Paragraph uses article elements or post links
      // This selector may need adjustment based on actual HTML structure
      const postElements = $('article, .post-preview, [data-testid="post-card"]').slice(0, maxPosts);

      for (let i = 0; i < postElements.length; i++) {
        const element = postElements.eq(i);

        // Extract post data (selectors may need adjustment)
        const title = element.find('h1, h2, h3, .post-title, [data-testid="post-title"]').first().text().trim();
        const url = element.find('a').first().attr('href') || '';
        const excerpt = element.find('.excerpt, .post-excerpt, p').first().text().trim();

        if (title && url) {
          const fullUrl = url.startsWith('http') ? url : `https://paragraph.com${url}`;

          posts.push({
            title,
            content: '', // Will fetch full content separately
            url: fullUrl,
            publishedAt: new Date().toISOString(), // Paragraph may have this in metadata
            excerpt,
          });
        }
      }

      // Fetch full content for each post
      const postsWithContent = await Promise.all(
        posts.map(post => this.fetchPostContent(post))
      );

      console.log(`✓ Fetched ${postsWithContent.length} posts from Paragraph`);

      return postsWithContent;
    } catch (error: any) {
      console.error('Failed to fetch Paragraph posts:', error.message);
      return [];
    }
  }

  /**
   * Fetch full content of a single post
   */
  private async fetchPostContent(post: ParagraphPost): Promise<ParagraphPost> {
    try {
      const response = await axios.get(post.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DemosBot/1.0)',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);

      // Extract main content (selector may need adjustment)
      const contentElement = $('article, .post-content, [data-testid="post-content"], main');

      // Remove script, style, nav elements
      contentElement.find('script, style, nav, header, footer').remove();

      // Get text content
      const content = contentElement.text().trim();

      // Try to extract publish date from meta tags
      const publishedAt = $('meta[property="article:published_time"]').attr('content')
        || $('time').attr('datetime')
        || post.publishedAt;

      return {
        ...post,
        content: content.substring(0, 5000), // Limit to 5000 chars
        publishedAt,
      };
    } catch (error: any) {
      console.error(`Failed to fetch content for ${post.url}:`, error.message);
      return post; // Return with excerpt only
    }
  }

  /**
   * Extract key paragraphs from blog posts
   */
  extractKeyParagraphs(posts: ParagraphPost[], paragraphsPerPost = 3): string[] {
    const paragraphs: string[] = [];

    for (const post of posts) {
      if (!post.content) continue;

      // Split into paragraphs
      const postParagraphs = post.content
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 100); // Only substantial paragraphs

      // Take first N paragraphs
      paragraphs.push(...postParagraphs.slice(0, paragraphsPerPost));
    }

    return paragraphs;
  }

  /**
   * Extract writing style patterns from blog content
   */
  analyzeWritingStyle(posts: ParagraphPost[]): {
    averagePostLength: number;
    averageParagraphLength: number;
    commonOpenings: string[];
    commonClosings: string[];
  } {
    const allContent = posts.map(p => p.content).join('\n');
    const paragraphs = allContent.split('\n').filter(p => p.trim().length > 50);

    // Calculate averages
    const totalChars = posts.reduce((sum, p) => sum + p.content.length, 0);
    const averagePostLength = totalChars / posts.length;

    const paragraphLengths = paragraphs.map(p => p.length);
    const averageParagraphLength = paragraphLengths.reduce((a, b) => a + b, 0) / paragraphLengths.length;

    // Extract common openings (first sentence patterns)
    const openings = paragraphs
      .map(p => {
        const sentences = p.split(/[.!?]/);
        return sentences[0]?.trim().substring(0, 80);
      })
      .filter(Boolean)
      .slice(0, 10);

    // Extract common closings (last sentence patterns)
    const closings = paragraphs
      .map(p => {
        const sentences = p.split(/[.!?]/).filter(Boolean);
        return sentences[sentences.length - 1]?.trim().substring(0, 80);
      })
      .filter(Boolean)
      .slice(0, 10);

    return {
      averagePostLength: Math.round(averagePostLength),
      averageParagraphLength: Math.round(averageParagraphLength),
      commonOpenings: openings,
      commonClosings: closings,
    };
  }
}

export default ParagraphScraper;
