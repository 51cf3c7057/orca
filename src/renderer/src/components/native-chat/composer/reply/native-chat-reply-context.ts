import { useLayoutEffect, type RefObject } from 'react'
import { createNativeChatReplyTarget, setNativeChatReplyTarget } from './native-chat-reply-target'
import { nativeChatPrimaryComposer } from '../focus/native-chat-composer-destination'
import { resolveNativeChatDraftOwner } from '../../drafts/native-chat-draft-owner'
import { useAppStore } from '@/store'

export type NativeChatReplySource = {
  messageId: string
  author: 'agent' | 'user'
  text: string
}

/** Points the chat's message box at `source` and hands the user back to typing there. Does nothing
 *  while the box is not shown (a question card answers instead); a queued-message editor never takes it. */
export function startNativeChatReply(from: Element | null, source: NativeChatReplySource): boolean {
  const root = from?.closest<HTMLElement>('[data-native-chat-root]') ?? null
  const composer = nativeChatPrimaryComposer(root)
  if (!composer) {
    return false
  }
  const owner = resolveNativeChatDraftOwner(useAppStore.getState(), composer.scopeKey)
  setNativeChatReplyTarget(composer.scopeKey, {
    ...createNativeChatReplyTarget(source),
    ...(owner ? { owner } : {})
  })
  composer.handle.focus()
  return true
}

/** A message jump the transcript answers when it holds that message; `found` reports whether it did. */
const REVEAL_MESSAGE_EVENT = 'native-chat:reveal-message'
/** Fired on the chat root when the transcript's messages change, so availability is asked again. */
export const NATIVE_CHAT_MESSAGES_CHANGED_EVENT = 'native-chat:messages-changed'
type RevealMessageDetail = {
  messageId: string
  excerpt?: string
  probe: boolean
  found: string | null
}

/** With `probe`, only asks whether the transcript holds the message; `focus` moves focus to it once it lands. */
export function requestNativeChatMessageReveal(
  from: Element | null,
  message: { messageId: string; excerpt?: string },
  options: { probe: boolean; focus?: boolean }
): boolean {
  const root = from?.closest('[data-native-chat-root]')
  if (!root) {
    return false
  }
  const detail: RevealMessageDetail = { ...message, probe: options.probe, found: null }
  root.dispatchEvent(new CustomEvent(REVEAL_MESSAGE_EVENT, { detail }))
  if (detail.found && !options.probe) {
    markNativeChatRevealedMessage(root, detail.found, options.focus === true)
  }
  return detail.found !== null
}

const LANDED_MS = 1500
const LANDING_FRAMES = 60

/** Once the jumped-to row is drawn: outline it briefly and move focus there, so keyboard and screen-reader users land too. */
function markNativeChatRevealedMessage(
  root: Element,
  messageId: string,
  focus: boolean,
  frame = 0
): void {
  const row = root.querySelector<HTMLElement>(
    `[data-native-chat-message-id="${CSS.escape(messageId)}"]`
  )
  if (!row) {
    if (frame < LANDING_FRAMES) {
      requestAnimationFrame(() => markNativeChatRevealedMessage(root, messageId, focus, frame + 1))
    }
    return
  }
  row.setAttribute('data-native-chat-reply-landed', '')
  // Keyboard users land on the message; a mouse click keeps the caret in the message box.
  if (focus) {
    if (!row.hasAttribute('tabindex')) {
      row.tabIndex = -1
    }
    row.focus({ preventScroll: true })
  }
  setTimeout(() => row.removeAttribute('data-native-chat-reply-landed'), LANDED_MS)
}

/** The transcript's side: answers reveal requests in its chat. Layout-time, so a strip's
 *  passive probe on the same commit already finds it. */
export function useNativeChatMessageRevealAnswer(
  scrollRef: RefObject<HTMLElement | null>,
  reveal: ((messageId: string, probe: boolean, excerpt?: string) => string | null) | null
): void {
  useLayoutEffect(() => {
    const root = scrollRef.current?.closest('[data-native-chat-root]')
    if (!root || !reveal) {
      return
    }
    const onReveal = (event: Event): void => {
      const detail: RevealMessageDetail | undefined =
        event instanceof CustomEvent ? event.detail : undefined
      if (detail && !detail.found) {
        detail.found = reveal(detail.messageId, detail.probe, detail.excerpt)
      }
    }
    root.addEventListener(REVEAL_MESSAGE_EVENT, onReveal)
    // `reveal` changes with the transcript's messages; anything showing availability asks again.
    root.dispatchEvent(new Event(NATIVE_CHAT_MESSAGES_CHANGED_EVENT))
    return () => {
      root.removeEventListener(REVEAL_MESSAGE_EVENT, onReveal)
      // The transcript leaving (an empty, loading or error view) is a change too.
      root.dispatchEvent(new Event(NATIVE_CHAT_MESSAGES_CHANGED_EVENT))
    }
  }, [reveal, scrollRef])
}
