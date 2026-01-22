#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';

import {
  getContentItems,
  saveContentItem,
  updateContentStatus,
  deleteContentItem,
  getBrandVoiceProfile,
  saveBrandVoiceProfile,
  getVisualStyleProfile,
  saveVisualStyleProfile,
  type ContentItem,
  type BrandVoiceProfile,
  type VisualStyleProfile,
} from './tools/storage.js';
import { fetchDemosTweets, extractTweetImages, type Tweet } from './tools/twitter.js';
import { scheduleToTypefully, getTypefullyDrafts } from './tools/typefully.js';
import { getLinearIssues, getRecentlyShippedFeatures } from './tools/linear.js';
import { generateImage, buildDemosPrompt, estimateImageCost } from './tools/images.js';

// Load environment variables
dotenv.config({ path: '../.env' });

const server = new Server(
  {
    name: 'demos-marketing-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
const tools = [
  {
    name: 'fetch_demos_tweets',
    description: 'Fetch tweets from @DemosNetwork for brand voice learning',
    inputSchema: {
      type: 'object',
      properties: {
        count: {
          type: 'number',
          description: 'Number of tweets to fetch (default: 100)',
          default: 100,
        },
      },
    },
  },
  {
    name: 'extract_tweet_images',
    description: 'Extract image URLs from @DemosNetwork tweets for visual style learning',
    inputSchema: {
      type: 'object',
      properties: {
        count: {
          type: 'number',
          description: 'Number of tweets to scan for images (default: 50)',
          default: 50,
        },
      },
    },
  },
  {
    name: 'schedule_to_typefully',
    description: 'Schedule a tweet or thread to Typefully for posting to Twitter',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The tweet content',
        },
        threadParts: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of thread parts (for threads)',
        },
        scheduledTime: {
          type: 'string',
          description: 'ISO 8601 datetime for scheduling (optional)',
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'get_linear_issues',
    description: 'Fetch issues from Linear for content ideas',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          enum: ['completed', 'in_progress', 'all'],
          description: 'Filter by issue state',
          default: 'completed',
        },
        daysAgo: {
          type: 'number',
          description: 'Only return issues completed in last N days',
          default: 7,
        },
      },
    },
  },
  {
    name: 'generate_image',
    description: 'Generate an image using DALL-E 3 with Demos brand styling',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The image prompt (will be enhanced with Demos branding)',
        },
        style: {
          type: 'string',
          enum: ['vivid', 'natural'],
          default: 'vivid',
        },
        quality: {
          type: 'string',
          enum: ['standard', 'hd'],
          default: 'standard',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'save_content_item',
    description: 'Save a content item to the local storage',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['tweet', 'thread', 'article', 'announcement'],
        },
        status: {
          type: 'string',
          enum: ['idea', 'draft', 'review', 'scheduled', 'published'],
        },
        content: {
          type: 'string',
        },
        threadParts: {
          type: 'array',
          items: { type: 'string' },
        },
        articleBody: {
          type: 'string',
        },
        source: {
          type: 'string',
          enum: ['linear', 'trend', 'sdk-update', 'manual'],
        },
        brandScore: {
          type: 'number',
        },
        imageUrl: {
          type: 'string',
        },
      },
      required: ['type', 'status', 'content', 'source'],
    },
  },
  {
    name: 'get_content_items',
    description: 'Get all content items from local storage',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['idea', 'draft', 'review', 'scheduled', 'published'],
          description: 'Filter by status (optional)',
        },
      },
    },
  },
  {
    name: 'update_content_status',
    description: 'Update the status of a content item',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Content item ID',
        },
        status: {
          type: 'string',
          enum: ['idea', 'draft', 'review', 'scheduled', 'published'],
        },
      },
      required: ['id', 'status'],
    },
  },
  {
    name: 'get_brand_voice_profile',
    description: 'Get the learned brand voice profile',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'save_brand_voice_profile',
    description: 'Save a brand voice profile',
    inputSchema: {
      type: 'object',
      properties: {
        profile: {
          type: 'object',
          description: 'The brand voice profile object',
        },
      },
      required: ['profile'],
    },
  },
  {
    name: 'get_visual_style_profile',
    description: 'Get the learned visual style profile for image generation',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'save_visual_style_profile',
    description: 'Save a visual style profile',
    inputSchema: {
      type: 'object',
      properties: {
        profile: {
          type: 'object',
          description: 'The visual style profile object',
        },
      },
      required: ['profile'],
    },
  },
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

