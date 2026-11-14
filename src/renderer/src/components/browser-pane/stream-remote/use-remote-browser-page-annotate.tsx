import { useCallback, useMemo } from 'react'
import type { BrowserPage as BrowserPageState } from '../../../../../shared/browser-workspace-types'
import { useMarkupMode, type MarkupCaptureContext } from '../annotate/useMarkupMode'
import { deliverMarkupToClipboard } from '../annotate/markup-clipboard-delivery'
import { useBrowserGuestAnnotateTools } from '../annotate/use-browser-guest-annotate-tools'
import { BrowserGuestAnnotateOverlays } from '../annotate/browser-guest-annotate-overlays'
import { BrowserGuestGrabBanner } from '../annotate/browser-guest-grab-banner'
import type {
  BrowserChromeElementTools,
  BrowserChromeMarkupTool,
  BrowserChromeNoteActions
} from '../assemble-chrome/browser-annotate-split-button'
import type { BrowserChromeShortcutScope } from '../describe-page/browser-page-types'
import { createRemoteBrowserGuestToolsTransport } from './remote-browser-guest-tools-transport'
import { useRemoteBrowserGuestDocumentWatch } from './use-remote-browser-guest-document-watch'
import type { RemoteBrowserStreamLifecycle } from './remote-browser-stream-lifecycle'
import type { RemoteBrowserRuntimeTarget } from './remote-browser-page-input-model'
import type { RemoteBrowserInputQueue } from './remote-browser-input-queue'

/** Annotate, Grab and Draw for a streamed page: the shared picker, run on the host that renders it. */
export function useRemoteBrowserPageAnnotate({
  browserTab,
  workspaceId,
  worktreeId,
  isActive,
  chromeShortcutScope,
  busy,
  frameUrl,
  stagedPage,
  grabSupported,
  imageRef,
  remoteViewportRef,
  runtimeEnvironmentId,
  remotePageId,
  runtimeTarget,
  runtimeWorktree,
  lifecycle,
  inputQueue
}: {
  browserTab: BrowserPageState
  workspaceId: string
  worktreeId: string
  isActive: boolean
  chromeShortcutScope: BrowserChromeShortcutScope
  busy: boolean
  frameUrl: string | null
  stagedPage: boolean
  grabSupported: boolean
  imageRef: React.RefObject<HTMLImageElement | null>
  remoteViewportRef: React.MutableRefObject<HTMLDivElement | null>
  runtimeEnvironmentId: string
  remotePageId: string | null
  runtimeTarget: () => RemoteBrowserRuntimeTarget | null
  runtimeWorktree: string
  lifecycle: RemoteBrowserStreamLifecycle
  inputQueue: RemoteBrowserInputQueue
}) {
  // Why: markup snapshots the displayed screencast <img>, so it needs nothing from the host.
  const markup = useMarkupMode({
    getCaptureContext: useCallback((): MarkupCaptureContext | null => {
      const element = imageRef.current
      if (!element || !remoteViewportRef.current) {
        return null
      }
      // Why the image's box: the frame is letterboxed, and the pane's shape would distort it.
      const rect = element.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) {
        return null
      }
      return {
        source: { kind: 'image', element },
        cssWidth: rect.width,
        cssHeight: rect.height,
        outputScale: window.devicePixelRatio || 1
      }
    }, [imageRef, remoteViewportRef]),
    onDeliver: deliverMarkupToClipboard
  })

  // Hosts without the picker, and pages the host has not created yet, have nothing to pick on.
  const toolsAvailable = grabSupported && !stagedPage
  const transport = useMemo(
    () =>
      createRemoteBrowserGuestToolsTransport({
        target: runtimeTarget,
        worktree: runtimeWorktree,
        remotePage: () => lifecycle.tokens.remotePage,
        inputQueue
      }),
    [inputQueue, lifecycle, runtimeTarget, runtimeWorktree]
  )
  const annotate = useBrowserGuestAnnotateTools({
    browserPageId: browserTab.id,
    toolTargetId: toolsAvailable ? browserTab.id : '',
    worktreeId,
    isActive,
    toolsDisabled: busy || frameUrl === null,
    markupIsActive: markup.isActive,
    containerRef: remoteViewportRef,
    guestSurfaceRef: imageRef,
    currentDocumentUrl: browserTab.url,
    transport,
    shortcuts: { workspaceId, chromeShortcutScope }
  })
  useRemoteBrowserGuestDocumentWatch({
    enabled: toolsAvailable,
    environmentId: runtimeEnvironmentId,
    worktree: runtimeWorktree,
    remotePageId,
    onEvent: annotate.viewportBridge.handleGuestDocumentEvent
  })

  const annotateTools: {
    tools: BrowserChromeElementTools
    markup: BrowserChromeMarkupTool
    notes: BrowserChromeNoteActions
  } = {
    tools: annotate.elementTools,
    markup: {
      active: markup.isActive,
      disabled: !frameUrl || annotate.grab.state !== 'idle',
      onToggle: () => (markup.isActive ? markup.cancel() : void markup.start()),
      canShowDiscoveryHint: isActive
    },
    notes: annotate.notes
  }

  return {
    markup,
    annotateTools,
    annotateBanner: <BrowserGuestGrabBanner tools={annotate} worktreeId={worktreeId} />,
    annotateOverlays: (
      <BrowserGuestAnnotateOverlays
        grab={annotate.grab}
        annotationSend={annotate.annotationSend}
        grabAnnotations={annotate.grabAnnotations}
        containerRef={remoteViewportRef}
        guestSurfaceRef={imageRef}
        browserOverlayViewport={annotate.browserOverlayViewport}
        worktreeId={worktreeId}
        currentUrl={browserTab.url}
      />
    ),
    // While the picker is armed it owns the pointer: hover and right presses go to the page.
    pagePointerOwned: annotate.grab.state === 'armed' || annotate.grab.state === 'awaiting'
  }
}
