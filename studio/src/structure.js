// Photos open newest-first by default (takenAt desc), via the `Date taken`
// ordering defined on the photo schema.
export const structure = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Photos')
        .schemaType('photo')
        .child(
          S.documentTypeList('photo')
            .title('Photos')
            .defaultOrdering([{field: 'takenAt', direction: 'desc'}]),
        ),
    ])
