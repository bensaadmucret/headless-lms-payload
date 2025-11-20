import { Payload } from 'payload'
import { AIAPIService } from './AIAPIService'
import { MEDICAL_CONTEXT_SYSTEM_PROMPT } from '../config/ai-context'

export interface FlashcardGenerationRequest {
    topic: string
    count?: number
    difficulty?: 'easy' | 'medium' | 'hard'
    specialty?: string
    targetAudience?: 'student' | 'intern' | 'specialist'
}

export interface GeneratedFlashcard {
    front: string
    back: string
    tags: string[]
    difficulty: 'easy' | 'medium' | 'hard'
    explanation?: string
}

export class AIGeneratedFlashcardService {
    private payload: Payload
    private aiService: AIAPIService

    constructor(payload: Payload) {
        this.payload = payload
        this.aiService = new AIAPIService()
    }

    /**
     * Génère des flashcards via l'IA
     */
    async generateFlashcards(request: FlashcardGenerationRequest): Promise<GeneratedFlashcard[]> {
        const count = request.count || 5
        const difficulty = request.difficulty || 'medium'

        const systemPrompt = `
      ${MEDICAL_CONTEXT_SYSTEM_PROMPT}
      
      Tu es un expert en pédagogie médicale. Ta tâche est de générer des flashcards de haute qualité pour l'apprentissage.
      Chaque flashcard doit avoir :
      - Un "recto" (front) : Une question précise, un terme à définir, ou un cas clinique court.
      - Un "verso" (back) : Une réponse claire, concise et médicalement exacte.
      - Des tags pertinents.
      - Un niveau de difficulté ("easy", "medium" ou "hard").
      
      Format de sortie attendu : JSON Array strict.
      Exemple:
      [
        {
          "front": "Quelle est la triade de Charcot ?",
          "back": "Douleur abdominale, Fièvre, Ictère (Angiocholite)",
          "tags": ["Gastro-entérologie", "Sémiologie"],
          "difficulty": "medium",
          "explanation": "Signe clinique classique de l'angiocholite aiguë."
        }
      ]
    `

        const userPrompt = `
      Sujet : ${request.topic}
      Spécialité : ${request.specialty || 'Médecine générale'}
      Niveau : ${request.targetAudience || 'Étudiant en médecine'}
      Difficulté souhaitée : ${difficulty}
      Nombre de cartes : ${count}
      
      Génère ${count} flashcards pertinentes sur ce sujet. Assure-toi que les informations sont à jour et validées scientifiquement.
    `

        try {
            const response = await this.aiService.generateContent({
                prompt: userPrompt,
                systemInstruction: systemPrompt,
                temperature: 0.7,
                maxTokens: 2000,
                jsonMode: true,
            })

            if (!response.content) {
                throw new Error('Échec de la génération IA : contenu vide')
            }

            const flashcards = JSON.parse(response.content) as GeneratedFlashcard[]

            // Validation basique
            return flashcards.filter((f) => Boolean(f.front && f.back))
        } catch (error) {
            console.error('Erreur lors de la génération des flashcards:', error)
            throw error
        }
    }

    /**
     * Sauvegarde les flashcards générées en base de données
     */
    async saveFlashcardsToDB(
        flashcards: GeneratedFlashcard[], 
        _userId: string | number, 
        categoryId?: string | number,
        topic?: string,
        level?: 'PASS' | 'LAS' | 'both',
        difficulty?: 'easy' | 'medium' | 'hard'
    ) {
        const normalizedCategoryId = (() => {
            if (typeof categoryId === 'number') {
                return categoryId
            }

            if (typeof categoryId === 'string') {
                const parsedId = Number(categoryId)
                return Number.isNaN(parsedId) ? undefined : parsedId
            }

            return undefined
        })()

        const results = []

        if (normalizedCategoryId === undefined) {
            throw new Error('Une catégorie valide est requise pour sauvegarder les flashcards générées')
        }

        // Créer ou récupérer un Deck pour regrouper les flashcards générées
        const deckName = topic 
            ? `Deck - ${topic.substring(0, 50)}${topic.length > 50 ? '...' : ''}` 
            : `Deck du ${new Date().toLocaleDateString('fr-FR')}`
        
        let deck: any
        try {
            // Vérifier si un deck avec le même nom et catégorie existe déjà
            const existingDecks = await this.payload.find({
                collection: 'flashcard-decks',
                where: {
                    and: [
                        { deckName: { equals: deckName } },
                        { category: { equals: normalizedCategoryId } }
                    ]
                },
                limit: 1
            })

            if (existingDecks.docs.length > 0) {
                // Réutiliser le deck existant
                deck = existingDecks.docs[0]
                
                // Mettre à jour le nombre de cartes
                await this.payload.update({
                    collection: 'flashcard-decks',
                    id: deck.id,
                    data: {
                        cardCount: (deck.cardCount || 0) + flashcards.length
                    }
                })
                
                // Rafraîchir l'objet deck avec le nouveau cardCount
                deck.cardCount = (deck.cardCount || 0) + flashcards.length
            } else {
                // Créer un nouveau deck
                deck = await this.payload.create({
                    collection: 'flashcard-decks',
                    data: {
                        deckName,
                        description: `Deck généré automatiquement${topic ? ` sur le sujet: ${topic}` : ''}`,
                        category: normalizedCategoryId,
                        level: (level || 'both') as 'PASS' | 'LAS' | 'both',
                        difficulty: (difficulty || 'medium') as 'easy' | 'medium' | 'hard',
                        cardCount: flashcards.length,
                        author: 'Assistant automatique',
                        source: 'Génération automatique'
                    }
                })
            }
        } catch (e) {
            console.error('Erreur création/récupération du deck:', e)
            throw new Error('Impossible de créer ou récupérer le deck pour les flashcards')
        }

        if (!deck) {
            throw new Error('Le deck n\'a pas pu être créé ou récupéré')
        }

        // Créer les flashcards et les assigner au deck (en évitant les doublons)
        for (const card of flashcards) {
            try {
                // Vérifier si une flashcard identique existe déjà dans ce deck
                const existingCards = await this.payload.find({
                    collection: 'flashcards',
                    where: {
                        and: [
                            { front: { equals: card.front } },
                            { deck: { equals: deck.id } }
                        ]
                    },
                    limit: 1
                })

                if (existingCards.docs.length > 0) {
                    // Flashcard en double détectée, on la saute
                    console.log(`Flashcard en double ignorée: "${card.front.substring(0, 50)}..."`)
                    continue
                }

                // Créer la flashcard si elle n'existe pas
                const result = await this.payload.create({
                    collection: 'flashcards',
                    data: {
                        front: card.front,
                        back: card.back,
                        tags: card.tags.map((tag) => ({ tag })),
                        difficulty: card.difficulty,
                        category: normalizedCategoryId,
                        level: (level || 'both') as 'PASS' | 'LAS' | 'both',
                        deck: deck.id, // Assigner au deck créé
                        generatedByAI: true,
                        validationStatus: 'needs_review',
                    }
                })
                results.push(result)
            } catch (e) {
                console.error('Erreur sauvegarde flashcard:', e)
            }
        }

        // Mettre à jour le cardCount réel du deck (en cas de doublons ignorés)
        if (results.length !== flashcards.length) {
            await this.payload.update({
                collection: 'flashcard-decks',
                id: deck.id,
                data: {
                    cardCount: (deck.cardCount || 0) - (flashcards.length - results.length)
                }
            })
        }

        return { deck, flashcards: results }
    }
}
