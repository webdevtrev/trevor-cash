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
      // Everything with unpublished changes, which includes each bulk upload
      // until alt text is added and it is published.
      S.listItem()
        .title('Draft photos')
        .schemaType('photo')
        .child(
          S.documentList()
            .title('Draft photos')
            .schemaType('photo')
            .filter('_type == "photo" && _id in path("drafts.**")')
            .defaultOrdering([{field: '_createdAt', direction: 'desc'}]),
        ),
      S.listItem()
        .title('Photos by series')
        .child(
          S.documentTypeList('series')
            .title('Series')
            .child((seriesId) =>
              S.documentList()
                .title('Photos in series')
                .schemaType('photo')
                .filter('_type == "photo" && series._ref == $seriesId')
                .params({seriesId})
                .defaultOrdering([{field: 'takenAt', direction: 'desc'}]),
            ),
        ),
      S.divider(),
      S.documentTypeListItem('series').title('Manage series'),
    ])
