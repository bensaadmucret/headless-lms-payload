/**
 * Initialisation de Payload pour les workers (process indépendants de Next)
 */

import { getPayload } from 'payload'
import config from '../payload.config'

let payloadInstance: any = null

export async function getPayloadInstance() {
  if (!payloadInstance) {
    payloadInstance = await getPayload({
      config,
      // Pas de serveur HTTP ici, on utilise juste l'API de données
      disableOnInit: true,
    })
  }
  return payloadInstance
}
