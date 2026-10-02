import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full py-6 mt-8 border-t border-border/40">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <p>
          &copy; {new Date().getFullYear()} TechCorp. Tous droits réservés.
        </p>
        <div className="flex items-center gap-4 sm:gap-6">
          <Link 
            href="/mentions-legales" 
            className="hover:text-foreground transition-colors"
          >
            Mentions Légales
          </Link>
          <Link 
            href="/politique-de-confidentialite" 
            className="hover:text-foreground transition-colors"
          >
            Politique de Confidentialité
          </Link>
        </div>
      </div>
    </footer>
  );
}
