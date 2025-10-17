import type { PayloadHandler } from 'payload'

// Endpoint de test simple pour vérifier le système d'import
export const testImport: PayloadHandler = async (req) => {
  const res = req.res
  
  try {
    const { payload } = req
    
    // Test simple : créer une question directement
    const testQuestion = await payload.create({
      collection: 'questions',
      data: {
        questionText: 'Question de test créée automatiquement',
        questionType: 'multipleChoice',
        options: [
          { optionText: 'Option A', isCorrect: true },
          { optionText: 'Option B', isCorrect: false }
        ],
        explanation: 'Ceci est une question de test pour vérifier le système',
        difficulty: 'easy',
        studentLevel: 'both'
      }
    })
    
    res.json({
      success: true,
      message: 'Test réussi !',
      questionId: testQuestion.id
    })
    
  } catch (error: any) {
    console.error('Erreur test import:', error?.message || String(error))
    res.status(500).json({
      success: false,
      error: 'Erreur lors du test',
      details: error?.message || String(error)
    })
  }
}