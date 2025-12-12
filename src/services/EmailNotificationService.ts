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
    const title = 'Compte temporairement verrouillé'
    const content = `
      <p>Trop de tentatives de connexion ont été détectées sur votre compte.</p>
      <p>Par mesure de sécurité, l'accès est bloqué pour une durée de <strong>${lockMinutes} minutes</strong>.</p>
      <p>Si vous n'êtes pas à l'origine de ces tentatives, nous vous recommandons de sécuriser votre mot de passe dès que possible.</p>
    `

    const html = generateEmailTemplate({
      title,
      content,
      actionText: "Réinitialiser mon mot de passe",
      actionUrl: `${getFrontendUrl()}/auth/forgot-password`
    })

    await req.payload.sendEmail({
      to: user.email,
      from: getFromAddress(),
      subject,
      html,
    })
  },

  async sendAccountSetupEmail(
    req: PayloadRequest,
    user: User,
    token: string,
  ): Promise<void> {
    if (!user?.email) return
    if (!req.payload?.sendEmail) {
      console.warn('[EmailNotificationService] sendEmail non configuré, email de configuration non envoyé')
      return
    }

    const resetUrl = `${getFrontendUrl()}/auth/reset-password?token=${encodeURIComponent(token)}`
    const subject = 'Activez votre compte MedCoach'

    const content = `
      <p>Bonjour ${user.firstName || ''},</p>
      <p>Bienvenue sur MedCoach ! Votre compte a été créé avec succès.</p>
      <p>Pour finaliser votre inscription et accéder à votre espace, veuillez définir votre mot de passe en cliquant sur le bouton ci-dessous.</p>
    `

    const html = generateEmailTemplate({
      title: 'Bienvenue sur MedCoach',
      content,
      actionText: "Activer mon compte",
      actionUrl: resetUrl
    })

    await req.payload.sendEmail({
      to: user.email,
      from: getFromAddress(),
      subject,
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
      return
    }

    const resetUrl = `${getFrontendUrl()}/auth/reset-password?token=${encodeURIComponent(token)}`

    const subject = 'Réinitialisation de votre mot de passe'
    const content = `
      <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte MedCoach.</p>
      <p>Si vous êtes à l'origine de cette demande, cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe.</p>
      <p class="sub-text">Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité.</p>
    `

    const html = generateEmailTemplate({
      title: 'Mot de passe oublié ?',
      content,
      actionText: "Réinitialiser le mot de passe",
      actionUrl: resetUrl
    })

    await req.payload.sendEmail({
      to: user.email,
      from: getFromAddress(),
      subject,
      html,
    })
  },

  async sendSubscriptionUpdatedEmail(
    req: PayloadRequest,
    user: User,
    subscription: Subscription,
  ): Promise<void> {
    if (!user?.email) return
    if (!req.payload?.sendEmail) return

    const subject = 'Mise à jour de votre abonnement'
    const statusMap: Record<string, string> = {
      active: 'Actif',
      past_due: 'Paiement échoué',
      canceled: 'Annulé',
      trialing: 'En période d\'essai'
    };

    const displayStatus = statusMap[subscription.status] || subscription.status;

    const content = `
      <p>Le statut de votre abonnement MedCoach a évolué.</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Nouveau statut :</strong> ${displayStatus}</p>
        ${subscription.currentPeriodEnd ? `<p style="margin: 10px 0 0 0;"><strong>Fin de période :</strong> ${new Date(subscription.currentPeriodEnd).toLocaleDateString('fr-FR')}</p>` : ''}
      </div>
    `

    const html = generateEmailTemplate({
      title: 'Mise à jour abonnement',
      content,
      actionText: "Gérer mon abonnement",
      actionUrl: `${getFrontendUrl()}/account/subscription`
    })

    await req.payload.sendEmail({
      to: user.email,
      from: getFromAddress(),
      subject,
      html,
    })
  },

  async sendSubscriptionWelcomeEmail(
    req: PayloadRequest,
    user: User,
    subscription: Subscription,
  ): Promise<void> {
    if (!user?.email) return
    if (!req.payload?.sendEmail) return

    const loginUrl = `${getFrontendUrl()}/login`
    const subject = 'Bienvenue ! Votre abonnement est actif 🚀'

    const content = `
      <p>Bonjour ${user.firstName || 'étudiant'},</p>
      <p>Félicitations ! Votre abonnement MedCoach est officiellement actif.</p>
      <p>Vous avez désormais accès à l'ensemble du contenu pour exceller dans vos études de santé.</p>
      <p>Votre réussite commence maintenant. Connectez-vous dès à présent pour démarrer votre session.</p>
    `

    const html = generateEmailTemplate({
      title: 'Abonnement confirmé',
      content,
      actionText: "Accéder à mon espace",
      actionUrl: loginUrl
    })

    await req.payload.sendEmail({
      to: user.email,
      from: getFromAddress(),
      subject,
      html,
    })
  },
}

// Helpers
function getFrontendUrl(): string {
  const url = process.env.FRONTEND_URL || 'http://localhost:8080'
  return url.replace(/\/$/, '')
}

interface TemplateOptions {
  title: string;
  content: string;
  actionText?: string;
  actionUrl?: string;
}

function generateEmailTemplate({ title, content, actionText, actionUrl }: TemplateOptions): string {
  const primaryColor = '#10B981'; // Vert MedCoach

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; color: #374151; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-top: 40px; margin-bottom: 40px; }
        .header { background-color: ${primaryColor}; padding: 30px 20px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; }
        .content { padding: 40px 30px; line-height: 1.6; font-size: 16px; }
        .button-container { text-align: center; margin-top: 30px; margin-bottom: 30px; }
        .button { display: inline-block; background-color: ${primaryColor}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background-color 0.2s; }
        .footer { background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
        .sub-text { font-size: 14px; color: #6b7280; margin-top: 20px; }
        a { color: ${primaryColor}; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${title}</h1>
        </div>
        <div class="content">
          ${content}
          
          ${actionText && actionUrl ? `
            <div class="button-container">
              <a href="${actionUrl}" class="button">${actionText}</a>
            </div>
          ` : ''}
          
          <div style="margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            <p style="font-size: 14px; color: #9ca3af; margin: 0;">L'équipe MedCoach</p>
          </div>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} MedCoach. Tous droits réservés.</p>
          <p>Vous recevez cet email car vous êtes inscrit sur MedCoach.</p>
        </div>
      </div>
    </body>
    </html>
  `
}