// Type helper for tool arguments
type ToolArgs = Record<string, any>;

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: rawArgs } = request.params;
  const args = (rawArgs || {}) as ToolArgs;

  try {
    switch (name) {
      case 'fetch_demos_tweets': {
        const rapidApiKey = process.env.RAPIDAPI_KEY;
        if (!rapidApiKey) {
          throw new Error('RAPIDAPI_KEY not configured in .env');
        }
        const tweets = await fetchDemosTweets(rapidApiKey, (args.count as number) || 100);
        return {
          content: [{ type: 'text', text: JSON.stringify(tweets, null, 2) }],
        };
      }

      case 'extract_tweet_images': {
        const rapidApiKey = process.env.RAPIDAPI_KEY;
        if (!rapidApiKey) {
          throw new Error('RAPIDAPI_KEY not configured in .env');
        }
        const imageUrls = await extractTweetImages(rapidApiKey, (args.count as number) || 50);
        return {
          content: [{ type: 'text', text: JSON.stringify(imageUrls, null, 2) }],
        };
      }

      case 'schedule_to_typefully': {
        const apiKey = process.env.TYPEFULLY_API_KEY;
        if (!apiKey) {
          throw new Error('TYPEFULLY_API_KEY not configured in .env');
        }
        const result = await scheduleToTypefully(apiKey, {
          content: args.content as string,
          threadParts: args.threadParts as string[] | undefined,
          scheduledTime: args.scheduledTime as string | undefined,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_linear_issues': {
        const apiKey = process.env.LINEAR_API_KEY;
        const teamId = process.env.LINEAR_TEAM_ID || 'DEM';
        if (!apiKey) {
          throw new Error('LINEAR_API_KEY not configured in .env');
        }

        const filter = (args.filter as string) || 'completed';
        const daysAgo = args.daysAgo as number;

        let issues;
        if (filter === 'completed' && daysAgo) {
          issues = await getRecentlyShippedFeatures(apiKey, teamId, daysAgo);
        } else {
          issues = await getLinearIssues(apiKey, teamId, filter as 'completed' | 'in_progress' | 'all');
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(issues, null, 2) }],
        };
      }

      case 'generate_image': {
        const googleApiKey = process.env.GOOGLE_AI_API_KEY;
        const openaiApiKey = process.env.OPENAI_API_KEY;

        if (!googleApiKey && !openaiApiKey) {
          throw new Error('GOOGLE_AI_API_KEY or OPENAI_API_KEY must be configured in .env');
        }

        // Load visual profile for brand-consistent styling
        const visualProfile = await getVisualStyleProfile();
        const style = (args.style as 'vivid' | 'natural') || 'vivid';
        const quality = (args.quality as 'standard' | 'hd') || 'standard';

        const result = await generateImage(
          { google: googleApiKey, openai: openaiApiKey },
          {
            prompt: args.prompt as string,
            style,
            quality,
          },
          visualProfile as any
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                url: result.url,
                generator: result.generator,
                cost: result.cost,
                usedVisualProfile: !!visualProfile,
              }, null, 2),
            },
          ],
        };
      }

      case 'save_content_item': {
        const item = await saveContentItem(args as unknown as ContentItem);
        return {
          content: [{ type: 'text', text: JSON.stringify(item, null, 2) }],
        };
      }

      case 'get_content_items': {
        let items = await getContentItems();
        if (args.status) {
          const status = args.status as string;
          items = items.filter(item => item.status === status);
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(items, null, 2) }],
        };
      }

      case 'update_content_status': {
        const item = await updateContentStatus(
          args.id as string,
          args.status as ContentItem['status']
        );
        if (!item) {
          throw new Error(`Content item not found: ${args.id}`);
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(item, null, 2) }],
        };
      }

      case 'get_brand_voice_profile': {
        const profile = await getBrandVoiceProfile();
        return {
          content: [{ type: 'text', text: JSON.stringify(profile, null, 2) }],
        };
      }

      case 'save_brand_voice_profile': {
        await saveBrandVoiceProfile(args.profile as BrandVoiceProfile);
        return {
          content: [{ type: 'text', text: 'Brand voice profile saved successfully' }],
        };
      }

      case 'get_visual_style_profile': {
        const profile = await getVisualStyleProfile();
        return {
          content: [{ type: 'text', text: JSON.stringify(profile, null, 2) }],
        };
      }

      case 'save_visual_style_profile': {
        await saveVisualStyleProfile(args.profile as VisualStyleProfile);
        return {
          content: [{ type: 'text', text: 'Visual style profile saved successfully' }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Demos Marketing MCP Server running on stdio');
}

main().catch(console.error);
