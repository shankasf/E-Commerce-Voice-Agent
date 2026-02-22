import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { fullName, email, organizationId } = await request.json();

    if (!fullName || !email || !organizationId) {
      return NextResponse.json(
        { success: false, error: 'Full name, email, and organization ID are required' },
        { status: 400 }
      );
    }

    // Check if contact already exists with this email
    const existingContact = await queryOne(
      `SELECT contact_id, full_name, email, organization_id FROM contacts WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (existingContact) {
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
    const newContact = await queryOne(
      `INSERT INTO contacts (full_name, email, organization_id)
      VALUES ($1, $2, $3)
      RETURNING contact_id, full_name, email, organization_id`,
      [fullName.trim(), email.toLowerCase().trim(), organizationId]
    );

    if (!newContact) {
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
