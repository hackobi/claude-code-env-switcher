import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      // Function to send status updates
      const sendUpdate = async () => {
        try {
          // Get current status from the pipeline API
          const response = await fetch(`${request.nextUrl.origin}/api/pipeline`, {
            method: 'GET',
          });
          
          if (response.ok) {
            const data = await response.json();
            const sseData = `data: ${JSON.stringify(data.status)}\n\n`;
            
            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode(sseData));
          }
        } catch (error) {
          console.error('Error sending status update:', error);
        }
      };

      // Send initial update
      sendUpdate();

      // Send updates every 1 second
      const interval = setInterval(sendUpdate, 1000);

      // Cleanup function
      const cleanup = () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch (error) {
          // Stream might already be closed
        }
      };

      // Handle client disconnect
      request.signal?.addEventListener('abort', cleanup);

      // Auto-cleanup after 10 minutes to prevent memory leaks
      setTimeout(cleanup, 10 * 60 * 1000);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}