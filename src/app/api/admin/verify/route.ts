import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, recordFailedAttempt, resetFailedAttempts } from '@/lib/db';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Comparaison à temps constant pour prévenir les timing attacks
function timingSafeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';

    // Vérification du blocage anti-bot (5 heures)
    if (await checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Trop de tentatives. Accès bloqué pendant 5 heures.' },
        { status: 429 }
      );
    }

    const adminCode = request.headers.get('x-admin-code')?.trim() ?? '';
    const expectedPassword = (process.env.ADMIN_PASSWORD || process.env.ADMIN_CODE)?.trim() ?? '';

    // Comparaison à temps constant (protection contre les timing attacks)
    if (adminCode && expectedPassword && timingSafeEquals(adminCode, expectedPassword)) {
      await resetFailedAttempts(ip);
      return NextResponse.json({ success: true, valid: true });
    }

    await recordFailedAttempt(ip);
    return NextResponse.json({ success: false, valid: false, error: 'Code incorrect' }, { status: 401 });
  } catch (error) {
    console.error('Error in POST /api/admin/verify:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
