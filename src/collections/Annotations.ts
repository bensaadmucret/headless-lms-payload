import type { CollectionConfig } from 'payload'
import { authenticated } from '../access/authenticated'

export const Annotations: CollectionConfig = {
    slug: 'annotations',
    admin: {
        useAsTitle: 'id',
    },
    access: {
        create: authenticated,
        read: authenticated,
        update: authenticated,
        delete: authenticated,
    },
    fields: [
        {
            name: 'document',
            type: 'relationship',
            relationTo: 'documents',
            required: true,
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
            name: 'type',
            type: 'select',
            required: true,
            options: [
                { label: 'Note', value: 'note' },
                { label: 'Remarque', value: 'remark' },
                { label: 'Mini-résumé', value: 'summary' },
                { label: 'Surlignage', value: 'highlight' },
                { label: 'Zone', value: 'zone' },
            ],
        },
        {
            name: 'content',
            type: 'richText',
        },
        {
            name: 'pageNumber',
            type: 'number',
            required: true,
        },
        {
            name: 'position',
            type: 'json',
            admin: {
                description: 'JSON object storing x, y, width, height, etc.',
            },
        },
        {
            name: 'quote',
            type: 'textarea',
            admin: {
                description: 'The text that was highlighted',
            },
        },
        {
            name: 'color',
            type: 'text',
            defaultValue: '#ffeb3b', // Default yellow highlight
        },
    ],
}
