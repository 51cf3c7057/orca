import { EventEmitter } from 'node:events'
import { describe, expect, it } from 'vitest'
import { watchBrowserGuestDocument } from './watch-browser-guest-document'
import type { BrowserGuestDocumentEvent } from '../../../shared/browser/annotations/browser-guest-document-event'

describe('watchBrowserGuestDocument', () => {
  it('reports the loaded document when a viewer attaches', async () => {
    const guest = Object.assign(new EventEmitter(), {
      isDestroyed: () => false,
      isLoadingMainFrame: () => false,
      getURL: () => 'https://example.com/initial'
    }) as unknown as Electron.WebContents
    const events: BrowserGuestDocumentEvent[] = []
    const controller = new AbortController()
    const watch = watchBrowserGuestDocument(guest, (event) => events.push(event), controller.signal)

    expect(events).toEqual([
      { type: 'navigated', url: 'https://example.com/initial' },
      { type: 'domReady' }
    ])
    controller.abort()
    await watch
  })
})
