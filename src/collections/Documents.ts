import type { CollectionConfig } from 'payload'
import { authenticated } from '../access/authenticated'

export const Documents: CollectionConfig = {
    slug: 'documents',
    upload: {
        staticDir: 'documents',
        mimeTypes: ['application/pdf'],
    },
    admin: {
        useAsTitle: 'title',
    },
    access: {
        create: authenticated,
        read: () => true,
        update: authenticated,
        delete: authenticated,
    },
    fields: [
        {
            name: 'title',
            type: 'text',
            required: true,
        },
        {
            name: 'folder',
            type: 'relationship',
            relationTo: 'document-folders',
            hasMany: false,
        },
        {
            name: 'user',
            type: 'relationship',
            relationTo: 'users',
            required: true,
            defaultValue: ({ req }) => req.user?.id,
            admin: {
                condition: () => false,
            },
        },
        {
            name: 'authors',
            type: 'text',
        },
        {
            name: 'pageCount',
            type: 'number',
            admin: {
                readOnly: true,
            },
        },
        {
            name: 'extractedContent',
            type: 'textarea',
            admin: {
                readOnly: true,
                description: 'Content extracted for search purposes',
            },
        },
    ],
}
