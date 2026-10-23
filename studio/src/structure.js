// Photos open newest-first by default (takenAt desc), via the `Date taken`
// ordering defined on the photo schema.
export const structure = (S, context) =>
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
      // until alt text is added and it is published. The Studio queries with the
      // drafts perspective, which strips the `drafts.` prefix from `_id` and keeps
      // it in `_originalId`, so match on that (and `_id` for the raw perspective).
      S.listItem()
        .title('Draft photos')
        .schemaType('photo')
        .child(
          S.documentList()
            .title('Draft photos')
            .schemaType('photo')
            .filter('_type == "photo" && (_originalId in path("drafts.**") || _id in path("drafts.**"))')
            .defaultOrdering([{field: '_createdAt', direction: 'desc'}]),
        ),
      S.listItem()
        .title('Photos by series')
        .child(async () => {
          // Series are fetched when the pane opens so "No series" can sit above them.
          const rows = await context
            .getClient({apiVersion: '2025-01-01'})
            .fetch('*[_type == "series"]{_id, title} | order(title asc)')
          const byId = new Map()
          rows.forEach((r) => byId.set(r._id.replace(/^drafts\./, ''), r.title))
          const photosList = (title, filter, params = {}) =>
            S.documentList()
              .title(title)
              .schemaType('photo')
              .filter(filter)
              .params(params)
              .defaultOrdering([{field: 'takenAt', direction: 'desc'}])
          return S.list()
            .title('Photos by series')
            .items([
              S.listItem()
                .id('no-series')
                .title('No series')
                .schemaType('photo')
                .child(photosList('Photos without a series', '_type == "photo" && !defined(series)')),
              S.divider(),
              ...[...byId].map(([seriesId, title]) =>
                S.listItem()
                  .id(seriesId)
                  .title(title || 'Untitled series')
                  .schemaType('photo')
                  .child(
                    photosList(title || 'Photos in series', '_type == "photo" && series._ref == $seriesId', {
                      seriesId,
                    }),
                  ),
              ),
            ])
        }),
      S.divider(),
      S.documentTypeListItem('series').title('Manage series'),
    ])
