# Plan d'Implémentation

- [x] 1. Mise en place de l'infrastructure de base
  - Créer les interfaces TypeScript pour les types d'import JSON
  - Définir les schémas de validation JSON pour les différents types de contenu
  - Créer la structure de base du service de validation JSON
  - _Exigences: 1.1, 2.1_

- [x] 2. Implémentation du service de validation JSON
- [x] 2.1 Créer JSONValidationService avec validation de schéma
  - Implémenter la validation des schémas JSON pour questions, parcours et flashcards
  - Ajouter la détection des doublons dans les fichiers d'import
  - Créer les méthodes de validation des références (catégories, niveaux)
  - _Exigences: 2.1, 2.2, 2.5_

- [x] 2.2 Implémenter la validation des données métier
  - Valider la cohérence des questions (options, bonnes réponses)
  - Vérifier l'existence des catégories référencées
  - Contrôler les formats des champs (difficulté, niveau étudiant)
  - _Exigences: 1.2, 2.2_

- [x] 2.3 Écrire les tests unitaires pour la validation
  - Tester la validation avec des données valides et invalides
  - Vérifier la détection des doublons et références manquantes
  - Tester les messages d'erreur et suggestions de correction
  - _Exigences: 2.2_

- [x] 3. Développement du service de traitement JSON
- [x] 3.1 Créer JSONProcessingService pour le mapping des données
  - Implémenter la transformation JSON vers structures Payload CMS
  - Créer les méthodes de mapping pour questions, catégories et métadonnées
  - Gérer la conversion des formats (texte simple vers RichText Lexical)
  - _Exigences: 1.1, 1.5, 4.2_

- [x] 3.2 Implémenter ContentMappingService pour les relations
  - Résoudre automatiquement les références de catégories existantes
  - Créer les catégories manquantes avec validation utilisateur
  - Mapper les niveaux d'études et difficultés vers les énumérations système
  - _Exigences: 1.5, 2.5, 4.2_

- [x] 3.3 Créer les tests d'intégration pour le mapping
  - Tester la transformation complète de fichiers JSON vers base de données
  - Vérifier l'intégrité des relations créées
  - Valider la préservation des métadonnées lors du mapping
  - _Exigences: 1.1, 1.5_

- [x] 4. Implémentation du système de traitement par lots
- [x] 4.1 Créer BatchProcessingService pour les gros volumes
  - Implémenter le traitement par chunks avec gestion de la mémoire
  - Ajouter le suivi de progression en temps réel
  - Créer le système de pause/reprise des imports
  - _Exigences: 3.1, 3.2, 3.3_

- [x] 4.2 Développer le système de gestion des erreurs partielles
  - Implémenter la continuation d'import malgré les erreurs non-critiques
  - Créer les rapports détaillés d'import avec succès et échecs
  - Ajouter le système de rollback pour les erreurs critiques
  - _Exigences: 3.4, 5.3, 5.4_

- [ ]* 4.3 Tester les performances sur gros volumes
  - Valider l'import de 1000+ questions sans dégradation
  - Tester la gestion mémoire et les temps de réponse
  - Vérifier la robustesse du système de rollback
  - _Exigences: 3.1, 3.2_

- [x] 5. Création de l'endpoint principal d'import
- [x] 5.1 Développer JSONImportEndpoint avec gestion des permissions
  - Créer l'endpoint `/api/json-import/upload` avec authentification admin
  - Implémenter la validation des fichiers et types MIME
  - Ajouter la gestion des options d'import (dry-run, batch size)
  - _Exigences: 1.1, 5.1, 5.2_

- [x] 5.2 Intégrer les services de validation et traitement
  - Orchestrer le flux validation → traitement → création en base
  - Implémenter la gestion asynchrone avec queue de traitement
  - Créer les réponses JSON avec progression et résultats détaillés
  - _Exigences: 1.1, 2.1, 3.1_

- [x] 5.3 Ajouter les endpoints de suivi et historique
  - Créer `/api/json-import/status/:jobId` pour le suivi de progression
  - Implémenter `/api/json-import/history` pour l'historique des imports
  - Ajouter `/api/json-import/templates` pour télécharger les templates JSON
  - _Exigences: 3.2, 5.2_

- [x] 6. Implémentation du support des parcours d'apprentissage
- [x] 6.1 Étendre le système pour les learning paths
  - Ajouter la validation des structures de parcours avec prérequis
  - Implémenter la création des relations entre étapes et questions
  - Gérer la validation des références de prérequis dans le parcours
  - _Exigences: 4.1, 4.2, 4.3_

- [x] 6.2 Créer le système de gestion des prérequis
  - Valider que les prérequis référencés existent dans l'import ou le système
  - Créer les enregistrements de substitution pour les dépendances manquantes
  - Implémenter la validation de la cohérence des séquences d'apprentissage
  - _Exigences: 4.3, 4.5_

