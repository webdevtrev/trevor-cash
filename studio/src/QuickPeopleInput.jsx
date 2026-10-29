import {useEffect, useState} from 'react'
import {insert, setIfMissing, useClient, useFormValue} from 'sanity'
import {AddIcon} from '@sanity/icons/Add'
import {CheckmarkIcon} from '@sanity/icons/Checkmark'
import {Button, Flex, Text} from '@sanity/ui'

const TOP_COUNT = 10
// `$series` is empty for the overall ranking, so the same query serves both.
const QUERY = `*[_type == "person"]{
  _id, name,
  "count": count(*[_type == "photo" && ($series == "" || series._ref == $series) && references(^._id)])
} | order(count desc, name asc)[0...$limit]`

// Wraps the default People array input with one-press buttons for the people
// tagged most often in this photo's series (or overall when it has none), so common tags don't need a search each time.
export function QuickPeopleInput(props) {
  const {value, onChange, renderDefault} = props
  const client = useClient({apiVersion: '2025-01-01'})
  const seriesId = useFormValue(['series', '_ref']) || ''
  const [top, setTop] = useState([])

  useEffect(() => {
    let cancelled = false
    const fetchTop = (series) => client.fetch(QUERY, {limit: TOP_COUNT, series})
    const named = (rows) => rows.filter((p) => p.name)
    const load = async () => {
      let rows = named(await fetchTop(seriesId)).filter((p) => !seriesId || p.count > 0)
      // A new or sparse series: top up from the overall ranking.
      if (seriesId && rows.length < TOP_COUNT) {
        const seen = new Set(rows.map((p) => p._id))
        const overall = named(await fetchTop('')).filter((p) => !seen.has(p._id))
        rows = [...rows, ...overall].slice(0, TOP_COUNT)
      }
      if (!cancelled) setTop(rows)
    }
    load().catch(() => {})
    return () => {
      cancelled = true
    }
  }, [client, seriesId])

  const tagged = new Set((value || []).map((item) => item._ref))
  const add = (id) =>
    onChange([
      setIfMissing([]),
      insert([{_type: 'reference', _key: crypto.randomUUID().slice(0, 12), _ref: id}], 'after', [-1]),
    ])

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 16}}>
      {top.length > 0 && (
        <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
          <Text size={1} weight="medium" muted>
            {seriesId ? 'Most tagged in this series' : 'Most tagged'}
          </Text>
          <Flex gap={3} wrap="wrap">
            {top.map((p) => (
              <Button
                key={p._id}
                type="button"
                mode={tagged.has(p._id) ? 'bleed' : 'ghost'}
                tone={tagged.has(p._id) ? 'positive' : 'primary'}
                radius="full"
                fontSize={1}
                paddingY={2}
                paddingLeft={2}
                paddingRight={3}
                icon={tagged.has(p._id) ? CheckmarkIcon : AddIcon}
                text={p.name}
                disabled={tagged.has(p._id) || props.readOnly}
                onClick={() => add(p._id)}
              />
            ))}
          </Flex>
        </div>
      )}
      {renderDefault(props)}
    </div>
  )
}
