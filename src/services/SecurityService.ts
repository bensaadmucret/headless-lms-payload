import type { Payload } from 'payload'
import type { AdaptiveQuizSession, User } from '../payload-types'
import type { ExtendedPayloadRequest } from '../types/payload-types-extended'

type AdaptiveQuizSessionDoc = AdaptiveQuizSession & { user: number | (User & { id: number }) }

type UserAccountStatus = 'active' | 'disabled' | 'banned'

type UserWithAccountStatus = User & { status?: UserAccountStatus | null }

interface PayloadFindResult<T> {
  docs: T[]
  totalDocs: number
}

interface SessionOwnershipResult {
  isOwner: boolean
  session?: AdaptiveQuizSessionDoc
  error?: string
}

interface SessionValidityResult {
  isValid: boolean
  session?: AdaptiveQuizSessionDoc
  error?: string
  reason?: 'not_found' | 'expired' | 'completed' | 'abandoned'
}

interface CleanupResult {
  cleaned: number
  errors: string[]
}

interface SessionIntegrityResult {
  isValid: boolean
  issues: string[]
}

interface UserProfileValidationResult {
  isValid: boolean
  user?: User
  error?: string
}

interface AuthenticationResult {
  isAuthenticated: boolean
  user?: ExtendedPayloadRequest['user']
  error?: string
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
      }) as PayloadFindResult<unknown>

      if (session.totalDocs === 0) {
        return {
          isOwner: false,
          error: 'Session non trouvée'
        }
      }

      const sessionDoc = this.normalizeSessionDoc(session.docs[0])
      if (!sessionDoc) {
        return {
          isOwner: false,
          error: 'Session invalide ou corrompue'
        }
      }
      const sessionUserId = typeof sessionDoc.user === 'object' ? String(sessionDoc.user.id) : String(sessionDoc.user)

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

  private getUserAccountStatus(user: ExtendedPayloadRequest['user']): UserAccountStatus | undefined {
    if (!user || typeof user !== 'object') {
      return undefined
    }

    const candidateStatus = (user as Partial<UserWithAccountStatus>).status

    if (candidateStatus === 'active' || candidateStatus === 'disabled' || candidateStatus === 'banned') {
      return candidateStatus
    }

    return undefined
  }

  private normalizeSessionDoc(doc: unknown): AdaptiveQuizSessionDoc | null {
    if (!doc || typeof doc !== 'object') {
      return null
    }

    const candidate = doc as Partial<AdaptiveQuizSessionDoc>

    if (typeof candidate.id !== 'number') {
      return null
    }

    if (typeof candidate.sessionId !== 'string') {
      return null
    }

    if (!candidate.status || !['active', 'completed', 'abandoned', 'expired'].includes(candidate.status)) {
      return null
    }

    if (!Array.isArray(candidate.questions)) {
      return null
    }

    if (!candidate.user || (typeof candidate.user !== 'number' && typeof candidate.user !== 'object')) {
      return null
    }

    if (typeof candidate.user === 'object' && typeof candidate.user.id !== 'number') {
      return null
    }

    return candidate as AdaptiveQuizSessionDoc
  }

  private normalizeUserDoc(doc: unknown): User | null {
    if (!doc || typeof doc !== 'object') {
      return null
    }

    const candidate = doc as Partial<User>

    if (typeof candidate.id !== 'number') {
      return null
    }

    if (typeof candidate.email !== 'string') {
      return null
    }

    if (typeof candidate.firstName !== 'string' || typeof candidate.lastName !== 'string') {
      return null
    }

    return candidate as User
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
      }) as PayloadFindResult<unknown>

      if (session.totalDocs === 0) {
        return {
          isValid: false,
          error: 'Session non trouvée',
          reason: 'not_found'
        }
      }

      const sessionDoc = this.normalizeSessionDoc(session.docs[0])
      if (!sessionDoc) {
        return {
          isValid: false,
          error: 'Session invalide ou corrompue',
          reason: 'not_found'
        }
      }

      // Vérifier si la session est expirée
      if (sessionDoc.expiresAt && new Date(sessionDoc.expiresAt) < new Date()) {
        // Marquer automatiquement comme expirée si ce n'est pas déjà fait
        if (sessionDoc.status !== 'expired') {
          await this.payload.update({
            collection: 'adaptiveQuizSessions',
            id: sessionDoc.id,
            data: { status: 'expired' as const }
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
  validateUserAuthentication(req: ExtendedPayloadRequest): AuthenticationResult {
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
    const status = this.getUserAccountStatus(req.user)

    if (status === 'disabled' || status === 'banned') {
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
  async validateUserProfile(userId: string): Promise<UserProfileValidationResult> {
    try {
      const rawUser = await this.payload.findByID({
        collection: 'users',
        id: userId
      })

      const user = this.normalizeUserDoc(rawUser)

      if (!user) {
        return {
          isValid: false,
          error: 'Utilisateur introuvable ou invalide'
        }
      }

      if (!user.studyYear) {
        return {
          isValid: false,
          error: 'Niveau d\'études non défini dans le profil'
        }
      }

      if (!['pass', 'las'].includes(user.studyYear.toLowerCase())) {
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
  async cleanupExpiredSessions(): Promise<CleanupResult> {
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
      }) as PayloadFindResult<unknown>

      // Marquer chaque session comme expirée
      for (const rawSession of expiredSessions.docs) {
        const session = this.normalizeSessionDoc(rawSession)
        if (!session) {
          errors.push('Session invalide rencontrée lors du nettoyage')
          continue
        }
        try {
          await this.payload.update({
            collection: 'adaptiveQuizSessions',
            id: session.id,
            data: { status: 'expired' as const }
          })
          cleaned++
        } catch (error) {
          if (error instanceof Error) {
            errors.push(`Erreur lors de la mise à jour de la session ${session.sessionId}: ${error.message}`)
          } else {
            errors.push(`Erreur inconnue lors de la mise à jour de la session ${session.sessionId}`)
          }
        }
      }

      return { cleaned, errors }
    } catch (error) {
      console.error('Error during session cleanup:', error)
      if (error instanceof Error) {
        return {
          cleaned,
          errors: [...errors, `Erreur générale lors du nettoyage: ${error.message}`]
        }
      }
      return {
        cleaned,
        errors: [...errors, 'Erreur générale lors du nettoyage']
      }
    }
  }

  /**
   * Vérifie l'intégrité des données de session
   */
  async validateSessionIntegrity(sessionId: string): Promise<SessionIntegrityResult> {
    const issues: string[] = []

    try {
      const session = await this.payload.find({
        collection: 'adaptiveQuizSessions',
        where: { sessionId: { equals: sessionId } },
        depth: 2,
        limit: 1
      }) as PayloadFindResult<unknown>

      if (session.totalDocs === 0) {
        issues.push('Session non trouvée')
        return { isValid: false, issues }
      }

      const sessionDoc = this.normalizeSessionDoc(session.docs[0])
      if (!sessionDoc) {
        issues.push('Session invalide ou corrompue')
        return { isValid: false, issues }
      }

      // Vérifier que les questions existent toujours
      if (!sessionDoc.questions || !Array.isArray(sessionDoc.questions)) {
        issues.push('Questions manquantes ou invalides')
      } else {
        for (let i = 0; i < sessionDoc.questions.length; i++) {
          const question = sessionDoc.questions[i]
          if (!question || (typeof question === 'object' && !('id' in question && question.id))) {
            issues.push(`Question ${i + 1} invalide ou supprimée`)
          }
        }
      }

      if (!sessionDoc.user || (typeof sessionDoc.user === 'object' && !sessionDoc.user.id)) {
        issues.push('Utilisateur associé invalide ou supprimé')
      }

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
      if (error instanceof Error) {
        return {
          isValid: false,
          issues: [...issues, `Erreur lors de la validation: ${error.message}`]
        }
      }
      return {
        isValid: false,
        issues: [...issues, 'Erreur lors de la validation']
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
      const parts = token.split('.')

      if (parts.length !== 2) {
        return false
      }

      const timestampStr = parts[0]
      const hashStr = parts[1]

      if (!timestampStr || !hashStr) {
        return false
      }

      const timestamp = parseInt(timestampStr, 10)
      
      // Vérifier l'âge du token
      const now = Date.now()
      const ageMinutes = (now - timestamp) / (1000 * 60)
      
      if (ageMinutes > maxAgeMinutes) {
        return false
      }

      // Régénérer le hash et comparer
      const expectedToken = this.generateSessionToken(sessionId, userId)
      const expectedParts = expectedToken.split('.')

      if (expectedParts.length !== 2 || expectedParts[1] === '') {
        return false
      }

      return hashStr === expectedParts[1]
    } catch (error) {
      return false
    }
  }
}