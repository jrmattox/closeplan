import { NextResponse } from 'next/server';
import { hashPassword } from "@/lib/auth/password"
import { prisma } from "@/lib/prisma"
import { Prisma } from '@prisma/client'

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, password } = body;

    // Validate input
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'Email already registered' },
        { status: 400 }
      );
    }

    // Create tenant first
    const tenant = await prisma.tenant.create({
      data: {
        name: `${firstName}'s Organization`,
      }
    });

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user with tenant
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        tenantId: tenant.id,
        name: `${firstName} ${lastName}`, // Required by NextAuth
      },
    });

    // Log security event
    await prisma.securityEvent.create({
      data: {
        type: 'USER_CREATED',
        tenantId: tenant.id,
        details: {
          userId: user.id,
          email: user.email,
          timestamp: new Date(),
        },
      },
    });

    return NextResponse.json(
      { message: 'Account created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);

    // Handle specific Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { message: 'Email already exists' },
          { status: 400 }
        );
      }
    }

    // Log security event for failed signup
    try {
      await prisma.securityEvent.create({
        data: {
          type: 'SIGNUP_FAILED',
          tenantId: 'system', // System-level event
          details: {
            error: error.message,
            timestamp: new Date(),
          },
        },
      });
    } catch (logError) {
      console.error('Failed to log security event:', logError);
    }

    return NextResponse.json(
      { message: 'Failed to create account' },
      { status: 500 }
    );
  }
}
