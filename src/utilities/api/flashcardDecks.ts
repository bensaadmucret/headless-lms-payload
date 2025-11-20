import { getPayloadInstance } from '@/utils/payloadInstance'

export async function getFlashcardDeckById(deckId: string | number) {
  const payload = await getPayloadInstance()

  const [deck, flashcardsResult] = await Promise.all([
    payload.findByID({
      collection: 'flashcard-decks',
      id: deckId,
      depth: 2
    }),
    payload.find({
      collection: 'flashcards',
      where: {
        deck: {
          equals: deckId
        }
      },
      limit: 1000, // Limite raisonnable
      depth: 1
    })
  ])

  console.log(`[getFlashcardDeckById] Deck ID: ${deckId}, Found ${flashcardsResult.docs.length} flashcards`)

  return {
    ...deck,
    flashcards: flashcardsResult.docs
  }
}

export async function listFlashcardDecks(filters: { categoryId?: string | number; level?: string } = {}) {
  const payload = await getPayloadInstance()
  const query = {
    where: {
      ...(filters.categoryId ? { category: { equals: filters.categoryId } } : {}),
      ...(filters.level ? { level: { equals: filters.level } } : {})
    }
  }

  const decks = await payload.find({
    collection: 'flashcard-decks',
    ...query,
    depth: 1
  })

  // Récupérer les flashcards pour chaque deck (optionnel, pour l'aperçu)
  const decksWithFlashcards = await Promise.all(
    decks.docs.map(async (deck) => {
      const flashcardsResult = await payload.find({
        collection: 'flashcards',
        where: {
          deck: {
            equals: deck.id
          }
        },
        limit: 5, // Seulement les 5 premières pour l'aperçu
        depth: 0
      })

      console.log(`[listFlashcardDecks] Deck ${deck.id}: Found ${flashcardsResult.docs.length} flashcards (preview)`)

      return {
        ...deck,
        flashcards: flashcardsResult.docs
      }
    })
  )

  return {
    ...decks,
    docs: decksWithFlashcards
  }
}
