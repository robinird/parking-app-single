import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  updateAdminConfig,
  getAdminConfig,
  syncBranches,
  syncBenches,
  checkRateLimit,
  recordFailedAttempt,
  resetFailedAttempts
} from '@/lib/db';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// --- Schémas Zod de validation ---
const BranchSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Le nom de la branche est requis'),
  capacity: z.number().int().nonnegative().optional(),
});

const BenchSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Le nom du bench est requis'),
  branchId: z.string().min(1, 'La branche parente est requise'),
  capacity: z.number().int().nonnegative().optional(),
  token: z.string().optional(),
  qrCodeToken: z.string().optional(),
});

const ConfigBodySchema = z.object({
  totalSpaces: z.number({ required_error: 'totalSpaces est requis', invalid_type_error: 'totalSpaces doit être un nombre' }).int().nonnegative('totalSpaces doit être positif ou nul'),
  branches: z.array(BranchSchema).optional(),
  benches: z.array(BenchSchema).optional(),
  password: z.string().optional(),
});

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
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';

    if (await checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Accès bloqué pendant 5 heures.' },
        { status: 429 }
      );
    }

    const authHeader = request.headers.get('Authorization');
    const expectedPassword = process.env.ADMIN_PASSWORD ?? '';
    const providedPassword = (authHeader?.replace('Bearer ', '') ?? '').trim();

    if (!expectedPassword || !timingSafeEquals(providedPassword, expectedPassword.trim())) {
      await recordFailedAttempt(ip);
      return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 401 });
    }

    await resetFailedAttempts(ip);

    const config = await getAdminConfig();
    return NextResponse.json(config, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });
  } catch (error) {
    console.error('Erreur GET admin/config :', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';

    if (await checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Accès bloqué pendant 5 heures.' },
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

    const parsed = ConfigBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { password, totalSpaces, branches, benches } = parsed.data;

    const authHeader = request.headers.get('Authorization');
    const expectedPassword = process.env.ADMIN_PASSWORD ?? '';
    const providedPassword = ((password || authHeader?.replace('Bearer ', '')) ?? '').trim();

    if (!expectedPassword || !timingSafeEquals(providedPassword, expectedPassword.trim())) {
      await recordFailedAttempt(ip);
      return NextResponse.json(
        { error: 'Mot de passe administrateur incorrect ou manquant.' },
        { status: 401 }
      );
    }

    await resetFailedAttempts(ip);

    // 1. Sauvegarde de la configuration principale avec UPSERT garanti
    await updateAdminConfig(totalSpaces);

    // 2. Ordre strict (Contraintes FK) : suppression enfants -> parents, puis insertion parents -> enfants
    if (Array.isArray(benches)) {
      await syncBenches(benches, true);    // Suppression benches orphelins
    }
    if (Array.isArray(branches)) {
      await syncBranches(branches, true);  // Suppression branches orphelines
    }
    if (Array.isArray(branches)) {
      await syncBranches(branches, false); // Insertion/update branches
    }
    if (Array.isArray(benches)) {
      await syncBenches(benches, false);   // Insertion/update benches
    }

    return NextResponse.json({ success: true, totalSpaces }, { status: 200 });
  } catch (error) {
    console.error('Erreur POST admin/config :', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la mise à jour de la configuration.' },
      { status: 500 }
    );
  }
}