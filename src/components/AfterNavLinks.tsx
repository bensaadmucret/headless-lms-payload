import React from 'react';

interface AfterNavLinksProps {
  className?: string;
}

const AfterNavLinks: React.FC<AfterNavLinksProps> = ({ className = '' }) => {
  // Note: Dans Payload CMS, l'authentification est gérée automatiquement
  // Ces liens ne seront visibles que pour les utilisateurs connectés

  return (
    <div className={`after-nav-links ${className}`}>
      <div className="nav__label" style={{ marginTop: '2rem' }}>
        <span>Analytics Business</span>
      </div>

      <nav className="nav__links">
        <a
          href="/admin/analytics-business"
          className="nav__link"
        >
          <span className="nav__link-icon">📊</span>
          <span className="nav__link-label">Dashboard Business</span>
        </a>

        <a
          href="/admin/analytics-summary"
          className="nav__link"
        >
          <span className="nav__link-icon">📈</span>
          <span className="nav__link-label">Résumé Analytics</span>
        </a>
      </nav>
    </div>
  );
};

export default AfterNavLinks;
