import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'
import { AIGeneratedFlashcardService } from '@/services/AIGeneratedFlashcardService'

export const POST = async (req: NextRequest) => {
    try {
        const payload = await getPayload({ config: configPromise })

        // Vérification basique de l'authentification (à renforcer selon vos besoins)
        // Note: Payload gère l'auth via cookies, mais pour une API custom, on peut vérifier l'utilisateur
        const user = await payload.auth(req)

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { topic, count, difficulty, specialty, categoryId, targetAudience } = body

        if (!topic) {
            return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
        }

        const service = new AIGeneratedFlashcardService(payload)

        // 1. Génération
        const generatedCards = await service.generateFlashcards({
            topic,
            count: Math.min(count || 5, 20), // Limite de sécurité
            difficulty,
            specialty,
            targetAudience
        })

        // 2. Sauvegarde avec création automatique du deck
        const userId = (user as any).user?.id || (user as any).id || 'unknown'
        const result = await service.saveFlashcardsToDB(
            generatedCards, 
            userId, 
            categoryId,
            topic,
            targetAudience,
            difficulty
        )

        return NextResponse.json({
            success: true,
            count: result.flashcards.length,
            cards: result.flashcards,
            deck: result.deck
        })

    } catch (error: any) {
        console.error('API Error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
