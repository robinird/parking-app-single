import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Renvoie une réponse simple de maintenance avec un code 530 / 503
  return new NextResponse(
    `<!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="utf-8">
        <title>Maintenance</title>
        <style>
          body { font-family: system-ui, sans-serif; background: #0F172A; color: white; display: flex; height: 100vh; align-items: center; justify-content: center; margin: 0; text-align: center; }
          div { max-width: 400px; padding: 20px; }
          h1 { font-size: 1.5rem; margin-bottom: 8px; }
          p { color: #94A3B8; font-size: 0.9rem; }
        </style>
      </head>
      <body>
        <div>
          <h1>Application en maintenance</h1>
          <p>L'accès à l'application est temporairement suspendu.</p>
        </div>
      </body>
    </html>`,
    {
      status: 503,
      headers: {
        'content-type': 'text/html; charset=utf-8',
      },
    }
  );
}

// Appliquer la suspension à TOUTES les pages et routes API
export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
