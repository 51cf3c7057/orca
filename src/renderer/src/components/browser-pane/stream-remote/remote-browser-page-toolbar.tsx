import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTranslate } from '@/i18n/use-translate'
import { BrowserNavigationControlRow } from '../assemble-chrome/browser-navigation-control-row'
import BrowserAddressBar from '../assemble-chrome/BrowserAddressBar'
import type { BrowserAddressBarEditSessionBinding } from '../assemble-chrome/use-browser-address-bar-edit-session'
import type { BrowserPageDocLocation } from '../../../../../shared/browser-workspace-types'
import { RemoteRuntimeEgressIndicator } from '../assemble-chrome/browser-egress-indicator'
import {
  BrowserAnnotateSplitButton,
  type BrowserChromeElementTools,
  type BrowserChromeMarkupTool,
  type BrowserChromeNoteActions
} from '../assemble-chrome/browser-annotate-split-button'

export function RemoteBrowserPageToolbar({
  runtimeEnvironmentId,
  addressBarValue,
  onAddressBarChange,
  onSubmitAddressBar,
  onNavigateToUrl,
  onOpenWorkspaceDoc,
  addressBarInputRef,
  addressBarEditSession,
  busy,
  loading,
  loadFailed,
  annotateTools,
  onBack,
  onForward,
  onReload
}: {
  runtimeEnvironmentId: string
  addressBarValue: string
  onAddressBarChange: (value: string) => void
  onSubmitAddressBar: () => void
  onNavigateToUrl: (url: string) => void
  /** A previewed-document suggestion opens on a fresh grant instead of navigating the remote guest. */
  onOpenWorkspaceDoc: (docLocation: BrowserPageDocLocation) => void
  addressBarInputRef: React.RefObject<HTMLInputElement | null>
  addressBarEditSession: BrowserAddressBarEditSessionBinding
  busy: boolean
  loading: boolean
  loadFailed: boolean
  annotateTools: {
    tools: BrowserChromeElementTools
    markup: BrowserChromeMarkupTool
    notes: BrowserChromeNoteActions
  }
  onBack: () => void
  onForward: () => void
  onReload: () => void
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <BrowserNavigationControlRow
      controls={{
        // Hosts report no history depth; keep arrows enabled and let dead-end RPCs no-op.
        canGoBack: true,
        canGoForward: true,
        goBack: onBack,
        goForward: onForward,
        reload: onReload,
        navigate: onNavigateToUrl
      }}
      addressSlot={
        <BrowserAddressBar
          pageId={addressBarEditSession.pageId}
          value={addressBarValue}
          onChange={onAddressBarChange}
          onSubmit={onSubmitAddressBar}
          onNavigate={onNavigateToUrl}
          onOpenWorkspaceDoc={onOpenWorkspaceDoc}
          inputRef={addressBarInputRef}
          editSession={addressBarEditSession}
          leadingIcon={
            <RemoteRuntimeEgressIndicator
              runtimeEnvironmentId={runtimeEnvironmentId}
              presentation="streamed"
            />
          }
          loading={busy || loading}
          loadFailed={loadFailed}
        />
      }
      reloadControl={
        // Remote reload chords share browser.reload; no ignore-cache RPC exists to offer a distinct hard-reload menu action.
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              aria-label={t('auto.components.browser.pane.BrowserPane.0e080d820e', 'Reload')}
              onClick={onReload}
            >
              <RefreshCw className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={4}>
            {t('auto.components.browser.pane.BrowserPane.0e080d820e', 'Reload')}
          </TooltipContent>
        </Tooltip>
      }
    >
      <BrowserAnnotateSplitButton
        tools={annotateTools.tools}
        markup={annotateTools.markup}
        notes={annotateTools.notes}
        compact={false}
        showTourAnchors={false}
      />
    </BrowserNavigationControlRow>
  )
}
