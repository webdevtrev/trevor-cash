import {useCallback, useEffect, useRef, useState} from 'react'
import {useClient} from 'sanity'
import {
  Box,
  Button,
  Card,
  Container,
  Flex,
  Select,
  Stack,
  Text,
  TextInput,
} from '@sanity/ui'

const CONCURRENCY = 3
const EMPTY_FIELDS = {seriesId: '', filmStock: '', tone: '', location: '', takenAt: ''}

// "IMG_1234-sunset.JPG" -> "IMG 1234 sunset"
const titleFromName = (name) =>
  name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()

const STATE_LABEL = {
  staged: 'ready',
  waiting: 'waiting',
  uploading: 'uploading',
  done: 'done',
}

// 1. Choose or drop images (they are only staged, nothing uploads yet).
// 2. Optionally fill in details that apply to every photo in the batch.
// 3. Press the upload button. Each image becomes a draft `photo` document: open
//    them in Photos to add details, then publish.
// 4. Reset clears the batch so the next one starts clean.
export function BulkUpload() {
  const client = useClient({apiVersion: '2025-01-01'})
  const input = useRef(null)
  const rowsRef = useRef([])
  const [series, setSeries] = useState([])
  const [fields, setFields] = useState(EMPTY_FIELDS)
  const [keepFields, setKeepFields] = useState(false)
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)

  rowsRef.current = rows

  useEffect(() => {
    client
      .fetch('*[_type == "series" && !(_id in path("drafts.**"))] | order(title asc){_id, title}')
      .then(setSeries)
      .catch(() => setSeries([]))
  }, [client])

  // Free the preview thumbnails when the tool closes.
  useEffect(
    () => () => rowsRef.current.forEach((r) => URL.revokeObjectURL(r.preview)),
    [],
  )

  const setField = (name) => (e) => {
    const value = e.currentTarget.value
    setFields((f) => ({...f, [name]: value}))
  }

  const patchRow = (key, patch) =>
    setRows((r) => r.map((row) => (row.key === key ? {...row, ...patch} : row)))

  const stage = useCallback((files) => {
    const images = [...files].filter((f) => f.type.startsWith('image/'))
    if (!images.length) return
    setRows((r) => [
      ...r,
      ...images.map((file) => ({
        key: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        state: 'staged',
      })),
    ])
  }, [])

  const remove = (key) => {
    const row = rows.find((r) => r.key === key)
    if (row) URL.revokeObjectURL(row.preview)
    setRows((r) => r.filter((x) => x.key !== key))
  }

  const reset = () => {
    rows.forEach((r) => URL.revokeObjectURL(r.preview))
    setRows([])
    if (!keepFields) setFields(EMPTY_FIELDS)
  }

  const queue = rows.filter((r) => r.state === 'staged' || r.state === 'error')

  const submit = async () => {
    const targets = queue
    if (!targets.length || busy) return
    const details = {...fields} // the values at the moment of submitting
    setBusy(true)
    targets.forEach((t) => patchRow(t.key, {state: 'waiting', message: undefined}))
    let next = 0
    const worker = async () => {
      while (next < targets.length) {
        const row = targets[next++]
        patchRow(row.key, {state: 'uploading'})
        try {
          const asset = await client.assets.upload('image', row.file, {filename: row.file.name})
          const doc = {
            _id: `drafts.${crypto.randomUUID()}`,
            _type: 'photo',
            title: titleFromName(row.file.name),
            image: {_type: 'image', asset: {_type: 'reference', _ref: asset._id}},
            ...(details.seriesId
              ? {series: {_type: 'reference', _ref: details.seriesId}}
              : {}),
            ...(details.filmStock.trim() ? {filmStock: details.filmStock.trim()} : {}),
            ...(details.tone ? {tone: details.tone} : {}),
            ...(details.location.trim() ? {location: details.location.trim()} : {}),
            ...(details.takenAt ? {takenAt: details.takenAt} : {}),
          }
          await client.create(doc)
          patchRow(row.key, {state: 'done'})
        } catch (err) {
          patchRow(row.key, {state: 'error', message: err.message})
        }
      }
    }
    await Promise.all(Array.from({length: Math.min(CONCURRENCY, targets.length)}, worker))
    setBusy(false)
  }

  const done = rows.filter((r) => r.state === 'done').length
  const failed = rows.filter((r) => r.state === 'error').length
  const submitLabel = busy
    ? 'Uploading…'
    : `Upload ${queue.length} photo${queue.length === 1 ? '' : 's'}`

  return (
    <Box style={{height: '100%', overflow: 'auto'}}>
      <Container width={1} padding={5}>
        <Stack gap={5}>
          <Stack gap={3}>
            <Text size={4} weight="bold">Bulk upload photos</Text>
            <Text muted size={1}>
              Add images, fill in any details they share, then press Upload. Each image becomes a
              draft photo titled from its filename. Open them in Photos to add more
              details, then publish.
            </Text>
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
              stage(e.dataTransfer.files)
            }}
          >
            <Stack gap={3}>
              <Text>Drag and drop images here</Text>
              <Box>
                <Button
                  text="Choose images…"
                  mode="ghost"
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
                stage(e.currentTarget.files)
                e.currentTarget.value = ''
              }}
            />
          </Card>

          <Card padding={4} border radius={2}>
            <Stack gap={4}>
              <Text size={1} weight="semibold">Details for this batch (all optional)</Text>

              <Stack gap={2}>
                <Text size={1} muted>Series</Text>
                <Select value={fields.seriesId} onChange={setField('seriesId')} disabled={busy}>
                  <option value="">No series</option>
                  {series.map((s) => (
                    <option key={s._id} value={s._id}>{s.title}</option>
                  ))}
                </Select>
              </Stack>

              <Stack gap={2}>
                <Text size={1} muted>Film type</Text>
                <TextInput
                  value={fields.filmStock}
                  onChange={setField('filmStock')}
                  placeholder="e.g. Kodak Portra 400"
                  disabled={busy}
                />
              </Stack>

              <Stack gap={2}>
                <Text size={1} muted>Colour or black &amp; white</Text>
                <Select value={fields.tone} onChange={setField('tone')} disabled={busy}>
                  <option value="">Not set</option>
                  <option value="colour">Colour</option>
                  <option value="bw">Black &amp; white</option>
                </Select>
              </Stack>

              <Stack gap={2}>
                <Text size={1} muted>Date taken</Text>
                <TextInput
                  type="date"
                  value={fields.takenAt}
                  onChange={setField('takenAt')}
                  disabled={busy}
                />
              </Stack>

              <Stack gap={2}>
                <Text size={1} muted>Location</Text>
                <TextInput
                  value={fields.location}
                  onChange={setField('location')}
                  placeholder="e.g. Dayton, OH"
                  disabled={busy}
                />
              </Stack>
            </Stack>
          </Card>

          <Stack gap={3}>
            <Flex gap={3} align="center" wrap="wrap">
              <Button
                text={submitLabel}
                tone="positive"
                disabled={busy || queue.length === 0}
                onClick={submit}
              />
              <Button
                text="Reset"
                mode="ghost"
                disabled={busy || (rows.length === 0 && fields === EMPTY_FIELDS)}
                onClick={reset}
              />
              <label style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
                <input
                  type="checkbox"
                  checked={keepFields}
                  onChange={(e) => setKeepFields(e.currentTarget.checked)}
                />
                <Text size={1} muted>Keep details when resetting</Text>
              </label>
            </Flex>
            <Text size={1} muted>
              Details are applied to every photo in the upload. Reset clears the images and
              results so the next batch starts fresh.
            </Text>
          </Stack>

          {rows.length > 0 && (
            <Stack gap={3}>
              <Text size={1} weight="semibold">
                {rows.length} photo{rows.length === 1 ? '' : 's'}
                {done ? ` · ${done} uploaded` : ''}
                {failed ? ` · ${failed} failed` : ''}
              </Text>
              <Card border radius={2}>
                {rows.map((r, i) => (
                  <Card
                    key={r.key}
                    padding={3}
                    borderTop={i > 0}
                    tone={r.state === 'error' ? 'critical' : 'default'}
                  >
                    <Flex align="center" gap={3}>
                      <img
                        src={r.preview}
                        alt=""
                        style={{width: 40, height: 40, objectFit: 'cover', borderRadius: 2}}
                      />
                      <Box flex={1} style={{minWidth: 0}}>
                        <Text size={1} textOverflow="ellipsis">{r.file.name}</Text>
                      </Box>
                      <Text size={1} muted={r.state !== 'error'} style={{whiteSpace: 'nowrap'}}>
                        {r.state === 'error' ? `Failed: ${r.message}` : STATE_LABEL[r.state]}
                      </Text>
                      {(r.state === 'staged' || r.state === 'error') && (
                        <Button
                          text="Remove"
                          mode="bleed"
                          fontSize={1}
                          padding={2}
                          disabled={busy}
                          onClick={() => remove(r.key)}
                        />
                      )}
                    </Flex>
                  </Card>
                ))}
              </Card>
            </Stack>
          )}
        </Stack>
      </Container>
    </Box>
  )
}
