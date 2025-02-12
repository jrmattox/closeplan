import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'Database connected' });
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
