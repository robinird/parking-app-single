import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Politique de Confidentialité - TechCorp Parking',
  description: 'Politique de confidentialité et traitement des données RGPD de l\'application TechCorp Parking.',
};

export default function PolitiqueConfidentialite() {
  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="p-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-full transition-colors inline-flex items-center justify-center" aria-label="Retour à l'accueil">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Politique de Confidentialité</h1>
        </div>

        <div className="glass-dark border border-border/40 rounded-2xl p-6 sm:p-8 space-y-8">
          <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl">
            <p className="text-sm text-primary font-medium">
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">1. Préambule</h2>
            <p className="text-muted-foreground leading-relaxed">
              Dans le cadre de l'utilisation de cette application de gestion de stationnement, 
              le développeur de TechCorp Parking est amené à collecter et traiter certaines de vos données à caractère personnel. 
              Cette politique vise à vous informer de manière transparente sur l'usage de vos données 
              conformément au Règlement Général sur la Protection des Données (RGPD).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">2. Données collectées</h2>
            <p className="text-muted-foreground leading-relaxed">
              La collecte de données est limitée au strict nécessaire (minimisation des données). 
              Les données traitées sont les suivantes :
            </p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li><strong>Données d'identification :</strong> Prénom, Nom.</li>
              <li><strong>Données d'organisation :</strong> Équipe / Bench d'appartenance.</li>
              <li><strong>Données d'usage :</strong> Statut de stationnement en temps réel (garé ou non).</li>
              <li><strong>Données de sécurité :</strong> Adresse IP (uniquement pour prévenir les attaques par force brute sur l'accès administrateur et de connexion).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">3. Finalité du traitement</h2>
            <p className="text-muted-foreground leading-relaxed">
              Vos données sont collectées pour les finalités exclusives suivantes :
            </p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>Permettre l'attribution et la libération des places de parking en temps réel.</li>
              <li>Afficher la disponibilité des places par équipe (Bench) et par branche.</li>
              <li>Assurer la sécurité de l'application technique contre les accès non autorisés (Rate-Limiting).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">4. Durée de conservation</h2>
            <p className="text-muted-foreground leading-relaxed">
              Les durées de conservation de vos données sont proportionnées aux finalités :
            </p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li><strong>Session de connexion :</strong> Le cookie de session permettant de vous identifier est conservé 30 jours sur votre appareil.</li>
              <li><strong>Statut de stationnement :</strong> Conservé uniquement tant que vous êtes enregistré dans le système. Les données peuvent être supprimées manuellement par un administrateur.</li>
              <li><strong>Adresses IP (Sécurité) :</strong> Conservées temporairement pour une durée maximale de 5 heures en cas d'échecs de connexion répétés.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">5. Exercice de vos droits (RGPD)</h2>
            <p className="text-muted-foreground leading-relaxed">
              Conformément à la réglementation applicable en matière de protection des données, vous disposez des droits suivants :
            </p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>Droit d'accès et de rectification de vos données.</li>
              <li>Droit à l'effacement (« droit à l'oubli ») de votre profil du système de parking.</li>
              <li>Droit d'opposition et de limitation du traitement.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Pour exercer ces droits, vous pouvez contacter directement l'administrateur du site à l'adresse suivante :<br />
              <a href="mailto:contact.techcorpparking@gmail.com" className="text-primary hover:underline font-medium">contact.techcorpparking@gmail.com</a>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-primary">6. Sécurité des données</h2>
            <p className="text-muted-foreground leading-relaxed">
              Des mesures techniques et organisationnelles appropriées sont mises en œuvre pour 
              garantir la sécurité et la confidentialité de vos données contre la destruction, la perte, 
              l'altération, la divulgation non autorisée ou l'accès illicite.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
