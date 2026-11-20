import { useEffect, useEffectEvent, type RefObject } from 'react'
import { keybindingMatchesAction } from '../../../../../shared/keybindings/matching'
import {
  formatNativeChatQuote,
  readNativeChatQuotableSelection
} from '../../../../../shared/native-chat/input/quotes/native-chat-quote-selection'
import { getShortcutPlatform } from '@/lib/keyboard/shortcut-platform'
import { isWebClientLocation } from '@/app-shell/platform/web-client-location'
import { addAppKeyListener, removeAppKeyListener } from '@/lib/keyboard/app-keyboard-router'
import { useAppStore } from '../../../store/index'
import type { NativeChatComposerHandle } from '../composer/native-chat-composer-types'
import type { QuotableSelection } from './SelectionAddToChatPopover'

/** The transcript selection the hover offer and the shortcut both take, or null when there is none. */
export function readNativeChatComposerQuotable(
  root: HTMLElement,
  composer: NativeChatComposerHandle | null
): QuotableSelection | null {
  return composer?.acceptsText() ? readNativeChatQuotableSelection(root) : null
}

export function addNativeChatQuote(composer: NativeChatComposerHandle | null, text: string): void {
  composer?.appendText(formatNativeChatQuote(text))
}

/** Adds the transcript selection to this chat's composer on the key bound to chat.addSelectionToChat. */
export function useNativeChatAddSelectionShortcut({
  rootRef,
  composerRef,
  enabled,
  onAdded
}: {
  rootRef: RefObject<HTMLElement | null>
  composerRef: RefObject<NativeChatComposerHandle | null>
  enabled: boolean
  /** Runs after the quote is added, so the hover offer can close as a click would close it. */
  onAdded?: () => void
}): void {
  const added = useEffectEvent(() => onAdded?.())

  useEffect(() => {
    // Out of scope in the web client: the browser keeps its own Mod+L there.
    if (!enabled || isWebClientLocation()) {
      return
    }
    const platform = getShortcutPlatform()
    const onKeyDown = (e: KeyboardEvent): void => {
      const root = rootRef.current
      if (e.defaultPrevented || !root || !(e.target instanceof Node) || !root.contains(e.target)) {
        return
      }
      if (
        !keybindingMatchesAction(
          'chat.addSelectionToChat',
          e,
          platform,
          useAppStore.getState().keybindings
        )
      ) {
        return
      }
      const quotable = readNativeChatComposerQuotable(root, composerRef.current)
      if (!quotable) {
        return
      }
      e.preventDefault()
      e.stopPropagation()
      if (!e.repeat) {
        addNativeChatQuote(composerRef.current, quotable.text)
        added()
      }
    }
    addAppKeyListener('keydown', onKeyDown)
    return () => removeAppKeyListener('keydown', onKeyDown)
  }, [composerRef, enabled, rootRef])
}
