import { expect, test } from 'claude-code/testing'

import { COLUMNS, ROWS, frame, frameKey, pixels } from '../hooks/sprite'

const SPINNER = (mode: 'thinking' | 'tool-use' | 'responding') => ({
  component: 'Spinner' as const,
  props: { word: 'Düşünüyor', message: null, suffix: '…', mode },
  viewport: { columns: 140, rows: 50 },
})

test('her kare tam boyutta ve geçerli base64', async () => {
  const bytes = COLUMNS * ROWS * 12
  for (const mode of ['thinking', 'tool-use', 'responding'] as const) {
    for (let t = 0; t < 40; t++) {
      const cells = frame(mode, t)
      expect(cells.length).toBe(Math.ceil(bytes / 3) * 4)
      expect(/^[A-Za-z0-9+/]+=*$/.test(cells)).toBe(true)
    }
  }
})

test('düşünürken animasyon kareleri değişiyor, göz kırpıyor', async () => {
  const seen = new Set<string>()
  for (let t = 0; t < 28; t++) seen.add(frame('thinking', t))
  expect(seen.size).toBeGreaterThan(4)
  // t=0 göz kapalı (kırpma), t=5 açık; ikisinde de portre aynı yükseklikte
  expect(frame('thinking', 0)).not.toBe(frame('thinking', 5))
  expect(pixels('thinking', 0).length).toBe(ROWS * 2)
})

test('portre kaymıyor; değişmeyen kare yeniden gönderilmiyor', async () => {
  // t=7 ile t=8 arası eskiden "nefes" kayması vardı: portre bölgesi birebir aynı kalmalı
  const portrait = (t: number) => pixels('thinking', t).map(row => row.slice(0, (COLUMNS - 14) * 2).join(','))
  expect(portrait(8)).toEqual(portrait(7))
  expect(frameKey('thinking', 4)).toBe(frameKey('thinking', 5))
  expect(frameKey('thinking', 5)).not.toBe(frameKey('thinking', 6))
})

test('terminalde spinner yerine Marin ve Türkçe durum yazısı çiziliyor', async $ => {
  const ui = await $.ui.mount({ plugin: 'marin-kitagawa', surface: 'terminal', ...SPINNER('thinking') })
  expect(await ui.find({ type: 'Raster' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Marin düşünüyor/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Düşünüyor…/ })).toBeDefined()
  await ui.unmount()
})

test('/marin kapatınca motorun kendi spinner\'ı dönüyor', async ($, on) => {
  // Motorun yerine geçen alt katman: kendi spinner'ını "motor" yazısıyla çizer.
  on('ui.render', { component: 'Spinner' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>motor</Text>
  })
  const off = await $.command.run({ command: 'marin', args: '' })
  expect(JSON.stringify(off)).toContain('kapandı')
  const ui = await $.ui.mount({ plugin: 'marin-kitagawa', surface: 'terminal', ...SPINNER('thinking') })
  expect(await ui.find({ type: 'Raster' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /motor/ })).toBeDefined()
  await ui.unmount()
})
