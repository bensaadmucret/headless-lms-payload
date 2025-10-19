// Externes
import * as path from 'path';
import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical';
import { PayloadRequest } from 'payload';

// Payload
import type { CollectionConfig, Access, AccessArgs } from 'payload';

// Internes
import { isAdminOrSuperAdmin, isUser } from '../access/roles';
import { getMediaDirname } from './getMediaDirname';
import { logAuditAfterChange, logAuditAfterDelete } from './logAudit';


// Types générés Payload
import type { Media } from '../payload-types';

// Détermination dynamique du dossier media
const dirname = process.env.NODE_ENV === 'test'
  ? process.cwd()
  : getMediaDirname();

// Fonction d'accès conforme à Payload
const isOwnerOrAdmin: Access = ({ req }, doc?: Media) => {
  const userId = req.user?.id;
  // doc?.user peut être : string | number | { id: string | number }
  const docUser = doc?.user;
  const docUserId = typeof docUser === 'object' && docUser !== null ? docUser.id : docUser;

  return (
    isAdminOrSuperAdmin(req.user ?? undefined) ||
    (isUser(req.user ?? undefined) && docUserId === userId)
  );
};

// Export d'alias pour compatibilité tests unitaires
export { MediaCollection as Media };
export const MediaCollection: CollectionConfig = {
  slug: 'media',
  access: {
    create: ({ req }: AccessArgs) => !!req.user,
    read: ({ req }: AccessArgs) => !!req.user,
    update: isOwnerOrAdmin,
    delete: isOwnerOrAdmin,
  },
  hooks: {
    beforeChange: [
      ({ req, operation, data }: { req: PayloadRequest; operation: 'create' | 'update'; data: Partial<Media> }) => {
        if (operation === 'create' && req.user) {
          return { ...data, user: req.user.id };
        }
        return data;
      },
    ],
    afterChange: [
      // processMediaAfterChange supprimé (knowledge-base supprimée)
      // logAuditAfterChange, // Désactivé temporairement (collection auditlogs manquante)
    ],
    afterDelete: [logAuditAfterDelete],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: { 
        readOnly: true,
        hidden: true, // Cacher ce champ de l'interface
      },
    },
    {
      name: 'alt',
      type: 'text',
    },
    {
      name: 'caption',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => [
          ...rootFeatures,
          FixedToolbarFeature(),
          InlineToolbarFeature(),
        ],
      }),
    },
    // ===== EXTRACTION DE CONTENU =====
    {
      name: 'extractedContent',
      type: 'textarea',
      maxLength: 200000, // Augmenter la limite pour les gros PDFs
      admin: {
        readOnly: true,
        description: 'Contenu textuel extrait automatiquement du document',
        condition: (data) => !!data?.extractedContent,
      },
    },
  ],
  upload: {
    staticDir: path.resolve(dirname, '../../public/media'),
    adminThumbnail: 'thumbnail',
    focalPoint: true,
    imageSizes: [
      { name: 'thumbnail', width: 300 },
      { name: 'square', width: 500, height: 500 },
      { name: 'small', width: 600 },
      { name: 'medium', width: 900 },
      { name: 'large', width: 1400 },
      { name: 'xlarge', width: 1920 },
      { name: 'og', width: 1200, height: 630, crop: 'center' },
    ],
  },
};
