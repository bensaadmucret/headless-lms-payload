import { NextRequest, NextResponse } from 'next/server'

import { listFlashcardDecks } from '@/utilities/api/flashcardDecks'

export const GET = async (req: NextRequest) => {
  try {
    const searchParams = req.nextUrl.searchParams
    const categoryId = searchParams.get('categoryId') || undefined
    const level = searchParams.get('level') || undefined

    const decks = await listFlashcardDecks({
      categoryId: categoryId ?? undefined,
      level: (level as 'PASS' | 'LAS' | 'both' | undefined) ?? undefined
    })

    return NextResponse.json({
      success: true,
      total: decks.totalDocs,
      decks: decks.docs
    })
  } catch (error) {
    console.error('Erreur récupération decks:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Erreur serveur' },
      { status: 500 }
    )
  }
}
