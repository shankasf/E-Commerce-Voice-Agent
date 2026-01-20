// API Route to create a contact for a requester
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { headers: { Authorization: `Bearer ${supabaseServiceKey}` } }
});

export async function POST(request: NextRequest) {
  try {
    const { fullName, email, organizationId } = await request.json();

    console.log('[Create Contact] Request:', { fullName, email, organizationId });

    if (!fullName || !email || !organizationId) {
      console.error('[Create Contact] Missing fields:', { fullName: !!fullName, email: !!email, organizationId: !!organizationId });
      return NextResponse.json(
        { success: false, error: 'Full name, email, and organization ID are required' },
        { status: 400 }
      );
    }

    // Check if contact already exists with this email
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('contact_id, full_name, email, organization_id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existingContact) {
      // Return existing contact
      return NextResponse.json({
        success: true,
        contact: {
          contact_id: existingContact.contact_id,
          full_name: existingContact.full_name,
          email: existingContact.email,
          organization_id: existingContact.organization_id,
        },
        isExisting: true,
      });
    }

    // Create new contact
    const { data: newContact, error } = await supabase
      .from('contacts')
      .insert({
        full_name: fullName.trim(),
        email: email.toLowerCase().trim(),
        organization_id: organizationId,
      })
      .select('contact_id, full_name, email, organization_id')
      .single();

    if (error) {
      console.error('[Create Contact] Database error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to create contact profile',
          details: error.message || 'Unknown error'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      contact: {
        contact_id: newContact.contact_id,
        full_name: newContact.full_name,
        email: newContact.email,
        organization_id: newContact.organization_id,
      },
      isExisting: false,
    });
  } catch (error) {
    console.error('Error in create-contact:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while creating contact' },
      { status: 500 }
    );
  }
}
