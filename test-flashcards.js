// Script de test pour vérifier la récupération des flashcards
const { getFlashcardDeckById } = require('./dist/utilities/api/flashcardDecks')

async function test() {
  try {
    // Remplacez 'DECK_ID' par l'ID du deck que vous testez
    const deckId = process.argv[2] || '1'
    console.log(`Testing deck ID: ${deckId}`)
    
    const deck = await getFlashcardDeckById(deckId)
    
    console.log('\n=== Deck Info ===')
    console.log('Name:', deck.deckName)
    console.log('Card Count:', deck.cardCount)
    console.log('Flashcards array length:', deck.flashcards?.length || 0)
    
    if (deck.flashcards && deck.flashcards.length > 0) {
      console.log('\n=== First Flashcard ===')
      console.log('Front:', deck.flashcards[0].front)
      console.log('Back:', deck.flashcards[0].back)
    } else {
      console.log('\n⚠️  No flashcards found!')
    }
  } catch (error) {
    console.error('Error:', error.message)
  }
}

test()
