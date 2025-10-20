# 🚀 Intégration code-supernova dans le système IA médical

Cette branche implémente l'intégration de **code-supernova** comme provider IA principal avec **Gemini comme fallback**.

## 🏗️ Architecture

### Services créés

#### 1. **SupernovaService** (`src/services/SupernovaService.ts`)
Service dédié à l'API code-supernova avec :
- Gestion spécialisée des erreurs Supernova
- Configuration optimisée pour la génération médicale
- Retry automatique avec backoff exponentiel
- Test de connectivité intégré

#### 2. **GeminiService** (`src/services/GeminiService.ts`)
Service dédié à l'API Google Gemini avec :
- Séparation claire des responsabilités
- Gestion spécialisée des erreurs Gemini
- Interface uniforme avec SupernovaService

#### 3. **AIAPIService** (mis à jour)
Orchestrateur intelligent avec :
- **Stratégie de priorité** : code-supernova → Gemini (fallback)
- Sélection automatique basée sur la disponibilité
- Gestion unifiée des erreurs et cache
- Support pour les préférences utilisateur

## ⚙️ Configuration

### Variables d'environnement (`.env`)

```bash
# Provider IA principal
SUPERNOVA_API_KEY=sk-your-supernova-api-key
SUPERNOVA_BASE_URL=https://api.supernova.io/v1
SUPERNOVA_MODEL=code-supernova-default

# Provider IA de secours (optionnel)
GEMINI_API_KEY=your-gemini-api-key
```

### Obtention des clés API

- **code-supernova** : https://app.supernova.io/ → Settings → Authentication tokens
- **Gemini** : https://aistudio.google.com/app/apikey

## 🔧 Utilisation

### Génération automatique
```typescript
import { AIAPIService } from './services/AIAPIService';

const aiService = new AIAPIService();

// Utilise code-supernova par défaut (avec fallback Gemini)
const response = await aiService.generateContent({
  prompt: 'Génère un quiz médical sur la cardiologie',
  maxTokens: 1000,
  temperature: 0.7,
  jsonMode: true,
  preferredProvider: 'auto' // 'supernova' | 'gemini' | 'auto'
});
```

### Sélection manuelle du provider
```typescript
// Forcer l'utilisation de code-supernova
const supernovaResponse = await aiService.generateContent({
  prompt: '...',
  preferredProvider: 'supernova'
});

// Forcer l'utilisation de Gemini
const geminiResponse = await aiService.generateContent({
  prompt: '...',
  preferredProvider: 'gemini'
});
```

## 🧪 Tests

### Script de test intégré
```bash
# Dans le dossier payload-cms
node test-supernova-integration.js
```

Le script teste :
1. ✅ Connectivité code-supernova
2. ✅ Génération de contenu simple
3. ✅ Sélection automatique des providers
4. ✅ Fallback vers Gemini

## 📊 Avantages de cette architecture

### ✅ **Séparation des responsabilités**
- Chaque IA a son service dédié
- Tests indépendants possibles
- Maintenance facilitée

### ✅ **Robustesse**
- Fallback automatique en cas d'échec
- Gestion spécialisée des erreurs par provider
- Retry intelligent avec backoff

### ✅ **Évolutivité**
- Facile d'ajouter d'autres providers (OpenAI, Claude, etc.)
- Interface uniforme pour tous les providers
- Configuration centralisée

### ✅ **Performance**
- Cache partagé entre tous les providers
- Rate limiting unifié
- Sélection intelligente du provider

## 🔄 Flux de fonctionnement

```
1. Utilisateur demande génération IA
   ↓
2. AIAPIService sélectionne le provider
   - code-supernova (priorité haute)
   - Gemini (fallback si échec)
   ↓
3. Service dédié appelé (SupernovaService/GeminiService)
   ↓
4. Gestion des erreurs spécialisée
   - Retry automatique
   - Fallback si nécessaire
   ↓
5. Réponse validée et mise en cache
   ↓
6. Réponse retournée à l'utilisateur
```

## 🚨 Points d'attention

### Erreurs spécifiques à gérer

#### Erreurs code-supernova
```typescript
// Dans les catch blocks
if (error.message.includes('SUPERNOVA_AUTH_ERROR')) {
  // Clé API invalide
}
if (error.message.includes('SUPERNOVA_RATE_LIMIT')) {
  // Limite atteinte - attendre avant retry
}
```

#### Erreurs Gemini
```typescript
if (error.message.includes('GEMINI_RATE_LIMIT')) {
  // Limite Gemini atteinte - fallback vers Supernova ?
}
```

### Monitoring recommandé

1. **Taux de succès par provider**
2. **Temps de réponse moyen**
3. **Nombre de fallbacks**
4. **Coûts d'utilisation**

## 🎯 Prochaines étapes

1. **Test de l'intégration** avec vraies clés API
2. **Optimisation des prompts** pour code-supernova
3. **Comparaison qualité** des réponses médicales
4. **Interface admin** pour sélection du provider
5. **Métriques détaillées** par provider

## 📝 Notes techniques

- **Architecture micro-services** respectée
- **Interface commune** pour tous les providers
- **Gestion d'erreurs robuste** avec classification
- **Tests intégrés** pour validation
- **Documentation complète** des APIs

Cette intégration rend votre système **plus robuste, évolutif et professionnel** ! 🚀
