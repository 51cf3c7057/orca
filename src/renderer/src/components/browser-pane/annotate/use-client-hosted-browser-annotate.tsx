import { useCallback, useEffect, useLayoutEffect, useRef, type MutableRefObject } from 'react'
import { BrowserAnnotateSplitButton } from '../assemble-chrome/browser-annotate-split-button'
import type { ClientHostedBrowserPagePaneProps } from '../describe-page/browser-page-types'
import type { useClientHostedPageInitialization } from '../navigate/use-client-hosted-page-initialization'
import { bindGuestAnnotationDocument } from './bind-guest-annotation-document'
import { MarkupOverlay } from './MarkupOverlay'
import { useBrowserPageMarkupCapture } from './use-browser-page-markup-capture'
import { useBrowserGuestAnnotateTools } from './use-browser-guest-annotate-tools'
import { BrowserGuestAnnotateOverlays } from './browser-guest-annotate-overlays'
import { BrowserGuestGrabBanner } from './browser-guest-grab-banner'

/** Annotate, Grab and Draw for a page this desktop draws for a remote workspace; the picker runs on the local guest. */
export function useClientHostedBrowserAnnotate(
  {
    browserTab,
    workspaceId,
    worktreeId,
    runtimeEnvironmentId,
    placement,
    isActive,
    chromeShortcutScope
  }: ClientHostedBrowserPagePaneProps,
  {
    unavailable,
    showFailureOverlay,
    showNewTab
  }: Pick<
    ReturnType<typeof useClientHostedPageInitialization>,
    'unavailable' | 'showFailureOverlay' | 'showNewTab'
  >,
  webviewRef: MutableRefObject<Electron.WebviewTag | null>,
  viewportRef: MutableRefObject<HTMLDivElement | null>
) {
  const browserPageId = browserTab.id
  const currentUrl = browserTab.url
  const markup = useBrowserPageMarkupCapture(webviewRef)
  const disabled = !isActive || placement === null || unavailable || showFailureOverlay
  const annotate = useBrowserGuestAnnotateTools({
    browserPageId,
    worktreeId,
    isActive,
    toolsDisabled: placement === null || unavailable || showFailureOverlay || showNewTab,
    markupIsActive: markup.isActive,
    containerRef: viewportRef,
    guestSurfaceRef: webviewRef,
    currentDocumentUrl: currentUrl,
    shortcuts: { workspaceId, chromeShortcutScope }
  })
  // Read at event time, so attaching the guest never depends on the bridge's identity.
  const viewportBridgeRef = useRef(annotate.viewportBridge)
  useLayoutEffect(() => {
    viewportBridgeRef.current = annotate.viewportBridge
  }, [annotate.viewportBridge])
  const bindGuest = useCallback(
    (webview: Electron.WebviewTag) =>
      bindGuestAnnotationDocument(webview, (event) =>
        viewportBridgeRef.current.handleGuestDocumentEvent(event)
      ),
    []
  )
  const showOverlay = !disabled && markup.isActive && markup.baseImage !== null
  const browserHostClientId = placement?.browserHostClientId
  const browserHostGeneration = placement?.browserHostGeneration
  const pageHostGeneration = placement?.pageHostGeneration

  useEffect(() => {
    // Invalidate pending captures on deactivation, guest replacement, failure, or unmount.
    return markup.cancel
  }, [
    browserPageId,
    runtimeEnvironmentId,
    browserHostClientId,
    browserHostGeneration,
    pageHostGeneration,
    disabled,
    markup.cancel
  ])

  useEffect(() => {
    const webview = webviewRef.current
    if (!webview) {
      return
    }
    // Hide the retained native layer only after capture, so it cannot cover the drawing surface.
    webview.style.display = showFailureOverlay || unavailable || showOverlay ? 'none' : 'flex'
    return () => {
      webview.style.display = 'flex'
    }
  }, [
    webviewRef,
    browserPageId,
    runtimeEnvironmentId,
    browserHostClientId,
    browserHostGeneration,
    pageHostGeneration,
    showFailureOverlay,
    unavailable,
    showOverlay
  ])

  return {
    bindGuest,
    banner: <BrowserGuestGrabBanner tools={annotate} worktreeId={worktreeId} />,
    toolbarButton: (
      <BrowserAnnotateSplitButton
        tools={annotate.elementTools}
        markup={{
          active: markup.isActive,
          disabled: disabled || annotate.grab.state !== 'idle',
          onToggle: () => (markup.isActive ? markup.cancel() : void markup.start()),
          canShowDiscoveryHint: isActive
        }}
        notes={annotate.notes}
        compact={false}
        showTourAnchors={false}
      />
    ),
    overlays: (
      <>
        {showOverlay && markup.baseImage ? (
          <MarkupOverlay
            baseImage={markup.baseImage}
            busy={markup.state === 'composing'}
            onComplete={(input) => void markup.complete(input)}
            onCancel={markup.cancel}
          />
        ) : null}
        <BrowserGuestAnnotateOverlays
          grab={annotate.grab}
          annotationSend={annotate.annotationSend}
          grabAnnotations={annotate.grabAnnotations}
          containerRef={viewportRef}
          guestSurfaceRef={webviewRef}
          browserOverlayViewport={annotate.browserOverlayViewport}
          worktreeId={worktreeId}
          currentUrl={currentUrl}
        />
      </>
    )
  }
}
