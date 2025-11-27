import { NextResponse } from 'next/server'

function notImplemented() {
  return NextResponse.json(
    {
      error: 'Auth route is not configured. BetterAuth has been disabled in this environment.',
    },
    { status: 501 },
  )
}

export function GET() {
  return notImplemented()
}

export function POST() {
  return notImplemented()
}

export function PUT() {
  return notImplemented()
}

export function PATCH() {
  return notImplemented()
}

export function DELETE() {
  return notImplemented()
}
