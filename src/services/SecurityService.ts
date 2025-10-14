import type { Payload } from 'payload'

export interface SessionOwnershipResult {
  isOwner: boolean
  session?: any
  error?: string
}

export interface SessionValidityResult {
  isValid: boolean
  session?: any
  error?: string
  reason?: 'not_found' | 'expired' | 'completed' | 'abandoned'
}

/**
 * Service de sécurité pour les quiz adaptatifs
 */
export class SecurityService {
  constructor(private payload: Payload) {}

  /**
   * Vérifie que l'utilisateur est propriétaire de la session
   */
  async validateSessionOwnership(sessionId: string, userId: string): Promise<SessionOwnershipResult> {
    try {
      const session = await this.payload.find({
        collection: 'adaptiveQuizSessions',
        where: {
          sessionId: { equals: sessionId }
        },
        limit: 1
      })

      if (session.totalDocs === 0) {
        return {
          isOwner: false,
          error: 'Session non trouvée'
        }
      }

      const sessionDoc = session.docs[0]
      const sessionUserId = typeof sessionDoc.user === 'object' ? sessionDoc.user.id : sessionDoc.user

      if (sessionUserId !== userId) {
        return {
          isOwner: false,
          error: 'Accès non autorisé à cette session'
        }
      }

      return {
        isOwner: true,
        session: sessionDoc
      }
    } catch (error) {
      console.error('Error validating session ownership:', error)
      return {
        isOwner: false,
        error: 'Erreur lors de la validation de propriété'
      }
    }
  }

  /**
   * Vérifie la validité d'une session (non expirée, active, etc.)
   */
  async validateSessionValidity(sessionId: string): Promise<SessionValidityResult> {
    try {
      const session = await this.payload.find({
        collection: 'adaptiveQuizSessions',
        where: {
          sessionId: { equals: sessionId }
        },
        limit: 1
      })

      if (session.totalDocs === 0) {
        return {
          isValid: false,
          error: 'Session non trouvée',
          reason: 'not_found'
        }
      }

      const sessionDoc = session.docs[0]

      // Vérifier si la session est expirée
      if (sessionDoc.expiresAt && new Date(sessionDoc.expiresAt) < new Date()) {
        // Marquer automatiquement comme expirée si ce n'est pas déjà fait
        if (sessionDoc.status !== 'expired') {
          await this.payload.update({
            collection: 'adaptiveQuizSessions',
            id: sessionDoc.id,
            data: { status: 'expired' }
          })
        }

        return {
          isValid: false,
          session: sessionDoc,
          error: 'Session expirée',
          reason: 'expired'
        }
      }

      // Vérifier le statut de la session
      if (sessionDoc.status === 'completed') {
        return {
          isValid: false,
          session: sessionDoc,
          error: 'Session déjà terminée',
          reason: 'completed'
        }
      }

      if (sessionDoc.status === 'abandoned') {
        return {
          isValid: false,
          session: sessionDoc,
          error: 'Session abandonnée',
          reason: 'abandoned'
        }
      }

      if (sessionDoc.status === 'expired') {
        return {
          isValid: false,
          session: sessionDoc,
          error: 'Session expirée',
          reason: 'expired'
        }
      }

      return {
        isValid: true,
        session: sessionDoc
      }
    } catch (error) {
      console.error('Error validating session validity:', error)
      return {
        isValid: false,
        error: 'Erreur lors de la validation de session'
      }
    }
  }

  /**
   * Vérifie l'authentification et les permissions de l'utilisateur
   */
  validateUserAuthentication(req: any): { isAuthenticated: boolean; user?: any; error?: string } {
    if (!req.user) {
      return {
        isAuthenticated: false,
        error: 'Authentification requise'
      }
    }

    // Vérifier que l'utilisateur a un ID valide
    if (!req.user.id) {
      return {
        isAuthenticated: false,
        error: 'ID utilisateur manquant'
      }
    }

    // Vérifier que l'utilisateur n'est pas désactivé
    if (req.user.status === 'disabled' || req.user.status === 'banned') {
      return {
        isAuthenticated: false,
        error: 'Compte utilisateur désactivé'
      }
    }

    return {
      isAuthenticated: true,
      user: req.user
    }
  }

  /**
   * Vérifie que l'utilisateur a un niveau d'études défini
   */
  async validateUserProfile(userId: string): Promise<{ isValid: boolean; user?: any; error?: string }> {
    try {
      const user = await this.payload.findByID({
        collection: 'users',
        id: userId
      })

      if (!(user as any).studyYear) {
        return {
          isValid: false,
          error: 'Niveau d\'études non défini dans le profil'
        }
      }

      if (!['pass', 'las'].includes((user as any).studyYear)) {
        return {
          isValid: false,
          error: 'Niveau d\'études invalide'
        }
      }

      return {
        isValid: true,
        user
      }
    } catch (error) {
      console.error('Error validating user profile:', error)
      return {
        isValid: false,
        error: 'Erreur lors de la validation du profil utilisateur'
      }
    }
  }

