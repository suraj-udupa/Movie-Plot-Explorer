import { NextResponse } from 'next/server';
import { streamOpenRouter } from '@/lib/openrouter/client';
import { VALIDATION_PROMPTS } from '@/lib/prompts/validation';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, history = [], movies = [] } = body;
    
    if (!message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Map movies to a simple string to send into the LLM context
    const moviesContext = movies.map((m: any) => `- ${m.title} (Rank ${m.rank}, Director: ${m.director}, Cast: ${m.cast.join(", ")})`).join('\n');

    const systemPrompt = VALIDATION_PROMPTS.conversation(
      moviesContext,
      history.map((h: any) => `${h.role}: ${h.content}`).join('\n'),
      message
    );

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...history.map((h: any) => ({ role: h.role, content: h.content })),
      { role: 'user' as const, content: message }
    ];

    (async () => {
      try {
        const aiStream = streamOpenRouter(messages);
        for await (const chunk of aiStream) {
          await writer.write(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
        }
        await writer.write(encoder.encode(`data: [DONE]\n\n`));
      } catch (err) {
        console.error("Chat Stream Error:", err);
        await writer.write(encoder.encode(`data: {"error": "Stream failed"}\n\n`));
      } finally {
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Failed to process chat' }, { status: 500 });
  }
}
