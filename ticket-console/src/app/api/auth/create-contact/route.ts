// API Route to create a contact for a requester
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { headers: { Authorization: `Bearer ${supabaseServiceKey}` } }
});

export async function POST(request: NextRequest) {
  try {
    const { fullName, email, organizationId, phone } = await request.json();

    if (!fullName || !email || !organizationId) {
      return NextResponse.json(
        { success: false, error: 'Full name, email, and organization ID are required' },
        { status: 400 }
      );
    }

    // Check if contact already exists with this email in the organization
    // Email must be unique per organization
    const { data: existingByEmail, error: emailCheckError } = await supabase
      .from('contacts')
      .select('contact_id, full_name, email, organization_id, phone')
      .eq('organization_id', organizationId)
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (emailCheckError && emailCheckError.code !== 'PGRST116') {
      console.error('[Create Contact] Email check error:', emailCheckError);
      return NextResponse.json(
        { success: false, error: 'Database error while checking email' },
        { status: 500 }
      );
    }

    if (existingByEmail) {
      console.log('[Create Contact] Found existing contact with email:', existingByEmail.email);
      // Return existing contact
      return NextResponse.json({
        success: true,
        contact: {
          contact_id: existingByEmail.contact_id,
          full_name: existingByEmail.full_name,
          email: existingByEmail.email,
          organization_id: existingByEmail.organization_id,
        },
        isExisting: true,
        message: 'Contact with this email already exists',
      });
    }

    // If phone is provided, check if it already exists in the organization
    // Phone must be unique per organization
    if (phone && phone.trim()) {
      const { data: existingByPhone, error: phoneCheckError } = await supabase
        .from('contacts')
        .select('contact_id, full_name, email, organization_id, phone')
        .eq('organization_id', organizationId)
        .eq('phone', phone.trim())
        .maybeSingle();

      if (phoneCheckError && phoneCheckError.code !== 'PGRST116') {
        console.error('[Create Contact] Phone check error:', phoneCheckError);
        return NextResponse.json(
          { success: false, error: 'Database error while checking phone' },
          { status: 500 }
        );
      }

      if (existingByPhone) {
        console.log('[Create Contact] Found existing contact with phone:', existingByPhone.phone);
        // Return existing contact
        return NextResponse.json({
          success: true,
          contact: {
            contact_id: existingByPhone.contact_id,
            full_name: existingByPhone.full_name,
            email: existingByPhone.email,
            organization_id: existingByPhone.organization_id,
          },
          isExisting: true,
          message: 'Contact with this phone number already exists',
        });
      }
    }

    // Create new contact
    const contactData: any = {
      full_name: fullName.trim(),
      email: email.toLowerCase().trim(),
      organization_id: organizationId,
    };

    // Add phone if provided
    if (phone && phone.trim()) {
      contactData.phone = phone.trim();
    }

    const { data: newContact, error } = await supabase
      .from('contacts')
      .insert(contactData)
      .select('contact_id, full_name, email, organization_id, phone')
      .single();

    if (error) {
      console.error('Error creating contact:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create contact profile' },
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
