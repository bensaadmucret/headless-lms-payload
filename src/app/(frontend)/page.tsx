import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(120deg, #f6d365 0%, #fda085 100%)'
    }}>
      <h1 style={{
        fontSize: '2.5rem',
        fontWeight: 700,
        marginBottom: '1.5rem',
        color: '#222'
      }}>
        Bienvenue sur la plateforme Headless LMS
      </h1>
      <p style={{
        fontSize: '1.25rem',
        marginBottom: '2.5rem',
        color: '#444'
      }}>
        Gérez vos contenus, abonnements et utilisateurs en toute simplicité.
      </p>
      <Link
        href="/admin"
        style={{
          padding: '1rem 2rem',
          fontSize: '1.1rem',
          fontWeight: 600,
          color: '#fff',
          background: 'linear-gradient(90deg, #ff512f 0%, #dd2476 100%)',
          border: 'none',
          borderRadius: '0.5rem',
          textDecoration: 'none',
          boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
          transition: 'background 0.3s'
        }}
        aria-label="Connexion à l'administration"
      >
        Connexion Admin
      </Link>
    </main>
  );
}
