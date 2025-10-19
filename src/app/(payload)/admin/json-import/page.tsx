'use client'
import React from 'react'
import { redirect } from 'next/navigation'

export default function JSONImportPage() {
  // Rediriger vers la collection questions (knowledge-base supprimée)
  redirect('/admin/collections/questions')
}