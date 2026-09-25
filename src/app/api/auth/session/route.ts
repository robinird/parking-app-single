import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserById, upsertUser, checkRateLimit, recordFailedAttempt, resetFailedAttempts } from '@/lib/db';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const COOKIE_NAME = 'session_user_id';

// --- Schéma Zod de validation ---
const SessionBodySchema = z.object({
  companyCode: z.string({ required_error: 'companyCode est requis' }).min(1, 'companyCode ne peut pas être vide'),
  userId: z.string().optional(),
  firstName: z.string().min(1, 'Le prénom est requis').optional(),
  lastName: z.string().min(1, 'Le nom est requis').optional(),
  benchId: z.string().min(1, 'Le bench est requis').optional(),
}).refine(
  (data) => data.userId || (data.firstName && data.lastName && data.benchId),
  { message: 'userId ou (firstName, lastName, benchId) sont requis', path: ['userId'] }
);

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

export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get(COOKIE_NAME)?.value;

    if (!userId) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const user = await getUserById(userId);

    if (!user) {
      const response = NextResponse.json({ user: null }, { status: 200 });
      response.cookies.delete(COOKIE_NAME);
      return response;
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la lecture de la session :', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la vérification de la session.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // --- Rate Limiting anti-bruteforce sur le COMPANY_CODE ---
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';

    if (await checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Trop de tentatives de connexion. Accès bloqué pendant 5 heures.' },
        { status: 429 }
      );
    }

    // --- Parsing & Validation Zod ---
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Corps de requête JSON invalide.' }, { status: 400 });
    }

    const parsed = SessionBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { userId, firstName, lastName, benchId, companyCode } = parsed.data;
    const expectedCompanyCode = process.env.COMPANY_CODE;

    // Comparaison à temps constant (protection contre les timing attacks)
    if (!expectedCompanyCode || !timingSafeEquals(companyCode.trim(), expectedCompanyCode.trim())) {
      await recordFailedAttempt(ip);
      return NextResponse.json(
        { error: 'Code entreprise invalide.' },
        { status: 401 }
      );
    }

    // Code valide -> réinitialiser le compteur d'échecs
    await resetFailedAttempts(ip);

    let targetUserId = userId;

    if (!targetUserId) {
      // firstName, lastName, benchId sont garantis non-undefined ici par le schéma Zod (refine)
      const cleanFirstName = firstName!.trim().toLowerCase().replace(/\s+/g, '-');
      const cleanLastName = lastName!.trim().toLowerCase().replace(/\s+/g, '-');
      targetUserId = `usr_${cleanFirstName}_${cleanLastName}_${benchId!.trim()}`;

      await upsertUser({
        id: targetUserId,
        firstName: firstName!.trim(),
        lastName: lastName!.trim(),
        benchId: benchId!.trim(),
      });
    }

    const user = await getUserById(targetUserId);

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur introuvable.' },
        { status: 404 }
      );
    }

    const response = NextResponse.json({ success: true, user });

    response.cookies.set({
      name: COOKIE_NAME,
      value: user.id,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 jours
    });

    return response;
  } catch (error) {
    console.error('Erreur lors de la création de la session :', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la création de la session.' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const response = NextResponse.json({ success: true });
    response.cookies.delete(COOKIE_NAME);
    return response;
  } catch (error) {
    console.error('Erreur lors de la déconnexion :', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la fermeture de la session.' },
      { status: 500 }
    );
  }
}