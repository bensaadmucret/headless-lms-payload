import type { CollectionConfig } from 'payload'
import type { Access, AccessArgs } from 'payload';

type BeforeChangeArgs = {
  req: any;
  operation: 'create' | 'update';
  data: any;
};

import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import path from 'path'

import { isAdminOrSuperAdmin, isUser } from '../access/roles';

import type { Role } from '../access/roles';

type User = {
  id: string | number;
  role?: Role;
  [key: string]: unknown;
};

type AccessArgsWithDoc = {
  req: { user?: User | null };
  doc?: { user?: string | number };
};

import { getMediaDirname } from './getMediaDirname';

const dirname = process.env.NODE_ENV === 'test'
  ? process.cwd() // Mock ou fallback pour Jest
  : getMediaDirname();

import { logAuditAfterChange, logAuditAfterDelete } from './logAudit';

const isOwnerOrAdmin = ({ req, doc }: AccessArgsWithDoc) =>
  isAdminOrSuperAdmin(req.user ?? undefined) ||
  (isUser(req.user ?? undefined) && doc?.user === req.user?.id);

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    create: ({ req }: any) => !!req.user, // Authentifié
    read: () => true,                // Public (mettre ({ req }) => !!req.user pour privé)
    update: isOwnerOrAdmin as any,
    delete: isOwnerOrAdmin as any,
  },
  hooks: {
    beforeChange: [
      ({ req, operation, data }: BeforeChangeArgs) => {
        if (operation === 'create' && req.user) {
          return { ...data, user: req.user.id };
        }
        return data;
      },
    ],
    afterChange: [logAuditAfterChange],
    afterDelete: [logAuditAfterDelete],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'alt',
      type: 'text',
      //required: true,
    },
    {
      name: 'caption',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()]
        },
      }),
    },
  ],
  upload: {
    // Upload to the public/media directory in Next.js making them publicly accessible even outside of Payload
    staticDir: path.resolve(dirname, '../../public/media'),
    adminThumbnail: 'thumbnail',
    focalPoint: true,
    imageSizes: [
      {
        name: 'thumbnail',
        width: 300,
      },
      {
        name: 'square',
        width: 500,
        height: 500,
      },
      {
        name: 'small',
        width: 600,
      },
      {
        name: 'medium',
        width: 900,
      },
      {
        name: 'large',
        width: 1400,
      },
      {
        name: 'xlarge',
        width: 1920,
      },
      {
        name: 'og',
        width: 1200,
        height: 630,
        crop: 'center',
      },
    ],
  },
}
