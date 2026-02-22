import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { ueCode } = await request.json();

    if (!ueCode) {
      return NextResponse.json(
        { success: false, error: 'U&E code is required' },
        { status: 400 }
      );
    }

    const org = await queryOne(
      `SELECT o.organization_id, o.name, o.u_e_code,
        json_build_object('manager_id', am.manager_id, 'full_name', am.full_name, 'email', am.email, 'phone', am.phone) as manager
      FROM organizations o
      LEFT JOIN account_managers am ON o.manager_id = am.manager_id
      WHERE o.u_e_code = $1`,
      [ueCode]
    );

    if (!org) {
      return NextResponse.json({
        success: false,
        error: "I'm sorry, I could not find that U E code in our system. Please contact your organization administrator to get your U E code and come back again. Thank you."
      }, { status: 404 });
    }

    const manager = org.manager || {};

    return NextResponse.json({
      success: true,
      organization: {
        organization_id: org.organization_id,
        name: org.name,
        u_e_code: org.u_e_code,
      },
      manager: {
        name: manager.full_name || 'Not Assigned',
        email: manager.email || 'N/A',
        phone: manager.phone || 'N/A',
      }
    });
  } catch (error) {
    console.error('Error validating U&E code:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while validating U&E code' },
      { status: 500 }
    );
  }
}
