import { Payload, PayloadRequest } from 'payload';
import { User } from '../payload-types';

// Étend le type PayloadRequest pour inclure les propriétés user, payload et headers
export interface ExtendedPayloadRequest extends PayloadRequest {
  body: any; // Ajout de la propriété 'body' pour correspondre à la requête Express
  user?: User | null;
  payload: Payload;
  headers: {
    get(name: string): string | null;
  };
}
