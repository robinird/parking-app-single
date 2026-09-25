import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

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
  // Protection de l'endpoint d'initialisation par un secret dédié
  const initSecret = request.headers.get('x-init-secret');
  const expectedSecret = process.env.INIT_DB_SECRET;

  if (!expectedSecret || !initSecret || !timingSafeEquals(initSecret, expectedSecret)) {
    return NextResponse.json(
      { success: false, error: 'Accès non autorisé.' },
      { status: 401 }
    );
  }

  const db = getDbClient();

  try {
    // Seed minimal Single-Tenant : uniquement admin_config
    await db.execute(`
      INSERT OR IGNORE INTO admin_config (key, value) VALUES ('total_spaces', '50');
    `);

    return NextResponse.json({
      success: true,
      message: "Base Turso initialisée (admin_config seedée).",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}