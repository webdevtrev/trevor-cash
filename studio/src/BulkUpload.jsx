import {useCallback, useEffect, useRef, useState} from 'react'
import {useClient} from 'sanity'
import {ChevronDownIcon} from '@sanity/icons/ChevronDown'
import {ChevronUpIcon} from '@sanity/icons/ChevronUp'
import {DragHandleIcon} from '@sanity/icons/DragHandle'
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
// The Studio's global styles can strip native checkbox rendering, so restore it.
const CHECKBOX_STYLE = {
  appearance: 'auto',
  WebkitAppearance: 'checkbox',
  position: 'static',
  opacity: 1,
  width: 16,
  height: 16,
  margin: 0,
  flex: 'none',
  accentColor: '#2276fc',
}
const EMPTY_FIELDS = {seriesId: '', filmStock: '', tone: '', location: '', takenAt: '', publish: false, numberFrames: true}

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
  const [stocks, setStocks] = useState([])
  const [fields, setFields] = useState(EMPTY_FIELDS)
  const [keepFields, setKeepFields] = useState(false)
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [dragKey, setDragKey] = useState(null)
  const [overKey, setOverKey] = useState(null)

  rowsRef.current = rows

  useEffect(() => {
    client
      .fetch('*[_type == "series" && !(_id in path("drafts.**"))] | order(title asc){_id, title}')
      .then(setSeries)
      .catch(() => setSeries([]))
  }, [client])

  // Film types already used on any photo, offered as suggestions while typing.
  useEffect(() => {
    client
      .fetch('array::unique(*[_type == "photo" && defined(filmStock)].filmStock)')
      .then((list) => setStocks([...list].sort((a, b) => a.localeCompare(b))))
      .catch(() => setStocks([]))
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
        title: titleFromName(file.name),
        state: 'staged',
      })),
    ])
  }, [])

  const remove = (key) => {
    const row = rows.find((r) => r.key === key)
    if (row) URL.revokeObjectURL(row.preview)
    setRows((r) => r.filter((x) => x.key !== key))
  }

  // Move a row to the position currently held by `toKey` (or by index).
  const moveRow = (key, to) =>
    setRows((r) => {
      const from = r.findIndex((x) => x.key === key)
      const dest = typeof to === 'number' ? to : r.findIndex((x) => x.key === to)
      if (from < 0 || dest < 0 || dest >= r.length || from === dest) return r
      const next = [...r]
      next.splice(dest, 0, next.splice(from, 1)[0])
      return next
    })

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
    // A photo's place in the list is its frame number on the roll.
    const position = new Map(rowsRef.current.map((r, i) => [r.key, i + 1]))
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
            _id: details.publish ? crypto.randomUUID() : `drafts.${crypto.randomUUID()}`,
            _type: 'photo',
            title: row.title.trim() || titleFromName(row.file.name),
            image: {_type: 'image', asset: {_type: 'reference', _ref: asset._id}},
            ...(details.seriesId
              ? {series: {_type: 'reference', _ref: details.seriesId}}
              : {}),
            ...(details.filmStock.trim() ? {filmStock: details.filmStock.trim()} : {}),
            ...(details.tone ? {tone: details.tone} : {}),
            ...(details.location.trim() ? {location: details.location.trim()} : {}),
            ...(details.takenAt ? {takenAt: details.takenAt} : {}),
            ...(details.numberFrames ? {frame: String(position.get(row.key))} : {}),
          }
          await client.create(doc)
          patchRow(row.key, {state: 'done'})
        } catch (err) {
          patchRow(row.key, {state: 'error', message: err.message})
        }
      }
    }
    await Promise.all(Array.from({length: Math.min(CONCURRENCY, targets.length)}, worker))
    const used = details.filmStock.trim()
    if (used) setStocks((l) => (l.includes(used) ? l : [...l, used].sort((a, b) => a.localeCompare(b))))
    setBusy(false)
  }

  const done = rows.filter((r) => r.state === 'done').length
  const failed = rows.filter((r) => r.state === 'error').length
  const submitLabel = busy
    ? 'Uploading…'
    : `${fields.publish ? 'Upload and publish' : 'Upload'} ${queue.length} photo${
        queue.length === 1 ? '' : 's'
      }`

  return (
    <Box style={{height: '100%', overflow: 'auto'}}>
      <Container width={2} padding={5}>
        <Stack gap={5}>
          <Stack gap={3}>
            <Text size={4} weight="bold">Bulk upload photos</Text>
            <Text muted size={1}>
              Add images, fill in any details they share, then press Upload. Each image becomes a
              photo titled from its filename; edit the titles in the list before uploading. Photos
              are saved as drafts unless you tick Publish immediately.
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
                  placeholder="Type to search, or enter a new one"
                  list="bulk-upload-film-types"
                  autoComplete="off"
                  disabled={busy}
                />
                <datalist id="bulk-upload-film-types">
                  {stocks.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
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

              <label style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
                <input
                  type="checkbox"
                  style={CHECKBOX_STYLE}
                  checked={fields.numberFrames}
                  disabled={busy}
                  onChange={(e) => {
                    const numberFrames = e.currentTarget.checked
                    setFields((f) => ({...f, numberFrames}))
                  }}
                />
                <Text size={1}>Number frames from the order of the list below</Text>
              </label>

              <label style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
                <input
                  type="checkbox"
                  style={CHECKBOX_STYLE}
                  checked={fields.publish}
                  disabled={busy}
                  onChange={(e) => {
                    const publish = e.currentTarget.checked
                    setFields((f) => ({...f, publish}))
                  }}
                />
                <Text size={1}>Publish immediately (skip drafts, photos go live on the site)</Text>
              </label>
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
                  style={CHECKBOX_STYLE}
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
                {rows.map((r, i) => {
                  const editable = r.state === 'staged' || r.state === 'error'
                  return (
                    <Card
                      key={r.key}
                      data-row
                      padding={3}
                      borderTop={i > 0}
                      tone={r.state === 'error' ? 'critical' : 'default'}
                      onDragOver={(e) => {
                        if (!dragKey) return
                        e.preventDefault()
                        setOverKey(r.key)
                      }}
                      onDrop={(e) => {
                        if (!dragKey) return
                        e.preventDefault()
                        moveRow(dragKey, r.key)
                        setDragKey(null)
                        setOverKey(null)
                      }}
                      style={{
                        opacity: dragKey === r.key ? 0.4 : 1,
                        boxShadow:
                          overKey === r.key && dragKey && dragKey !== r.key
                            ? 'inset 0 3px 0 0 #2276fc'
                            : undefined,
                      }}
                    >
                      <Flex align="center" gap={3}>
                        <Flex align="center" gap={1} style={{flex: 'none'}}>
                          <span
                            draggable={!busy}
                            title="Drag to reorder"
                            style={{cursor: busy ? 'default' : 'grab', display: 'flex'}}
                            onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = 'move'
                              e.dataTransfer.setData('text/plain', r.key)
                              const row = e.currentTarget.closest('[data-row]')
                              if (row) e.dataTransfer.setDragImage(row, 16, 16)
                              setDragKey(r.key)
                            }}
                            onDragEnd={() => {
                              setDragKey(null)
                              setOverKey(null)
                            }}
                          >
                            <Text size={2} muted>
                              <DragHandleIcon />
                            </Text>
                          </span>
                          <Flex direction="column">
                            <Button
                              icon={ChevronUpIcon}
                              mode="bleed"
                              padding={1}
                              aria-label="Move up"
                              disabled={busy || i === 0}
                              onClick={() => moveRow(r.key, i - 1)}
                            />
                            <Button
                              icon={ChevronDownIcon}
                              mode="bleed"
                              padding={1}
                              aria-label="Move down"
                              disabled={busy || i === rows.length - 1}
                              onClick={() => moveRow(r.key, i + 1)}
                            />
                          </Flex>
                        </Flex>
                        <Box style={{width: 40, flex: 'none', textAlign: 'center'}}>
                          <Text size={2} weight="semibold" muted={!fields.numberFrames}>
                            {i + 1}
                          </Text>
                        </Box>
                        <img
                          src={r.preview}
                          alt=""
                          style={{
                            width: 140,
                            height: 140,
                            flex: 'none',
                            objectFit: 'contain',
                            borderRadius: 2,
                            background: 'rgba(128, 128, 128, 0.15)',
                          }}
                        />
                        <Box flex={1} style={{minWidth: 0}}>
                          <Stack gap={2}>
                            {editable ? (
                              <TextInput
                                fontSize={1}
                                padding={2}
                                value={r.title}
                                placeholder={r.file.name}
                                aria-label={`Title for ${r.file.name}`}
                                disabled={busy}
                                onChange={(e) => patchRow(r.key, {title: e.currentTarget.value})}
                              />
                            ) : (
                              <Text size={1} textOverflow="ellipsis">{r.title || r.file.name}</Text>
                            )}
                            <Text size={0} muted textOverflow="ellipsis">{r.file.name}</Text>
                          </Stack>
                        </Box>
                        <Text size={1} muted={r.state !== 'error'} style={{whiteSpace: 'nowrap'}}>
                          {r.state === 'error' ? `Failed: ${r.message}` : STATE_LABEL[r.state]}
                        </Text>
                        {editable && (
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
                  )
                })}
              </Card>
            </Stack>
          )}
        </Stack>
      </Container>
    </Box>
  )
}
