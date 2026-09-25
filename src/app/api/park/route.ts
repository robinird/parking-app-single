import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDbClient, setUserParkedStatus } from '@/lib/db';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const COOKIE_NAME = 'session_user_id';

// --- Schéma Zod de validation ---
const ParkBodySchema = z.object({
  isParked: z.boolean({ required_error: 'isParked est requis', invalid_type_error: 'isParked doit être un booléen' }),
  token: z.string().optional(),
  userId: z.string().optional(), // Uniquement utilisé par les admins (vérifié côté route)
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

export async function POST(request: NextRequest) {
  try {
    // --- Parsing & Validation Zod ---
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Corps de requête JSON invalide.' }, { status: 400 });
    }

    const parsed = ParkBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { isParked, token, userId: bodyUserId } = parsed.data;

    // CORRECTION IDOR CRITIQUE :
    // L'userId est TOUJOURS lu depuis le cookie de session (contrôlé par le serveur).
    // La modification d'un autre utilisateur (Force Unpark admin) exige une vérification
    // du mot de passe administrateur transmis en en-tête Authorization.
    const sessionUserId = request.cookies.get(COOKIE_NAME)?.value;

    let userId: string;

    if (bodyUserId && bodyUserId !== sessionUserId) {
      // Tentative de modification d'un tiers -> vérification admin obligatoire
      const authHeader = request.headers.get('Authorization');
      const expectedPassword = process.env.ADMIN_PASSWORD;
      const providedPassword = authHeader?.replace('Bearer ', '') ?? '';

      if (!expectedPassword || !timingSafeEquals(providedPassword, expectedPassword)) {
        return NextResponse.json(
          { error: "Non autorisé. Seul un administrateur peut modifier le statut d'un tiers." },
          { status: 403 }
        );
      }
      userId = bodyUserId;
    } else {
      // Cas standard : l'utilisateur modifie son propre statut
      if (!sessionUserId) {
        return NextResponse.json(
          { error: 'Non authentifié. Veuillez vous connecter.' },
          { status: 401 }
        );
      }
      userId = sessionUserId;
    }

    // Validation du token QR Code (optionnel)
    if (token) {
      const expectedQrToken = process.env.QR_CODE_TOKEN;
      if (expectedQrToken && !timingSafeEquals(token, expectedQrToken)) {
        return NextResponse.json(
          { error: 'Le QR Code scanné est invalide ou expiré.' },
          { status: 403 }
        );
      }
    }

    const client = getDbClient();

    // Transaction SQL atomique
    const tx = await client.transaction('write');

    try {
      const configRes = await tx.execute({
        sql: "SELECT value FROM admin_config WHERE key = 'total_spaces'",
        args: [],
      });
      const totalSpaces = configRes.rows.length > 0
        ? Number(configRes.rows[0].value) || 50
        : 50;

      const parkedRes = await tx.execute(
        'SELECT COUNT(*) as count FROM users WHERE is_parked = 1'
      );
      const parkedCount = Number(parkedRes.rows[0].count);

      const userRes = await tx.execute({
        sql: 'SELECT is_parked FROM users WHERE id = ?',
        args: [userId],
      });

      if (userRes.rows.length === 0) {
        await tx.rollback();
        return NextResponse.json(
          { error: 'Utilisateur introuvable en base de données.' },
          { status: 404 }
        );
      }

      const userCurrentlyParked = Boolean(userRes.rows[0].is_parked);

      if (isParked === userCurrentlyParked) {
        await tx.rollback();
        return NextResponse.json(
          { error: 'Votre état est déjà à jour.' },
          { status: 400 }
        );
      }

      if (isParked && !userCurrentlyParked) {
        if (parkedCount >= totalSpaces) {
          await tx.rollback();
          return NextResponse.json(
            { error: 'Le parking est complet. Aucune place disponible.' },
            { status: 403 }
          );
        }
      }

      await setUserParkedStatus(userId, isParked, tx);
      await tx.commit();

      return NextResponse.json({ success: true, isParked }, { status: 200 });
    } catch (transactionError) {
      await tx.rollback();
      throw transactionError;
    }
  } catch (error) {
    console.error("Erreur lors de l'action de parking :", error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la mise à jour de la place.' },
      { status: 500 }
    );
  }
}