import { NextResponse } from 'next/server';
import { ValidatePlotInputSchema } from '@/lib/schemas/validation';
import { validationGraph } from '@/lib/graph';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const parsed = ValidatePlotInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { plot } = parsed.data;

    console.log(`Starting movie match sequence for plot...`);
    const finalState = await validationGraph.invoke({
      plot,
    });

    if (!finalState.finalResult) {
      throw new Error('Graph execution failed');
    }

    return NextResponse.json({
      success: true,
      data: finalState.finalResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Match error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process matching',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
