#!/usr/bin/env tsx
import process from 'node:process'

import { getPayload } from '@/lib/payload'

const VALID_ROLES = ['admin'] as const
type AdminRole = (typeof VALID_ROLES)[number]

async function promote(email: string, role: AdminRole) {
  const payload = await getPayload()

  const { docs } = await payload.update({
    collection: 'users',
    where: {
      email: {
        equals: email,
      },
    },
    data: {
      role,
    },
    overrideAccess: true,
  })

  if (!docs || docs.length === 0) {
    throw new Error(`Aucun utilisateur trouvé avec l'adresse ${email}`)
  }

  const [user] = docs
  payload.logger.info('[promote-admin]', {
    email: user.email,
    role: user.role,
  })
}

async function main() {
  const [, , emailArg, roleArg] = process.argv

  if (!emailArg || !roleArg) {
    console.error('Usage: tsx scripts/promote-admin.ts <email> <admin>')
    process.exit(1)
  }

  const desiredRole = roleArg.toLowerCase() as AdminRole

  if (!VALID_ROLES.includes(desiredRole)) {
    console.error(`Rôle invalide "${roleArg}". Valeurs autorisées: ${VALID_ROLES.join(', ')}`)
    process.exit(1)
  }

  try {
    await promote(emailArg, desiredRole)
    console.log(`Utilisateur ${emailArg} promu en ${desiredRole}`)
  } catch (error) {
    console.error('[promote-admin] Échec de la promotion:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()
