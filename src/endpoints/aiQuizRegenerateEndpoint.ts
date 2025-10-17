import type { Endpoint, PayloadRequest } from 'payload'

/**
 * Endpoint pour régénérer une question spécifique
 * Tâche 9: Possibilité de régénérer des questions spécifiques
 * Exigences: 9.4
 */
export const regenerateQuestionEndpoint: Endpoint = {
  path: '/ai-quiz/regenerate-question',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    const { regenerateQuestion } = await import('./regenerateQuestion')
    return regenerateQuestion(req)
  }
}

export default regenerateQuestionEndpoint