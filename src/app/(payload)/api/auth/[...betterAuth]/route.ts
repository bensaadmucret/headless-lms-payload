import config from '@payload-config'
import { getPayloadAuth } from 'payload-auth/better-auth/plugin'
import { toNextJsHandler } from 'better-auth/next-js'

// Create a single BetterAuth -> Next.js handler, reusing the same Payload instance
const handlerPromise = (async () => {
  const payload = await getPayloadAuth(config as any)
  const auth = (payload as any).betterAuth

  if (!auth) {
    throw new Error('BetterAuth instance not found on payload. Ensure betterAuthPlugin is configured.')
  }

  return toNextJsHandler(auth as any)
})()

export async function GET(request: Request) {
  const handler = await handlerPromise
  return handler.GET(request)
}

export async function POST(request: Request) {
  const handler = await handlerPromise
  return handler.POST(request)
}

export async function PUT(request: Request) {
  const handler = await handlerPromise
  return handler.PUT(request)
}

export async function PATCH(request: Request) {
  const handler = await handlerPromise
  return handler.PATCH(request)
}

export async function DELETE(request: Request) {
  const handler = await handlerPromise
  return handler.DELETE(request)
}
