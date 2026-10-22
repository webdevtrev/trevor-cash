import {defineField, defineType} from 'sanity'
import {ImageIcon} from '@sanity/icons/Image'

export const photo = defineType({
  name: 'photo',
  title: 'Photo',
  type: 'document',
  icon: ImageIcon,
  fields: [
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {hotspot: true},
      validation: (rule) => rule.required().error('Upload an image.'),
    }),
    defineField({name: 'title', title: 'Title', type: 'string'}),
    defineField({
      name: 'alt',
      title: 'Alt text',
      type: 'string',
      description: 'Describe the photo for people using screen readers.',
      validation: (rule) =>
        rule.required().error('Alt text is required so the photo is accessible.'),
    }),
    defineField({name: 'takenAt', title: 'Date taken', type: 'date'}),
    defineField({name: 'location', title: 'Location', type: 'string'}),
    defineField({name: 'caption', title: 'Caption', type: 'text', rows: 3}),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      description: 'Featured photos appear in the strip at the top of /photos.',
      initialValue: false,
    }),
  ],
  orderings: [
    {
      title: 'Date taken, newest first',
      name: 'takenAtDesc',
      by: [{field: 'takenAt', direction: 'desc'}],
    },
    {
      title: 'Date taken, oldest first',
      name: 'takenAtAsc',
      by: [{field: 'takenAt', direction: 'asc'}],
    },
  ],
  preview: {
    select: {title: 'title', subtitle: 'takenAt', media: 'image'},
    prepare: ({title, subtitle, media}) => ({
      title: title || 'Untitled photo',
      subtitle,
      media,
    }),
  },
})
