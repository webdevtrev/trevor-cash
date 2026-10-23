import {useCallback, useEffect, useRef, useState} from 'react'
import {useClient} from 'sanity'
import {Box, Button, Card, Container, Flex, Select, Stack, Text} from '@sanity/ui'

const CONCURRENCY = 3

// "IMG_1234-sunset.JPG" -> "IMG 1234 sunset"
const titleFromName = (name) =>
  name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()

// Pick many image files (or drop them), optionally choose a series, and get one
// draft `photo` document per file. Drafts are not published: open each to add
// the required alt text, then publish.
export function BulkUpload() {
  const client = useClient({apiVersion: '2025-01-01'})
  const input = useRef(null)
  const [series, setSeries] = useState([])
  const [seriesId, setSeriesId] = useState('')
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    client
      .fetch('*[_type == "series" && !(_id in path("drafts.**"))] | order(title asc){_id, title}')
      .then(setSeries)
      .catch(() => setSeries([]))
  }, [client])

  const update = (i, patch) =>
    setRows((r) => r.map((row, j) => (j === i ? {...row, ...patch} : row)))

  const upload = useCallback(
    async (files) => {
      const images = [...files].filter((f) => f.type.startsWith('image/'))
      if (!images.length) return
      setBusy(true)
      const start = rows.length
      setRows((r) => [...r, ...images.map((f) => ({name: f.name, state: 'waiting'}))])
      let next = 0
      const worker = async () => {
        while (next < images.length) {
          const n = next++
          const file = images[n]
          const i = start + n
          update(i, {state: 'uploading'})
          try {
            const asset = await client.assets.upload('image', file, {filename: file.name})
            const doc = {
              _id: `drafts.${crypto.randomUUID()}`,
              _type: 'photo',
              title: titleFromName(file.name),
              image: {_type: 'image', asset: {_type: 'reference', _ref: asset._id}},
              ...(seriesId ? {series: {_type: 'reference', _ref: seriesId}} : {}),
            }
            const created = await client.create(doc)
            update(i, {state: 'done', id: created._id.replace(/^drafts\./, '')})
          } catch (err) {
            update(i, {state: 'error', message: err.message})
          }
        }
      }
      await Promise.all(Array.from({length: Math.min(CONCURRENCY, images.length)}, worker))
      setBusy(false)
    },
    [client, rows.length, seriesId],
  )

  const done = rows.filter((r) => r.state === 'done').length
  const failed = rows.filter((r) => r.state === 'error').length

  return (
    <Container width={2} padding={4}>
      <Stack space={4}>
        <Text size={4} weight="bold">Bulk upload photos</Text>
        <Text muted size={1}>
          Each image becomes a draft photo titled from its filename. Open them in Photos to add alt
          text (required) and details, then publish.
        </Text>

        <Stack space={2}>
          <Text size={1} weight="semibold">Add all to a series (optional)</Text>
          <Select value={seriesId} onChange={(e) => setSeriesId(e.currentTarget.value)} disabled={busy}>
            <option value="">No series</option>
            {series.map((s) => (
              <option key={s._id} value={s._id}>{s.title}</option>
            ))}
          </Select>
        </Stack>

        <Card
          padding={6}
          border
          radius={2}
          tone={dragging ? 'primary' : 'default'}
          style={{borderStyle: 'dashed', textAlign: 'center'}}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            upload(e.dataTransfer.files)
          }}
        >
          <Stack space={3}>
            <Text>Drag and drop images here</Text>
            <Box>
              <Button
                text="Choose images…"
                tone="primary"
                disabled={busy}
                onClick={() => input.current && input.current.click()}
              />
            </Box>
          </Stack>
          <input
            ref={input}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              upload(e.currentTarget.files)
              e.currentTarget.value = ''
            }}
          />
        </Card>

        {rows.length > 0 && (
          <Stack space={2}>
            <Text size={1} weight="semibold">
              {done} of {rows.length} uploaded{failed ? `, ${failed} failed` : ''}
            </Text>
            {rows.map((r, i) => (
              <Flex key={i} justify="space-between" gap={3}>
                <Text size={1} textOverflow="ellipsis">{r.name}</Text>
                <Text size={1} muted={r.state !== 'error'} style={{whiteSpace: 'nowrap'}}>
                  {r.state === 'error' ? `Failed: ${r.message}` : r.state}
                </Text>
              </Flex>
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  )
}
