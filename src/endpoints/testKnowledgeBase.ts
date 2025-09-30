import type { Endpoint } from 'payload'

export const testKnowledgeBaseEndpoint: Endpoint = {
  path: '/knowledge-base/test',
  method: 'get',
  handler: async (req, res) => {
    try {
      return res.json({
        success: true,
        message: 'Endpoint de test Knowledge Base fonctionne !',
        timestamp: new Date().toISOString(),
        user: req.user ? { id: req.user.id, email: req.user.email } : null,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  },
}