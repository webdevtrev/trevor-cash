import {defineField, defineType} from 'sanity'
import {UserIcon} from '@sanity/icons/User'

// People are tagged on photos with the `people` field. They are only used in
// the Studio, plus their name and optional avatar on the /photos People filter.
export const person = defineType({
  name: 'person',
  title: 'Person',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (rule) => rule.required().error('Give the person a name.'),
    }),
    defineField({
      name: 'avatar',
      title: 'Photo',
      type: 'image',
      options: {hotspot: true},
      description:
        'Optional. Shown on the People filter at /photos. Drag the hotspot onto their face: the round avatar is cropped around it.',
    }),
  ],
  orderings: [{title: 'Name', name: 'nameAsc', by: [{field: 'name', direction: 'asc'}]}],
  preview: {select: {title: 'name', media: 'avatar'}},
})
