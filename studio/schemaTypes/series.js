import {defineField, defineType} from 'sanity'
import {StackIcon} from '@sanity/icons/Stack'

// A series is an optional grouping. Photos reference it with an optional field,
// so a photo can belong to a series or stand on its own.
export const series = defineType({
  name: 'series',
  title: 'Series',
  type: 'document',
  icon: StackIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required().error('Give the series a title.'),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title', maxLength: 96},
    }),
    defineField({name: 'description', title: 'Description', type: 'text', rows: 3}),
    defineField({name: 'location', title: 'Location', type: 'string'}),
    defineField({name: 'date', title: 'Date', type: 'date'}),
    defineField({
      name: 'coverPhoto',
      title: 'Cover photo',
      type: 'reference',
      to: [{type: 'photo'}],
      description: 'Optional. Choose a photo that represents the series.',
      options: {filter: ({document}) => ({
        filter: 'series._ref == $seriesId',
        params: {seriesId: (document._id || '').replace(/^drafts\./, '')},
      })},
    }),
  ],
  orderings: [
    {title: 'Date, newest first', name: 'dateDesc', by: [{field: 'date', direction: 'desc'}]},
    {title: 'Title', name: 'titleAsc', by: [{field: 'title', direction: 'asc'}]},
  ],
  preview: {
    select: {title: 'title', subtitle: 'location'},
  },
})
