import type { CollectionConfig } from 'payload'
import { authenticated } from '../access/authenticated'
import { anyone } from '../access/anyone'

export const DocumentFolders: CollectionConfig = {
    slug: 'document-folders',
    admin: {
        useAsTitle: 'name',
        defaultColumns: ['name', 'type', 'parent'],
    },
    access: {
        create: authenticated,
        read: authenticated,
        update: authenticated,
        delete: authenticated,
    },
    fields: [
        {
            name: 'name',
            type: 'text',
            required: true,
        },
        {
            name: 'parent',
            type: 'relationship',
            relationTo: 'document-folders',
            hasMany: false,
            filterOptions: ({ id }) => {
                return {
                    id: {
                        not_equals: id,
                    },
                }
            },
        },
        {
            name: 'user',
            type: 'relationship',
            relationTo: 'users',
            required: true,
            defaultValue: ({ req }) => req.user?.id,
            admin: {
                condition: () => false, // Auto-filled, hidden from admin UI usually
            },
        },
        {
            name: 'type',
            type: 'select',
            options: [
                { label: 'Année', value: 'year' },
                { label: 'Matière', value: 'subject' },
                { label: 'Chapitre', value: 'chapter' },
                { label: 'Sous-partie', value: 'subpart' },
                { label: 'Autre', value: 'other' },
            ],
            defaultValue: 'other',
        },
    ],
}
