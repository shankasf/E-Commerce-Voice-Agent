import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb';
import { AdminUser } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'callsphere-admin-secret-change-in-production';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Initialize default admin from env vars if not exists
async function ensureDefaultAdmin() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;

  const existing = await AdminUser.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (!existing) {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await AdminUser.create({
      email: ADMIN_EMAIL.toLowerCase(),
      passwordHash,
      name: 'Admin',
      role: 'admin',
    });
    console.log('Default admin user created from env vars');
  }
}

// POST /api/admin/auth - Login
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    await ensureDefaultAdmin();

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const admin = await AdminUser.findOne({ email: email.toLowerCase() });
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, admin.passwordHash);
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update last login
    await AdminUser.findByIdAndUpdate(admin._id, { lastLogin: new Date() });

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: admin._id.toString(),
        email: admin.email,
        role: admin.role,
        name: admin.name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const response = NextResponse.json({
      success: true,
      user: {
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });

    // Set HTTP-only cookie
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/auth - Logout
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  
  response.cookies.set('admin_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });

  return response;
}

// GET /api/admin/auth - Check auth status
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;

    if (!token) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      role: string;
      name: string;
    };

    return NextResponse.json({
      authenticated: true,
      user: {
        email: decoded.email,
        name: decoded.name,
        role: decoded.role,
      },
    });
  } catch {
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  }
}
