#!/usr/bin/env node
import dotenv from 'dotenv';
import AIContentGenerator, { GenerationContext } from '../content/ai-generator';
import TypefullyClient from '../integrations/typefully';

dotenv.config();

async function generateFromPrompt(prompt: string, type: string = 'tweet') {
  console.log('✍️  Generating content...\n');

  const generator = new AIContentGenerator(process.env.ANTHROPIC_API_KEY!);

  const context: GenerationContext = {
    trigger: {
      type: type as any,
      content: prompt,
    },
    demosContext: {
      recentShips: [],
      valueProp: 'Cross-chain identity and interoperability infrastructure',
    },
  };

  try {
    const generated = await generator.generate(context);

    if (!generated) {
      console.log('❌ AI decided to skip this content (not relevant enough)\n');
      return;
    }

    console.log('═══════════════════════════════════════════');
    console.log('✨ GENERATED CONTENT');
    console.log('═══════════════════════════════════════════\n');

    if (Array.isArray(generated.content)) {
      console.log(`Type: Thread (${generated.content.length} tweets)\n`);
      generated.content.forEach((tweet, i) => {
        console.log(`${i + 1}/${generated.content.length}`);
        console.log(tweet);
        console.log('');
      });
    } else {
      console.log('Type: Single tweet\n');
      console.log(generated.content);
      console.log('');
    }

    console.log(`Relevance Score: ${Math.round(generated.relevanceScore * 100)}%`);
    console.log(`Tags: ${generated.tags.join(', ') || 'none'}`);
    console.log('');

    // Ask if user wants to send to Typefully
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    readline.question('Send to Typefully? (y/n): ', async (answer: string) => {
      if (answer.toLowerCase() === 'y') {
        try {
          const typefully = new TypefullyClient(process.env.TYPEFULLY_API_KEY!);
          await typefully.createDraft({
            content: generated!.content,
            share: true,
          });
          console.log('\n✅ Sent to Typefully!\n');
        } catch (error: any) {
          console.error('\n❌ Error sending to Typefully:', error.message, '\n');
        }
      } else {
        console.log('\n👍 Draft saved locally\n');
      }
      readline.close();
    });

  } catch (error: any) {
    console.error('❌ Error generating content:', error.message);
  }
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('✍️  DEMOS CONTENT GENERATOR');
  console.log('═══════════════════════════════════════════\n');

  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: npm run generate <prompt> [type]\n');
    console.log('Types: tweet, thread, linear_task, trend, milestone\n');
    console.log('Examples:');
    console.log('  npm run generate "Just shipped Solana integration" linear_task');
    console.log('  npm run generate "Wallet fragmentation is a major UX problem" trend');
    console.log('  npm run generate "Cross-chain identity explained" thread\n');
    return;
  }

  const prompt = args[0];
  const type = args[1] || 'tweet';

  await generateFromPrompt(prompt, type);
}

main().catch(console.error);
