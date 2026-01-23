/**
 * API Route: Get Ticket Statuses
 * GET /api/agents/tickets/statuses
 *
 * Returns all available ticket statuses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';
const aiServiceApiKey = process.env.AI_SERVICE_API_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function validateAuth(request: NextRequest): NextResponse | null {
  const apiKey = request.headers.get('x-ai-service-key');
  if (!apiKey || apiKey !== aiServiceApiKey) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Invalid AI service credentials' },
      { status: 401 }
    );
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const authError = validateAuth(request);
    if (authError) return authError;

    const { data, error } = await supabase
      .from('ticket_statuses')
      .select('status_id,name,description')
      .order('status_id');

    if (error) {
      return NextResponse.json(
        { success: false, error: `Database error: ${error.message}`, data: null },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error.message}`, data: null },
      { status: 500 }
    );
  }
}

