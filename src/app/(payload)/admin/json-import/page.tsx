'use client'
import React from 'react'
import { redirect } from 'next/navigation'

export default function JSONImportPage() {
  // Rediriger vers la collection native Payload
  redirect('/admin/collections/knowledge-base')
}