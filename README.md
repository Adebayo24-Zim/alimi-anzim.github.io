# DAYFLOW

Application web responsive de planification quotidienne, en français, développée en HTML, CSS et JavaScript natifs.

## Lancer l'application

1. Décompressez l'archive.
2. Ouvrez `DAYFLOW/index.html` dans un navigateur moderne.
3. Pour installer la PWA et utiliser le cache hors ligne, publiez le dossier sur GitHub Pages ou servez-le en HTTPS / serveur local.

## Fonctionnalités

- Tableau de bord et progression quotidienne.
- Création, modification, suppression et validation des activités.
- Dates, horaires, catégories, priorités et rappels configurables.
- Détection des chevauchements avec proposition du prochain créneau libre.
- Vues Ma journée, Mes tâches et calendrier mensuel / hebdomadaire / journalier.
- Recherche et filtres par statut et priorité.
- Statistiques avec graphiques sur 7 ou 30 jours et estimation des heures terminées.
- Assistant de productivité local : priorisation, bilan et conseils prédéfinis.
- Notifications navigateur pour les rappels (permission à accorder dans Paramètres).
- Thème clair / sombre et profil personnalisable.
- Sauvegarde automatique dans `localStorage`.
- Manifeste PWA et service worker pour le cache hors ligne.

## Structure

- `index.html` : structure et composants.
- `styles.css` : interface responsive et thèmes.
- `app.js` : logique et interactions.
- `manifest.webmanifest` : métadonnées PWA.
- `service-worker.js` : cache hors ligne.

## Limites à connaître

- Les données restent dans le navigateur et sur l'appareil utilisés. Il n'y a pas encore de compte, de synchronisation multi-appareils ni de base de données distante.
- Les rappels sont déclenchés lorsque l'application est ouverte dans un onglet actif. Les notifications système dépendent de l'autorisation du navigateur et du support de l'appareil.
- L'assistant est une aide locale basée sur des règles simples : aucune API d'IA externe n'est connectée.
- Les vues calendrier permettent d'ouvrir une journée et de modifier les activités ; le glisser-déposer n'est pas implémenté.
- La police Nunito est chargée depuis Google Fonts et nécessite une connexion lors du premier chargement.
