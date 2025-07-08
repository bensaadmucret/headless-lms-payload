import { CollectionConfig } from 'payload';

export const ColorSchemes: CollectionConfig = {
  slug: 'color-schemes',
  admin: {
    useAsTitle: 'name',
    description: 'Thèmes de couleurs pour les instances frontend',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'isDefault',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'theme',
      type: 'group',
      fields: [
        {
          name: 'primary',
          type: 'text',
          required: true,
        },
        {
          name: 'secondary',
          type: 'text',
          required: true,
        },
        {
          name: 'accent',
          type: 'text',
          required: true,
        },
        {
          name: 'background',
          type: 'text',
          required: true,
        },
        {
          name: 'text',
          type: 'text',
          required: true,
        }
      ]
    }
  ]
};

export default ColorSchemes;
