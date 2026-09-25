import { NextRequest, NextResponse } from 'next/server';
import { getFullAppState, getUserById } from '@/lib/db';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const COOKIE_NAME = 'session_user_id';

export async function GET(request: NextRequest) {
  try {
    // Protection de la vie privée : vérification de la session avant de retourner les données
    const userId = request.cookies.get(COOKIE_NAME)?.value;

    // Récupérer l'état complet du parking (places, branches, utilisateurs)
    const state = await getFullAppState();

    if (!userId) {
      // 401 mais on renvoie la config (branches/benches) pour que le formulaire de login puisse s'afficher
      return NextResponse.json(
        { 
          error: 'Non authentifié. Veuillez vous connecter pour accéder à cet espace.',
          branches: state.branches,
          benches: state.benches,
          totalSpaces: state.totalSpaces,
          users: [] // on masque les utilisateurs !
        },
        { status: 401 }
      );
    }

    // Récupérer l'utilisateur courant depuis la base pour s'assurer de sa validité
    const currentUser = await getUserById(userId);

    if (!currentUser) {
      // Cookie présent mais l'utilisateur n'existe plus en base -> invalider le cookie
      const response = NextResponse.json(
        { 
          error: 'Session expirée ou utilisateur introuvable. Veuillez vous reconnecter.',
          branches: state.branches,
          benches: state.benches,
          totalSpaces: state.totalSpaces,
          users: []
        },
        { status: 401 }
      );
      response.cookies.delete(COOKIE_NAME);
      return response;
    }

    // Retourner l'état complet et l'utilisateur connecté avec Cache-Control explicite
    return NextResponse.json({ ...state, currentUser }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'état :", error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération des données.' },
      { status: 500 }
    );
  }
}