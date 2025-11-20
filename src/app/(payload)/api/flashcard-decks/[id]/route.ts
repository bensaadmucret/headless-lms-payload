import { NextRequest, NextResponse } from 'next/server'

import { getFlashcardDeckById } from '@/utilities/api/flashcardDecks'

interface RouteParams {
  params: { id: string }
}

export const GET = async (_req: NextRequest, { params }: RouteParams) => {
  try {
    if (!params?.id) {
      return NextResponse.json({ success: false, error: 'ID requis' }, { status: 400 })
    }

    const deck = await getFlashcardDeckById(params.id)

    return NextResponse.json({ success: true, deck })
  } catch (error) {
    console.error('Erreur récupération deck:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Erreur serveur' },
      { status: 500 }
    )
  }
}
