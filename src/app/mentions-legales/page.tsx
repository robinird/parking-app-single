import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Mentions Légales - TechCorp Parking',
  description: 'Mentions légales obligatoires de l\'application de gestion de parking TechCorp.',
};

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="p-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-full transition-colors inline-flex items-center justify-center" aria-label="Retour à l'accueil">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Mentions Légales</h1>
        </div>

        <div className="glass-dark border border-border/40 rounded-2xl p-6 sm:p-8 space-y-8">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">1. Éditeur du site</h2>
            <p className="text-muted-foreground leading-relaxed">
              Le présent site (Application de gestion de parking) est édité à titre non professionnel par :<br />
              <strong>Le développeur de TechCorp Parking</strong> (Personne physique)<br />
              Conformément à l'article 6, III-2 de la loi n° 2004-575 du 21 juin 2004 (LCEN), les données d'identification personnelle de l'éditeur ont été transmises à l'hébergeur du site.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">2. Directeur de la publication</h2>
            <p className="text-muted-foreground leading-relaxed">
              Le Directeur de la publication est <strong>Le développeur de TechCorp Parking</strong>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">3. Hébergement</h2>
            <p className="text-muted-foreground leading-relaxed">
              L'interface web de ce site est hébergée par :<br />
              <strong>Cloudflare, Inc.</strong><br />
              101 Townsend St, San Francisco, CA 94107, États-Unis<br />
              Site web : <a href="https://www.cloudflare.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">cloudflare.com</a>
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Les bases de données sont hébergées par :<br />
              <strong>ChiselStrike Inc. (Turso)</strong><br />
              Siège social : États-Unis (Serveurs situés en Europe)<br />
              Site web : <a href="https://turso.tech" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">turso.tech</a>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">4. Propriété intellectuelle</h2>
            <p className="text-muted-foreground leading-relaxed">
              L'ensemble de ce site relève de la législation française et internationale sur le droit d'auteur 
              et la propriété intellectuelle. Tous les droits de reproduction sont réservés, y compris pour 
              les documents téléchargeables et les représentations iconographiques et photographiques.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">5. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pour toute question ou demande d'information concernant le site, vous pouvez nous contacter :<br />
              Par email : <a href="mailto:contact@techcorp.com" className="text-primary hover:underline">contact@techcorp.com</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}