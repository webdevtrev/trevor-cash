import {defineField, defineType} from 'sanity'
import {UserIcon} from '@sanity/icons/User'

// People are tagged on photos with the `people` field. They are only used in
// the Studio for now; nothing on the public site reads them.
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
  ],
  orderings: [{title: 'Name', name: 'nameAsc', by: [{field: 'name', direction: 'asc'}]}],
  preview: {select: {title: 'name'}},
})
