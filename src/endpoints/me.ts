import type { PayloadRequest } from 'payload'
import type { Response } from 'express'
import type { User } from '../payload-types'

type SanitizedUser = Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'role' | 'studyProfile' | 'examDate'>

const isNotFoundError = (error: unknown): error is { name?: string; status?: number; statusCode?: number } => {
  if (!error || typeof error !== 'object') {
    return false
  }

  const candidate = error as { name?: unknown; status?: unknown; statusCode?: unknown }
  return candidate.name === 'NotFound' || candidate.status === 404 || candidate.statusCode === 404
}

export const meEndpoint = {
  path: '/users/me',
  method: 'get' as const,
  handler: async (req: PayloadRequest, res: Response) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        authenticated: false,
        message: 'Aucun utilisateur authentifié. Veuillez vous connecter.',
        code: 'UNAUTHENTICATED',
      })
    }

    try {
      const user = await req.payload.findByID({
        collection: 'users',
        id: req.user.id,
        depth: 0,
      })

      const sanitizedUser: SanitizedUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        studyProfile: user.studyProfile,
        examDate: user.examDate,
      }

      return res.status(200).json({
        authenticated: true,
        user: sanitizedUser,
      })
    } catch (error) {
      const fallbackUser = req.user as User | null

      if (fallbackUser) {
        const sanitizedUser: SanitizedUser = {
          id: fallbackUser.id,
          email: fallbackUser.email,
          firstName: fallbackUser.firstName,
          lastName: fallbackUser.lastName,
          role: fallbackUser.role,
          studyProfile: fallbackUser.studyProfile,
          examDate: fallbackUser.examDate,
        }

        const warning = isNotFoundError(error)
          ? 'Profil de base renvoyé depuis la session (document manquant en base).'
          : "Profil renvoyé depuis la session (lecture base échouée, voir logs)."

        console.warn('[meEndpoint] Fallback session user utilisé:', {
          reason: isNotFoundError(error) ? 'not_found' : 'unhandled_error',
          error: error instanceof Error ? error.message : error,
          userId: req.user?.id,
          timestamp: new Date().toISOString(),
        })

        return res.status(200).json({
          authenticated: true,
          user: sanitizedUser,
          warning,
        })
      }

      console.error('Erreur lors de la récupération du profil utilisateur:', {
        error,
        userId: req.user?.id,
        timestamp: new Date().toISOString(),
      })

      return res.status(isNotFoundError(error) ? 404 : 500).json({
        authenticated: false,
        error: isNotFoundError(error) ? 'Profil introuvable' : 'Erreur lors de la récupération du profil',
        code: isNotFoundError(error) ? 'PROFILE_NOT_FOUND' : 'INTERNAL_SERVER_ERROR',
        message: isNotFoundError(error)
          ? "Nous n'avons pas trouvé votre profil. Merci de contacter le support."
          : 'Une erreur est survenue lors de la récupération de votre profil',
      })
    }
  },
}
