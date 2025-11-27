import type { PayloadRequest } from 'payload'
import type { User, Subscription } from '../payload-types'

function getFromAddress(): string {
  return (
    process.env.PAYLOAD_EMAIL_FROM ||
    process.env.SMTP_DEFAULT_FROM ||
    'no-reply@medcoach.local'
  )
}

export const EmailNotificationService = {
  async sendAccountLockedEmail(
    req: PayloadRequest,
    user: User,
    lockMinutes: number,
  ): Promise<void> {
    if (!user?.email) return
    if (!req.payload?.sendEmail) {
      console.warn('[EmailNotificationService] sendEmail non configuré, email de verrouillage non envoyé')
      return
    }

    const subject = 'Sécurité de votre compte MedCoach'
    const text =
      'Trop de tentatives de connexion ont été détectées sur votre compte.\n\n' +
      `Par sécurité, votre compte est temporairement verrouillé pour ${lockMinutes} minutes.\n\n` +
      'Si vous pensez qu\'il s\'agit d\'une erreur, utilisez la fonctionnalité "Mot de passe oublié" sur la page de connexion ou contactez le support.'
    const html =
      '<p>Trop de tentatives de connexion ont été détectées sur votre compte.</p>' +
      `<p>Par sécurité, votre compte est temporairement verrouillé pour ${lockMinutes} minutes.</p>` +
      '<p>Si vous pensez qu\'il s\'agit d\'une erreur, utilisez la fonctionnalité <strong>"Mot de passe oublié"</strong> sur la page de connexion ou contactez le support.</p>'

    await req.payload.sendEmail({
      to: user.email,
      from: getFromAddress(),
      subject,
      text,
      html,
    })
  },

  async sendPasswordResetEmail(
    req: PayloadRequest,
    user: User,
    token: string,
  ): Promise<void> {
    if (!user?.email) return
    if (!req.payload?.sendEmail) {
      console.warn('[EmailNotificationService] sendEmail non configuré, email de reset non envoyé')
      return
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080'
    const resetUrl = `${baseUrl.replace(/\/$/, '')}/auth/reset-password?token=${encodeURIComponent(token)}`

    const subject = 'Réinitialisation de votre mot de passe MedCoach'
    const text =
      'Vous avez demandé la réinitialisation de votre mot de passe MedCoach.\n\n' +
      `Pour choisir un nouveau mot de passe, cliquez sur le lien suivant :\n${resetUrl}\n\n` +
      'Si vous n\'êtes pas à l\'origine de cette demande, vous pouvez ignorer cet email.'
    const html =
      '<p>Vous avez demandé la réinitialisation de votre mot de passe MedCoach.</p>' +
      `<p>Pour choisir un nouveau mot de passe, cliquez sur le lien suivant :</p>` +
      `<p><a href="${resetUrl}">${resetUrl}</a></p>` +
      '<p>Si vous n\'êtes pas à l\'origine de cette demande, vous pouvez ignorer cet email.</p>'

    await req.payload.sendEmail({
      to: user.email,
      from: getFromAddress(),
      subject,
      text,
      html,
    })
  },

  async sendSubscriptionUpdatedEmail(
    req: PayloadRequest,
    user: User,
    subscription: Subscription,
  ): Promise<void> {
    if (!user?.email) return
    if (!req.payload?.sendEmail) {
      console.warn('[EmailNotificationService] sendEmail non configuré, email d\'abonnement non envoyé')
      return
    }

    const subject = 'Mise à jour de votre abonnement MedCoach'
    const text =
      'Les informations de votre abonnement MedCoach ont été mises à jour.\n\n' +
      `Statut : ${subscription.status}\n` +
      (subscription.currentPeriodEnd
        ? `Fin de période actuelle : ${subscription.currentPeriodEnd}\n\n`
        : '\n') +
      'Si vous n\'êtes pas à l\'origine de cette modification, contactez immédiatement le support.'
    const html =
      '<p>Les informations de votre abonnement MedCoach ont été mises à jour.</p>' +
      `<p><strong>Statut :</strong> ${subscription.status}</p>` +
      (subscription.currentPeriodEnd
        ? `<p><strong>Fin de période actuelle :</strong> ${subscription.currentPeriodEnd}</p>`
        : '') +
      '<p>Si vous n\'êtes pas à l\'origine de cette modification, contactez immédiatement le support.</p>'

    await req.payload.sendEmail({
      to: user.email,
      from: getFromAddress(),
      subject,
      text,
      html,
    })
  },
}
