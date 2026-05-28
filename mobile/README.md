# AKKA ERP Mobile

Application mobile React Native / Expo pour les livreurs AKKA ERP.

## Fonctionnalités (Phase 1)

- Connexion utilisateur
- Dashboard avec statistiques du jour
- Tournée du jour avec liste des livraisons
- Détail de livraison avec articles
- Navigation GPS vers le client
- Appel client direct
- Validation de livraison
- Encaissement (espèces/chèque)
- Profil utilisateur

## Prérequis

- Node.js 18+
- npm ou yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app sur votre téléphone (iOS/Android)

## Installation

```bash
# Aller dans le dossier mobile
cd mobile

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos vraies valeurs Supabase
```

## Configuration

Créer un fichier `.env` avec :

```env
EXPO_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=votre-anon-key
```

## Lancement

```bash
# Démarrer le serveur de développement
npm start

# Ou directement sur Android
npm run android

# Ou directement sur iOS
npm run ios
```

## Structure du projet

```
mobile/
├── app/                    # Écrans (expo-router)
│   ├── (auth)/            # Écrans d'authentification
│   │   └── login.tsx
│   ├── (app)/             # Écrans de l'application
│   │   ├── home.tsx       # Dashboard
│   │   ├── tournee.tsx    # Tournée du jour
│   │   ├── livraisons/    # Liste et détail livraisons
│   │   └── profil.tsx     # Profil utilisateur
│   ├── _layout.tsx        # Layout racine
│   └── index.tsx          # Point d'entrée
├── components/            # Composants réutilisables
├── constants/             # Constantes (thème, etc.)
├── contexts/              # Contextes React (Auth)
├── hooks/                 # Hooks personnalisés
├── lib/                   # Utilitaires (Supabase)
├── types/                 # Types TypeScript
└── assets/                # Images, icônes
```

## Prochaines phases

### Phase 2 : Commerciaux
- Catalogue clients
- Prise de commandes
- Historique client

### Phase 3 : Stock
- Scan code-barres
- Consultation stock
- Réception marchandise

### Phase 4 : Avancé
- Mode hors-ligne
- Notifications push
- Dashboard avancé
