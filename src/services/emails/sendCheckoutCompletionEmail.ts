import { sendEmail } from '../../utilities/email';

export interface SendCheckoutCompletionEmailOptions {
  to: string;
  sessionId: string;
  customerName?: string | null;
  billingCycle?: 'monthly' | 'yearly';
  trialDays?: number;
}

const DEFAULT_FRONTEND_URL = 'http://localhost:5173';
const DEFAULT_TRIAL_DAYS = 30;

const resolveFrontendBaseUrl = (): string => {
  const value = process.env.FRONTEND_URL ?? process.env.NEXT_PUBLIC_FRONTEND_URL;
  return value && value.trim().length > 0 ? value : DEFAULT_FRONTEND_URL;
};

export const buildCheckoutCompletionUrl = (sessionId: string): string => {
  const baseUrl = resolveFrontendBaseUrl();
  const url = new URL('/checkout/success', baseUrl);
  url.searchParams.set('session_id', sessionId);
  return url.toString();
};

export async function sendCheckoutCompletionEmail({
  to,
  sessionId,
  customerName,
  billingCycle,
  trialDays = DEFAULT_TRIAL_DAYS,
}: SendCheckoutCompletionEmailOptions): Promise<void> {
  const completionUrl = buildCheckoutCompletionUrl(sessionId);
  const normalizedName = customerName?.trim();
  const greeting = normalizedName && normalizedName.length > 0 ? `Bonjour ${normalizedName},` : 'Bonjour,';
  const planLabel = billingCycle === 'yearly' ? 'Premium Annuel' : 'Premium Mensuel';

  const text = `${greeting}

Votre paiement a bien été confirmé et votre abonnement ${planLabel} est presque prêt.

Si vous avez fermé la page de confirmation par erreur, vous pouvez finaliser l'activation de votre compte en cliquant sur le lien suivant :
${completionUrl}

Pensez à terminer cette étape pour profiter immédiatement de vos ${trialDays} jours d'essai gratuit.

À très vite,
L'équipe MedCoach`;

  const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Finalisez votre abonnement MedCoach</title>
    <style>
      body {
        font-family: 'Poppins', Arial, sans-serif;
        background-color: #f9fafb;
        margin: 0;
        padding: 0;
        color: #0f172a;
        line-height: 1.6;
      }
      .container {
        max-width: 600px;
        margin: 24px auto;
        background: #ffffff;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 18px 40px rgba(13, 148, 136, 0.15);
      }
      .header {
        background: linear-gradient(135deg, #34d399 0%, #059669 100%);
        padding: 36px 28px;
        text-align: center;
        color: #ecfdf5;
      }
      .content {
        padding: 36px 32px;
      }
      .btn {
        display: inline-block;
        background: #059669;
        color: #ffffff !important;
        text-decoration: none;
        padding: 14px 32px;
        border-radius: 999px;
        font-weight: 600;
        letter-spacing: 0.02em;
        margin: 28px 0;
        text-align: center;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 16px 32px rgba(5, 150, 105, 0.28);
      }
      .link-box {
        background: #ecfdf5;
        border-radius: 14px;
        padding: 18px;
        font-size: 14px;
        word-break: break-word;
        color: #0f172a;
        border: 1px solid rgba(5, 150, 105, 0.12);
      }
      .footer {
        padding: 22px;
        text-align: center;
        font-size: 13px;
        color: #475569;
        background: #f1f5f9;
        border-top: 1px solid rgba(148, 163, 184, 0.25);
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 style="margin: 0; font-size: 26px; font-weight: 600; letter-spacing: 0.01em;">Finalisez votre accès Premium</h1>
        <p style="margin: 10px 0 0; font-size: 15px; color: rgba(236, 253, 245, 0.85);">Encore une étape et vous profitez de toutes les fonctionnalités MedCoach.</p>
      </div>
      <div class="content">
        <p>${greeting}</p>
        <p>
          Votre paiement a bien été confirmé et votre abonnement <strong style="color:#047857;">${planLabel}</strong> est presque prêt.<br />
          Cliquez sur le bouton ci-dessous pour terminer l'activation de votre compte.
        </p>
        <p>
          Vous bénéficiez de <strong>${trialDays} jours d'essai gratuit</strong>. Aucun prélèvement ne sera effectué pendant cette période.
        </p>
        <p style="text-align: center; margin: 32px 0;">
          <a class="btn" href="${completionUrl}" target="_blank" rel="noopener noreferrer">
            Finaliser mon accès
          </a>
        </p>
        <p>Si le bouton ne fonctionne pas, copiez-collez le lien suivant :</p>
        <div class="link-box">
          ${completionUrl}
        </div>
        <p>
          Si vous rencontrez la moindre difficulté, répondez simplement à cet email pour que nous puissions vous aider.
        </p>
        <p style="margin-top: 32px;">À très vite,<br /><span style="font-weight: 600; color: #0f172a;">L'équipe MedCoach</span></p>
      </div>
      <div class="footer">
        MedCoach &copy; ${new Date().getFullYear()}<br />
        Cet email a été envoyé automatiquement suite à votre paiement Stripe.
      </div>
    </div>
  </body>
</html>`;

  await sendEmail({
    to,
    subject: 'Finalisez votre abonnement Premium MedCoach',
    text,
    html,
  });
}
