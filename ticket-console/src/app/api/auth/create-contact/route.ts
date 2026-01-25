// API Route to create a contact for a requester
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer as supabase } from '@/lib/supabase-server';

// Input validation helpers
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\d\s\-+()]{7,20}$/;
const MAX_NAME_LENGTH = 255;
const MIN_NAME_LENGTH = 2;

export async function POST(request: NextRequest) {
  try {
    const { fullName, email, organizationId, phone } = await request.json();

    // Required field validation
    if (!fullName || !email || !organizationId) {
      return NextResponse.json(
        { success: false, error: 'Full name, email, and organization ID are required' },
        { status: 400 }
      );
    }

    // Type validation
    if (typeof fullName !== 'string' || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid input types' },
        { status: 400 }
      );
    }

    // Name length validation
    const trimmedName = fullName.trim();
    if (trimmedName.length < MIN_NAME_LENGTH || trimmedName.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters` },
        { status: 400 }
      );
    }

    // Email format validation
    const trimmedEmail = email.toLowerCase().trim();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Organization ID validation
    const orgId = typeof organizationId === 'string' ? parseInt(organizationId, 10) : organizationId;
    if (typeof orgId !== 'number' || isNaN(orgId) || orgId <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid organization ID' },
        { status: 400 }
      );
    }

    // Phone validation (if provided)
    if (phone && typeof phone === 'string' && phone.trim()) {
      if (!PHONE_REGEX.test(phone.trim())) {
        return NextResponse.json(
          { success: false, error: 'Invalid phone number format' },
          { status: 400 }
        );
      }
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
