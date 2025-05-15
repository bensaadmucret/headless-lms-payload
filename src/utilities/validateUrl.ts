export const validateUrl = (value: string | string[] | null | undefined): true | string => {
  // Handle null, undefined, or array inputs
  if (!value || Array.isArray(value)) {
    return 'Une URL valide est requise'
  }

  const url = value
  try {
    const urlObject = new URL(url)
    
    // Vérifier le protocole
    if (!urlObject.protocol.match(/^https?:$/)) {
      return 'L\'URL doit utiliser le protocole http:// ou https://'
    }

    // Vérifier le format du domaine
    const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/
    if (!domainPattern.test(urlObject.hostname)) {
      return 'Format de domaine invalide'
    }

    // Vérifier le port si présent
    if (urlObject.port && !/^\d+$/.test(urlObject.port)) {
      return 'Format de port invalide'
    }

    return true
  } catch (error) {
    return 'URL invalide'
  }
}
