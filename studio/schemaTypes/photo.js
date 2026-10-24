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
      description:
        'Optional. Describe the photo for people using screen readers; the title is used if left empty.',
    }),
    defineField({name: 'takenAt', title: 'Date taken', type: 'date'}),
    defineField({name: 'location', title: 'Location', type: 'string'}),
    defineField({name: 'caption', title: 'Caption', type: 'text', rows: 3}),
    defineField({
      name: 'tone',
      title: 'Colour or black & white',
      type: 'string',
      options: {
        list: [
          {title: 'Colour', value: 'colour'},
          {title: 'Black & white', value: 'bw'},
        ],
        layout: 'radio',
      },
      description: 'Optional. Powers the Colour / B&W filter on the Index page.',
    }),
    defineField({
      name: 'filmStock',
      title: 'Film stock',
      type: 'string',
      description: 'Optional, e.g. Kodak Portra 400. Shown on the film strip.',
    }),
    defineField({
      name: 'frame',
      title: 'Frame number',
      type: 'string',
      description: 'Optional, the frame on the roll, e.g. 35. Shown as ▸ 35A.',
    }),
    defineField({
      name: 'series',
      title: 'Series',
      type: 'reference',
      to: [{type: 'series'}],
      description: 'Optional. Leave empty for a standalone photo.',
    }),
    defineField({
      name: 'people',
      title: 'People',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'person'}]}],
      description: 'Optional. Tag the people in this photo. Pick an existing person or create a new one.',
      validation: (rule) => rule.unique(),
    }),
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
    select: {title: 'title', date: 'takenAt', series: 'series.title', media: 'image'},
    prepare: ({title, date, series, media}) => ({
      title: title || 'Untitled photo',
      subtitle: [series, date].filter(Boolean).join(' · '),
      media,
    }),
  },
})
