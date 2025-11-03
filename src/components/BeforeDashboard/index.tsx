'use client'

import { Banner } from '@payloadcms/ui/elements/Banner'
import { useAuth } from '@payloadcms/ui'
import React from 'react'

import { SeedButton } from './SeedButton'
import './index.scss'

const baseClass = 'before-dashboard'

const BeforeDashboard: React.FC = () => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  return (
    <div className={baseClass}>
      <Banner className={`${baseClass}__banner`} type="success">
        <h4>Welcome to your dashboard!</h4>
      </Banner>
      
      {isAdmin && (
        <div className={`${baseClass}__admin-section`} style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px solid #e9ecef' }}>
          <h5 style={{ margin: '0 0 0.5rem 0', color: '#495057' }}>Administration IA</h5>
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            <li>
              <a href="/admin/generation-logs" style={{ color: '#007bff', textDecoration: 'none' }}>
                📊 Consulter les logs de génération IA
              </a>
              {' - Visualisez les métriques et l\'historique des générations de quiz par IA'}
            </li>
            <li style={{ marginTop: '0.5rem' }}>
              <a href="/admin/collections/generationlogs" style={{ color: '#007bff', textDecoration: 'none' }}>
                📋 Gestion des logs (Collection)
              </a>
              {' - Accès direct à la collection des logs de génération'}
            </li>
          </ul>
        </div>
      )}

      Here&apos;s what to do next:
      <ul className={`${baseClass}__instructions`}>
        <li>
          <SeedButton />
          {' with a few pages, posts, and projects to jump-start your new site, then '}
          <a href="/" target="_blank">
            visit your website
          </a>
          {' to see the results.'}
        </li>
        <li>
          If you created this repo using Payload Cloud, head over to GitHub and clone it to your
          local machine. It will be under the <i>GitHub Scope</i> that you selected when creating
          this project.
        </li>
        <li>
          {'Modify your '}
          <a
            href="https://payloadcms.com/docs/configuration/collections"
            rel="noopener noreferrer"
            target="_blank"
          >
            collections
          </a>
          {' and add more '}
          <a
            href="https://payloadcms.com/docs/fields/overview"
            rel="noopener noreferrer"
            target="_blank"
          >
            fields
          </a>
          {' as needed. If you are new to Payload, we also recommend you check out the '}
          <a
            href="https://payloadcms.com/docs/getting-started/what-is-payload"
            rel="noopener noreferrer"
            target="_blank"
          >
            Getting Started
          </a>
          {' docs.'}
        </li>
        <li>
          Commit and push your changes to the repository to trigger a redeployment of your project.
        </li>
      </ul>
      {'Pro Tip: This block is a '}
      <a
        href="https://payloadcms.com/docs/admin/custom-components/overview#base-component-overrides"
        rel="noopener noreferrer"
        target="_blank"
      >
        custom component
      </a>
      , you can remove it at any time by updating your <strong>payload.config</strong>.
    </div>
  )
}

export default BeforeDashboard
