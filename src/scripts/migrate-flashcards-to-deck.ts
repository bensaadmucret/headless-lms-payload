/**
 * Script de migration pour associer les flashcards existantes à leur deck
 * 
 * Ce script parcourt tous les decks et toutes les flashcards pour :
 * 1. Trouver les flashcards qui n'ont pas de deck assigné
 * 2. Les associer au deck approprié basé sur la catégorie ou d'autres critères
 * 
 * Usage: npm run migrate:flashcards-to-deck
 */

import { getPayload } from 'payload'
import configPromise from '@payload-config'

async function migrateFlashcardsToDeck() {
  console.log('🚀 Démarrage de la migration des flashcards vers les decks...\n')

  const payload = await getPayload({ config: configPromise })

  // 1. Récupérer tous les decks
  const decksResult = await payload.find({
    collection: 'flashcard-decks',
    limit: 1000,
    depth: 0
  })

  console.log(`📦 ${decksResult.docs.length} decks trouvés\n`)

  // 2. Récupérer toutes les flashcards sans deck
  const flashcardsWithoutDeck = await payload.find({
    collection: 'flashcards',
    where: {
      or: [
        { deck: { exists: false } },
        { deck: { equals: null } }
      ]
    },
    limit: 10000,
    depth: 0
  })

  console.log(`🃏 ${flashcardsWithoutDeck.docs.length} flashcards sans deck trouvées\n`)

  if (flashcardsWithoutDeck.docs.length === 0) {
    console.log('✅ Toutes les flashcards ont déjà un deck assigné!')
    return
  }

  // 3. Pour chaque flashcard sans deck, essayer de trouver un deck correspondant
  let updated = 0
  let skipped = 0

  for (const flashcard of flashcardsWithoutDeck.docs) {
    try {
      // Chercher un deck avec la même catégorie et le même niveau
      const matchingDeck = decksResult.docs.find(deck => {
        const categoryMatch = deck.category === flashcard.category
        const levelMatch = !flashcard.level || deck.level === flashcard.level || deck.level === 'both'
        return categoryMatch && levelMatch
      })

      if (matchingDeck) {
        // Mettre à jour la flashcard avec le deck trouvé
        await payload.update({
          collection: 'flashcards',
          id: flashcard.id,
          data: {
            deck: matchingDeck.id
          }
        })
        updated++
        console.log(`✓ Flashcard ${flashcard.id} → Deck "${matchingDeck.deckName}" (${matchingDeck.id})`)
      } else {
        skipped++
        console.log(`⚠ Flashcard ${flashcard.id} : Aucun deck correspondant trouvé`)
      }
    } catch (error) {
      console.error(`❌ Erreur lors de la mise à jour de la flashcard ${flashcard.id}:`, error)
    }
  }

  // 4. Mettre à jour le cardCount de chaque deck
  console.log('\n📊 Mise à jour du nombre de cartes par deck...\n')

  for (const deck of decksResult.docs) {
    const flashcardsInDeck = await payload.find({
      collection: 'flashcards',
      where: {
        deck: {
          equals: deck.id
        }
      },
      limit: 0 // Juste pour compter
    })

    await payload.update({
      collection: 'flashcard-decks',
      id: deck.id,
      data: {
        cardCount: flashcardsInDeck.totalDocs
      }
    })

    console.log(`✓ Deck "${deck.deckName}" : ${flashcardsInDeck.totalDocs} cartes`)
  }

  console.log('\n' + '='.repeat(50))
  console.log(`✅ Migration terminée!`)
  console.log(`   - ${updated} flashcards mises à jour`)
  console.log(`   - ${skipped} flashcards ignorées (pas de deck correspondant)`)
  console.log('='.repeat(50))
}

// Exécuter la migration
migrateFlashcardsToDeck()
  .then(() => {
    console.log('\n✨ Script terminé avec succès')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Erreur lors de la migration:', error)
    process.exit(1)
  })