- [x] 6.3 Tester les parcours complexes avec prérequis
  - Valider l'import de parcours multi-niveaux avec dépendances
  - Tester la gestion des références circulaires et incohérences
  - Vérifier l'intégrité des relations créées en base de données
  - _Exigences: 4.1, 4.2_

- [x] 7. Support des flashcards et conversion automatique
- [x] 7.1 Implémenter l'import de flashcards
  - Créer la validation des structures flashcard (recto/verso)
  - Implémenter la préservation des métadonnées (tags, difficulté, catégorie)
  - Ajouter la validation des références média pour les flashcards avec images
  - _Exigences: 6.1, 6.3, 6.4_

- [x] 7.2 Développer la conversion flashcard vers question
  - Créer la logique de conversion automatique flashcard → QCM
  - Générer automatiquement les distracteurs pour les questions converties
  - Préserver les métadonnées lors de la conversion
  - _Exigences: 6.2_

- [x] 7.3 Créer les plannings de répétition espacée
  - Implémenter la création automatique des plannings pour les flashcards
  - Intégrer avec le système de spaced repetition existant
  - Tester la génération des séquences d'apprentissage optimisées
  - _Exigences: 6.5_

- [x] 8. Système d'audit et de sécurité complet
- [x] 8.1 Intégrer le logging d'audit complet
  - Utiliser AuditLogService existant pour tracer tous les imports
  - Logger les détails utilisateur, timestamps et résumés de contenu
  - Créer les rapports d'activité pour les administrateurs
  - _Exigences: 5.2, 5.5_

- [x] 8.2 Implémenter le système de rollback
  - Créer les sauvegardes automatiques avant modifications
  - Implémenter la fonctionnalité de rollback avec justification
  - Ajouter la validation des permissions pour les opérations de rollback
  - _Exigences: 5.3, 5.4_

- [x] 8.3 Tester la sécurité et les permissions
  - Valider les contrôles d'accès pour tous les endpoints
  - Tester la sanitisation des données et validation des tailles
  - Vérifier l'intégrité des logs d'audit et traçabilité
  - _Exigences: 5.1, 5.2_

- [x] 9. Support CSV et workflow de validation humaine (MVP Focus)
- [x] 9.1 Implémenter CSVImportService pour les fichiers CSV
  - Créer le parsing CSV avec détection automatique des délimiteurs
  - Implémenter la validation des colonnes et gestion des encodages multiples
  - Ajouter la conversion CSV vers JSON interne pour traitement unifié
  - _Exigences: 7.1, 7.2, 7.3_

- [x] 9.2 Développer le workflow de validation humaine obligatoire
  - Créer l'écran Preview avec corrections suggérées (étape critique)
  - Implémenter la validation admin manuelle obligatoire avant import
  - Ajouter la traçabilité des validations avec identification administrateur
  - _Exigences: 8.1, 8.2, 8.4_

- [x] 9.3 Implémenter la gestion intelligente des catégories
  - Créer la détection de catégories similaires et suggestions de fusion
  - Implémenter le mapping intelligent avec validation administrative
  - Ajouter l'historique des mappings pour cohérence entre imports
  - _Exigences: 9.1, 9.2, 9.3_

- [x] 9.4 Créer les fixtures de test structurées
  - Organiser les fixtures en valid/, invalid/, et edge-cases/
  - Créer les fichiers de test pour tous les cas d'usage et erreurs
  - Implémenter les tests de validation avec fixtures complètes
  - _Exigences: 7.5, 8.5, 9.5_

- [x] 10. Interface utilisateur Payload-native
- [ ] 10.1 Créer les 5 écrans clés avec composants Payload natifs
  - Écran Upload : Drag & drop avec composant Upload Payload
  - Écran Validation : Table Payload pour rapport d'erreurs avec Alert components
  - Écran Preview : DataTable avec Tabs, Badge et Modal pour édition en ligne
  - _Exigences: 1.1, 2.2, 8.1, 8.2_

- [x] 10.2 Implémenter les écrans de progression et historique
  - Écran Progression : ProgressBar natif avec LivePreview pour logs temps réel
  - Écran Historique : ListView avec filtres natifs et StatusField
  - Utiliser uniquement les classes CSS Payload existantes
  - _Exigences: 3.2, 5.2, 8.4_

- [x] 10.3 Développer les templates et documentation MVP
  - Créer les templates JSON et CSV simplifiés
  - Rédiger la documentation avec focus sur workflow de validation
  - Ajouter le guide "Anki → CSV → MedCoach" comme alternative pragmatique
  - _Exigences: 1.1, 2.4, 7.1_

- [ ]* 10.4 Tests utilisateur avec focus qualité médicale
  - Effectuer des tests du workflow de validation humaine obligatoire
  - Valider l'ergonomie des écrans Payload-native
  - Tester la gestion intelligente des catégories avec vrais utilisateurs
  - _Exigences: 2.2, 8.2, 9.2_