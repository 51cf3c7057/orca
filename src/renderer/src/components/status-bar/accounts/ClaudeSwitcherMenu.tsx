import { useTranslate } from '@/i18n/use-translate'
import type React from 'react'
import { ProviderDetailsMenu } from '../usage/ProviderDetailsMenu'
import type { ProviderRateLimits } from '../../../../../shared/agent-usage/rate-limits/rate-limit-types'
import type { ChatAccountAction } from './ProviderAccountChatButton'
import { ClaudeSwitcherForOwner } from './ClaudeSwitcherForOwner'
import { getAccountOwnerKey } from './owner-account-rows'
import type { OwnerUsageRateLimits } from '../usage/use-owner-usage-rate-limits'

export type ClaudeSwitcherMenuProps = {
  claude: ProviderRateLimits | null
  compact: boolean
  iconOnly: boolean
  asSubmenu?: boolean
  triggerContent?: React.ReactNode
} & (
  | { chatAction: ChatAccountAction; ownerUsage?: never }
  /** The status bar's owner observation: rows list that owner's accounts and readings. */
  | { ownerUsage: OwnerUsageRateLimits; chatAction?: never }
)

export function ClaudeSwitcherMenu(props: ClaudeSwitcherMenuProps): React.JSX.Element | null {
  const t = useTranslate()
  const owner = props.chatAction
    ? { target: props.chatAction.target, wslHostDistro: null }
    : props.ownerUsage.owner
  if (!owner) {
    return (
      <ProviderDetailsMenu
        provider={props.claude}
        compact={props.compact}
        iconOnly={props.iconOnly}
        asSubmenu={props.asSubmenu}
        triggerContent={props.triggerContent}
        ariaLabel={t(
          'auto.components.status.bar.StatusBar.3dd7ddfae1',
          'Open Claude details and account switcher'
        )}
      />
    )
  }
  return <ClaudeSwitcherForOwner {...props} key={getAccountOwnerKey(owner)} owner={owner} />
}
