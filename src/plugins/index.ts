import { payloadCloudPlugin } from '@payloadcms/payload-cloud'

import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { searchPlugin } from '@payloadcms/plugin-search'
import { Plugin } from 'payload'
import { revalidateRedirects } from '@/hooks/revalidateRedirects'
import { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'
import { FixedToolbarFeature, HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { searchFields } from '@/search/fieldOverrides'
import { beforeSyncWithSearch } from '@/search/beforeSync'

import { Page, Post } from '@/payload-types'
import { getServerSideURL } from '@/utilities/getURL'
import { betterAuthPlugin } from 'payload-auth'
import { nextCookies } from 'better-auth/next-js'
import { admin } from 'better-auth/plugins/admin'
import { sendEmail } from '../utilities/email'

const generateTitle: GenerateTitle<Post | Page> = ({ doc }) => {
  return doc?.title ? `${doc.title} | Payload Website Template` : 'Payload Website Template'
}

const generateURL: GenerateURL<Post | Page> = ({ doc }) => {
  const url = getServerSideURL()

  return doc?.slug ? `${url}/${doc.slug}` : url
}

export const plugins: Plugin[] = [
  redirectsPlugin({
    collections: ['pages', 'posts'],
    overrides: {
      // @ts-expect-error - This is a valid override, mapped fields don't resolve to the same type
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if ('name' in field && field.name === 'from') {
            return {
              ...field,
              admin: {
                description: 'You will need to rebuild the website when changing this field.',
              },
            }
          }
          return field
        })
      },
      hooks: {
        afterChange: [revalidateRedirects],
      },
    },
  }),
  nestedDocsPlugin({
    collections: ['categories'],
    generateURL: (docs) => docs.reduce((url, doc) => `${url}/${doc.slug}`, ''),
  }),
  seoPlugin({
    generateTitle,
    generateURL,
  }),
  formBuilderPlugin({
    fields: {
      payment: false,
    },
    formOverrides: {
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if ('name' in field && field.name === 'confirmationMessage') {
            return {
              ...field,
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    FixedToolbarFeature(),
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                  ]
                },
              }),
            }
          }
          return field
        })
      },
    },
  }),
  searchPlugin({
    collections: ['posts'],
    beforeSync: beforeSyncWithSearch,
    searchOverrides: {
      fields: ({ defaultFields }) => {
        return [...defaultFields, ...searchFields]
      },
    },
  }),
  payloadCloudPlugin(),
  betterAuthPlugin({
    disabled: false,
    disableDefaultPayloadAuth: true,
    hidePluginCollections: true,
    users: {
      allowedFields: [
        'firstName',
        'lastName',
        'email',
        'role',
        'metadata',
        'studyYear',
        'examDate',
        'onboardingComplete',
        'hasTakenPlacementQuiz',
      ],
      defaultRole: 'student',
      defaultAdminRole: 'admin',
      collectionOverrides: ({ collection }) => {
        if (!Array.isArray(collection.fields)) {
          return collection;
        }

        const mergeObjects = <T extends Record<string, unknown> | undefined>(
          a: T,
          b: T,
        ): Record<string, unknown> | undefined => {
          const left = a && typeof a === 'object' ? a : undefined;
          const right = b && typeof b === 'object' ? b : undefined;

          if (!left && !right) {
            return undefined;
          }

          return {
            ...(left ?? {}),
            ...(right ?? {}),
          };
        };

        const mergedFields: typeof collection.fields = [];
        const fieldIndexByName = new Map<string, number>();

        collection.fields.forEach((field) => {
          if (!field || typeof field !== 'object' || !('name' in field) || typeof field.name !== 'string') {
            mergedFields.push(field);
            return;
          }

          const fieldName = field.name;
          const existingIndex = fieldIndexByName.get(fieldName);

          if (existingIndex === undefined) {
            mergedFields.push(field);
            fieldIndexByName.set(fieldName, mergedFields.length - 1);
            return;
          }

          const existingField = mergedFields[existingIndex];
          if (!existingField || typeof existingField !== 'object') {
            mergedFields[existingIndex] = field;
            return;
          }

          if (
            'type' in existingField &&
            'type' in field &&
            typeof existingField.type === 'string' &&
            typeof field.type === 'string' &&
            existingField.type !== field.type
          ) {
            mergedFields[existingIndex] = field;
            return;
          }

          const mergedField = {
            ...existingField,
            ...field,
          } as (typeof collection.fields)[number];

          const mergedAdmin = mergeObjects(
            (existingField as Record<string, unknown>).admin as Record<string, unknown> | undefined,
            (field as Record<string, unknown>).admin as Record<string, unknown> | undefined,
          );

          if (mergedAdmin) {
            (mergedField as { admin?: typeof mergedField.admin }).admin = mergedAdmin as typeof mergedField.admin;
          }

          const mergedCustom = mergeObjects(
            (existingField as Record<string, unknown>).custom as Record<string, unknown> | undefined,
            (field as Record<string, unknown>).custom as Record<string, unknown> | undefined,
          );

          if (mergedCustom) {
            (mergedField as { custom?: typeof mergedField.custom }).custom = mergedCustom as typeof mergedField.custom;
          }

          mergedFields[existingIndex] = mergedField;
        });

        return {
          ...collection,
          fields: mergedFields,
        };
      },
    },
    accounts: {
      slug: 'userAccounts',
    },
    sessions: {
      slug: 'userSessions',
    },
    verifications: {
      slug: 'verifications',
    },
    betterAuthOptions: {
      appName: 'medcoach',
      baseURL: process.env.NEXT_PUBLIC_SERVER_URL,
      trustedOrigins: [
        process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000',
        process.env.FRONTEND_URL ?? 'http://localhost:8080',
        'http://localhost:3000',
        'http://localhost:8080',
        'http://localhost:5173',
        'http://127.0.0.1:8080',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
      ],
      user: {
        additionalFields: {
          firstName: {
            type: 'string',
            required: false,
            input: true,
          },
          lastName: {
            type: 'string',
            required: false,
            input: true,
          },
          studyYear: {
            type: 'string',
            required: false,
            input: true,
          },
          examDate: {
            type: 'date',
            required: false,
            input: true,
          },
          onboardingComplete: {
            type: 'boolean',
            required: false,
            defaultValue: false,
            input: true,
          },
          hasTakenPlacementQuiz: {
            type: 'boolean',
            required: false,
            defaultValue: false,
            input: true,
          },
          metadata: {
            type: 'json',
            required: false,
            input: true,
          },
        },
      },
      emailAndPassword: {
        enabled: true,
        sendResetPassword: async ({ user, url }) => {
          const frontendBaseUrl = process.env.FRONTEND_URL ?? 'http://localhost:8080'
          const backendBaseUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'
          const resetUrl = new URL(url)
          const rawToken = resetUrl.searchParams.get('token') ?? resetUrl.pathname.split('/').pop()
          const token = rawToken ?? ''
          const safeDecode = (value: string): string => {
            try {
              return decodeURIComponent(value)
            } catch {
              return value
            }
          }

          const rawCallbackURL = resetUrl.searchParams.get('callbackURL') ?? ''
          const callbackURL = rawCallbackURL ? safeDecode(rawCallbackURL) : ''
          const resolveCallbackPath = (value: string): string => {
            const attempts = [
              () => new URL(value),
              () => new URL(value, backendBaseUrl),
              () => new URL(value, frontendBaseUrl),
            ] as const

            for (const attempt of attempts) {
              try {
                return attempt().pathname
              } catch {
                // ignore and try next base
              }
            }

            return value
          }

          const callbackPath = callbackURL ? resolveCallbackPath(callbackURL) : ''
          const hasAdminCallback = callbackPath.startsWith('/admin')
          const resolveCallbackURL = (value: string, preferAdminBase: boolean): string => {
            if (/^https?:\/\//.test(value)) {
              return value
            }

            const base = preferAdminBase ? backendBaseUrl : frontendBaseUrl
            try {
              return new URL(value, base).toString()
            } catch {
              return value
            }
          }
          const isAdminReset = resetUrl.pathname.startsWith('/admin') || hasAdminCallback

          let resetLink: string

          if (isAdminReset) {
            const adminResetUrl = new URL('/admin/reset-password', backendBaseUrl)
            if (token) {
              adminResetUrl.searchParams.set('token', token)
            }

            if (callbackURL) {
              adminResetUrl.searchParams.set('callbackURL', resolveCallbackURL(callbackURL, true))
            }

            resetLink = adminResetUrl.toString()
          } else {
            const finalUrl = new URL('/auth/reset-password', frontendBaseUrl)
            if (token) {
              finalUrl.searchParams.set('token', token)
            }

            if (callbackURL) {
              finalUrl.searchParams.set('callbackURL', resolveCallbackURL(callbackURL, hasAdminCallback))
            }

            resetLink = finalUrl.toString()
          }

          console.info('[BetterAuth] Reset password link', {
            backendUrl: url,
            resetLink,
          })

          await sendEmail({
            to: user.email,
            subject: 'Réinitialisation de votre mot de passe MedCoach',
            text: `Bonjour,

Une demande de réinitialisation de mot de passe a été effectuée pour votre compte MedCoach.
Cliquez sur le lien suivant pour choisir un nouveau mot de passe : ${resetLink}

Si le bouton ne fonctionne pas, copiez-collez le lien dans votre navigateur.

Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email. Votre mot de passe restera inchangé.`,
            html: `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Réinitialisation de mot de passe</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet" />
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
        margin: 20px auto;
        background: #ffffff;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 18px 40px rgba(13, 148, 136, 0.12);
      }
      .header {
        background: linear-gradient(135deg, #34d399 0%, #059669 100%);
        padding: 34px 26px;
        text-align: center;
        color: #ecfdf5;
      }
      .logo {
        font-size: 24px;
        font-weight: 600;
        margin-bottom: 10px;
      }
      .content {
        padding: 36px 32px;
      }
      h1 {
        color: #0f172a;
        font-size: 24px;
        margin: 0 0 20px 0;
      }
      p {
        margin-bottom: 20px;
        font-size: 15px;
        color: #334155;
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
        margin: 24px 0;
        text-align: center;
        transition: all 0.3s ease;
      }
      .btn:hover {
        background: #047857;
        transform: translateY(-2px);
        box-shadow: 0 16px 32px rgba(5, 150, 105, 0.25);
      }
      .link-box {
        background: #ecfdf5;
        padding: 18px;
        border-radius: 14px;
        word-break: break-all;
        font-size: 14px;
        color: #0f172a;
        border: 1px solid rgba(5, 150, 105, 0.12);
        margin: 20px 0;
      }
      .footer {
        text-align: center;
        padding: 22px;
        font-size: 13px;
        color: #475569;
        background: #f1f5f9;
        border-top: 1px solid rgba(148, 163, 184, 0.25);
      }
      @media only screen and (max-width: 600px) {
        .container {
          margin: 0;
          border-radius: 0;
        }
        .content {
          padding: 24px;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">MedCoach</div>
        <div style="opacity: 0.85; font-size: 15px;">Votre partenaire santé</div>
      </div>
      <div class="content">
        <h1>Bonjour,</h1>
        <p>Une demande de réinitialisation de mot de passe a été effectuée pour votre compte MedCoach.</p>
        <div style="text-align: center;">
          <a href="${resetLink}" class="btn">Réinitialiser mon mot de passe</a>
        </div>
        <p>Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :</p>
        <div class="link-box">${resetLink}</div>
        <p style="color: #475569; font-size: 14px;">
          Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email. Votre mot de passe restera inchangé.
        </p>
        <p style="margin-top: 26px; color: #0f172a; font-weight: 600;">L'équipe MedCoach</p>
      </div>
      <div class="footer">
        MedCoach &copy; ${new Date().getFullYear()}<br />
MedCoach. Tous droits réservés.</p>
        <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
      </div>
    </div>
  </body>
</html>`,
          })
        },
      },
      session: {
        cookieCache: {
          enabled: true,
          maxAge: 5 * 60,
        },
      },
      account: {
        accountLinking: {
          enabled: true,
          trustedProviders: ['google'],
        },
      },
      plugins: [admin(), nextCookies()],
    },
  }),
]
