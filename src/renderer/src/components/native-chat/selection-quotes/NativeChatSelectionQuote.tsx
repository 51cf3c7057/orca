import { useRef, type RefObject } from 'react'
import { useAppStore } from '../../../store/index'
import type { NativeChatComposerHandle } from '../composer/native-chat-composer-types'
import { useShortcutKeyComboDetails } from '@/lib/keyboard/useShortcutLabel'
import { isWebClientLocation } from '@/app-shell/platform/web-client-location'
import { readNativeChatTranscriptSelection } from './native-chat-transcript-selection'
import { SelectionAddToChatPopover } from './SelectionAddToChatPopover'
import {
  addNativeChatQuote,
  readNativeChatComposerQuotable,
  useNativeChatAddSelectionShortcut
} from './use-native-chat-add-selection-shortcut'

function copyTranscriptSelectionOnSelect(root: HTMLElement): void {
  if (!useAppStore.getState().settings?.terminalClipboardOnSelect) {
    return
  }
  const text = readNativeChatTranscriptSelection(root)
  if (text) {
    // Swallowed like the terminal's copy on select: a failed copy leaves the selection to retry.
    void window.api.ui.writeClipboardText(text).catch(() => {})
  }
}

export function NativeChatSelectionQuote({
  rootRef,
  composerRef,
  enabled
}: {
  rootRef: RefObject<HTMLElement | null>
  composerRef: RefObject<NativeChatComposerHandle | null>
  enabled: boolean
}): React.JSX.Element {
  const dismissOfferRef = useRef<(() => void) | null>(null)
  const [shortcut] = useShortcutKeyComboDetails('chat.addSelectionToChat')
  useNativeChatAddSelectionShortcut({
    rootRef,
    composerRef,
    enabled,
    onAdded: () => dismissOfferRef.current?.()
  })
  return (
    <SelectionAddToChatPopover
      rootRef={rootRef}
      enabled={enabled}
      readQuotable={(root) => readNativeChatComposerQuotable(root, composerRef.current)}
      onSelectionSettled={copyTranscriptSelectionOnSelect}
      onAdd={(text) => addNativeChatQuote(composerRef.current, text)}
      shortcut={isWebClientLocation() ? undefined : shortcut}
      dismissRef={dismissOfferRef}
    />
  )
}
