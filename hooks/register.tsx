import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { COLUMNS, ROWS, frame, frameKey, type Mode } from './sprite'

const isOff = atom({ plugin: 'marin-kitagawa', key: 'isOff' } as const, false)

const LABEL: Record<Mode, string> = {
  thinking: 'düşünüyor',
  requesting: 'düşünüyor',
  responding: 'yazıyor',
  'tool-input': 'hazırlanıyor',
  'tool-use': 'çalışıyor',
}

const FPS_MS = 125
const MIN_COLUMNS = COLUMNS + 24

export const register: Register = on => {
  // Ekranda kızı çizen spinner'lar: requestId -> mod ve ekrandaki karenin kimliği.
  // Zamanlayıcı yalnızca kare değişince blit eder (göz, ağız, balon); aynı kareyi yeniden göndermek terminalde yırtılma yapar.
  const sites = new Map<string, { mode: Mode; key: string }>()
  let t = 0

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'marin', description: 'Düşünürken çıkan piksel Marin'i aç/kapat' })
    $.clock.every(FPS_MS, () => {
      t++
      for (const [requestId, site] of sites) {
        const key = frameKey(site.mode, t)
        if (key === site.key) continue
        site.key = key
        void $.ui.blit({ requestId, key: 'kiz', cells: frame(site.mode, t) }).then(r => {
          if (r.deny) sites.delete(requestId)
        })
      }
    })

    return next(e)
  })

  on('command.run', { command: 'marin' }, async $ => {
    const off = await update($, isOff, v => !v)

    return { text: off ? 'Marin kapandı.' : 'Marin açıldı.' }
  })

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    const narrow = (e.viewport?.columns ?? 80) < MIN_COLUMNS
    if (e.surface !== 'terminal' || narrow || (await read($, isOff)) || !e.requestId) return next(e)

    const mode = e.props.mode
    sites.set(e.requestId, { mode, key: frameKey(mode, t) })
    const { Box, Text, Raster } = $.ui.resolve(e)
    const text = e.props.message ?? e.props.word
    const suffix = text.endsWith('…') ? '' : e.props.suffix

    return (
      <Box flexDirection="row">
        <Raster key="kiz" columns={COLUMNS} rows={ROWS} cells={frame(mode, t)} />
        <Box flexDirection="column" justifyContent="center" marginLeft={1}>
          <Text color="#ff2d95" bold>
            {text}
            {suffix}
          </Text>
          <Text dimColor>Marin {LABEL[mode]}</Text>
        </Box>
      </Box>
    )
  })
}