  /**
   * Nettoie automatiquement les sessions expirées
   */
  async cleanupExpiredSessions(): Promise<{ cleaned: number; errors: string[] }> {
    const errors: string[] = []
    let cleaned = 0

    try {
      const now = new Date()
      
      // Trouver toutes les sessions expirées qui ne sont pas marquées comme telles
      const expiredSessions = await this.payload.find({
        collection: 'adaptiveQuizSessions',
        where: {
          and: [
            { expiresAt: { less_than: now } },
            { status: { not_equals: 'expired' } }
          ]
        },
        limit: 100 // Traiter par lots pour éviter la surcharge
      })

      // Marquer chaque session comme expirée
      for (const session of expiredSessions.docs) {
        try {
          await this.payload.update({
            collection: 'adaptiveQuizSessions',
            id: session.id,
            data: { status: 'expired' }
          })
          cleaned++
        } catch (error) {
          errors.push(`Erreur lors de la mise à jour de la session ${session.sessionId}: ${error.message}`)
        }
      }

      return { cleaned, errors }
    } catch (error) {
      console.error('Error during session cleanup:', error)
      return { 
        cleaned, 
        errors: [...errors, `Erreur générale lors du nettoyage: ${error.message}`] 
      }
    }
  }

  /**
   * Vérifie l'intégrité des données de session
   */
  async validateSessionIntegrity(sessionId: string): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = []

    try {
      const session = await this.payload.find({
        collection: 'adaptiveQuizSessions',
        where: { sessionId: { equals: sessionId } },
        depth: 2,
        limit: 1
      })

      if (session.totalDocs === 0) {
        issues.push('Session non trouvée')
        return { isValid: false, issues }
      }

      const sessionDoc = session.docs[0]

      // Vérifier que les questions existent toujours
      if (!sessionDoc.questions || !Array.isArray(sessionDoc.questions)) {
        issues.push('Questions manquantes ou invalides')
      } else {
        for (let i = 0; i < sessionDoc.questions.length; i++) {
          const question = sessionDoc.questions[i]
          if (!question || (typeof question === 'object' && !question.id)) {
            issues.push(`Question ${i + 1} invalide ou supprimée`)
          }
        }
      }

      // Vérifier que l'utilisateur existe toujours
      if (!sessionDoc.user || (typeof sessionDoc.user === 'object' && !sessionDoc.user.id)) {
        issues.push('Utilisateur associé invalide ou supprimé')
      }

      // Vérifier la cohérence des métadonnées
      if (sessionDoc.questionDistribution) {
        const totalCalculated = (sessionDoc.questionDistribution.weakCategoryQuestions || 0) + 
                               (sessionDoc.questionDistribution.strongCategoryQuestions || 0)
        const totalActual = sessionDoc.questions ? sessionDoc.questions.length : 0

        if (totalCalculated !== totalActual) {
          issues.push('Incohérence dans la distribution des questions')
        }
      }

      return {
        isValid: issues.length === 0,
        issues
      }
    } catch (error) {
      console.error('Error validating session integrity:', error)
      return {
        isValid: false,
        issues: [...issues, `Erreur lors de la validation: ${error.message}`]
      }
    }
  }

  /**
   * Génère un token de sécurité pour une session (optionnel, pour sécurité renforcée)
   */
  generateSessionToken(sessionId: string, userId: string): string {
    const timestamp = Date.now()
    const data = `${sessionId}:${userId}:${timestamp}`
    
    // Simple hash pour l'exemple - en production, utiliser une vraie signature cryptographique
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    return `${timestamp}.${Math.abs(hash).toString(36)}`
  }

  /**
   * Valide un token de session
   */
  validateSessionToken(token: string, sessionId: string, userId: string, maxAgeMinutes: number = 60): boolean {
    try {
      const [timestampStr, hashStr] = token.split('.')
      const timestamp = parseInt(timestampStr, 10)
      
      // Vérifier l'âge du token
      const now = Date.now()
      const ageMinutes = (now - timestamp) / (1000 * 60)
      
      if (ageMinutes > maxAgeMinutes) {
        return false
      }

      // Régénérer le hash et comparer
      const expectedToken = this.generateSessionToken(sessionId, userId)
      const [, expectedHash] = expectedToken.split('.')
      
      return hashStr === expectedHash
    } catch (error) {
      return false
    }
  }
}