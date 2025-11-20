/**
 * Configuration centrale pour les services IA
 * Permet de gérer les modèles et paramètres par défaut via variables d'environnement
 */

export const aiConfig = {
    // Fournisseur par défaut (gemini, openai, anthropic)
    defaultProvider: process.env.AI_PROVIDER_DEFAULT || 'gemini',

    gemini: {
        // Modèle par défaut pour toutes les opérations si non spécifié
        defaultModel: process.env.GEMINI_MODEL_DEFAULT || 'gemini-2.0-flash',

        // Modèle spécifique pour le chat/assistant (peut être plus rapide ou plus verbeux)
        chatModel: process.env.GEMINI_MODEL_CHAT || process.env.GEMINI_MODEL_DEFAULT || 'gemini-1.5-flash-latest',

        // Modèle pour la génération de contenu (quiz, distracteurs) - souvent besoin de plus de précision
        generationModel: process.env.GEMINI_MODEL_GENERATION || process.env.GEMINI_MODEL_DEFAULT || 'gemini-2.0-flash',
    },

    openai: {
        apiKey: process.env.OPENAI_API_KEY,
        defaultModel: process.env.OPENAI_MODEL_DEFAULT || 'gpt-4-turbo',
    },

    anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY,
        defaultModel: process.env.ANTHROPIC_MODEL_DEFAULT || 'claude-3-opus-20240229',
    }
};
