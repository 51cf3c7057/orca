// Detach from team: the bot leaves the team and is listed, with its chats, on its own again.
import type React from 'react'
import { Unlink } from 'lucide-react'
import { toast } from 'sonner'
import { ContextMenuItem } from '@/components/ui/context-menu'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { useTranslate } from '@/i18n/use-translate'
import { callBotRpc } from '@/lib/bot-hosts'
import { refreshBotGroups } from '@/lib/bot-group-list'
import type { Bot } from '../../../../shared/bot-types'
import type { BotGroup } from '../../../../shared/bots/bot-group'
import { botErrorMessage } from './bot-presentation'

type DetachProps = { group: BotGroup; bot: Bot }

// Outlives the menu, which closes and unmounts its item on the first press.
const pendingDetaches = new Set<string>()

/** No confirmation, since Manage members can add the bot back; a second press while one is sent is ignored. */
export function useBotGroupDetach(
  group: BotGroup,
  bot: Bot
): { detach: () => void; disabled: boolean } {
  const t = useTranslate()
  // The host rejects a team with no members.
  const disabled = group.members.length <= 1
  const detach = (): void => {
    const key = `${group.id}\n${bot.id}`
    if (disabled || pendingDetaches.has(key)) {
      return
    }
    pendingDetaches.add(key)
    // The host turns Replies to Only when mentioned when the reply default leaves.
    const wasDefault = group.replyMode.kind === 'bot' && group.replyMode.botId === bot.id
    const names = { bot: bot.name, team: group.name }
    void callBotRpc(group, 'bots.groups.update', {
      groupId: group.id,
      revision: group.revision,
      botIds: group.members.map((member) => member.botId).filter((id) => id !== bot.id)
    })
      .then(async () => {
        await refreshBotGroups()
        toast.success(
          wasDefault
            ? t(
                'bots.groups.detach.doneMentions',
                "{{bot}} left {{team}}. It's listed on its own again. Replies are now Only when mentioned.",
                names
              )
            : t(
                'bots.groups.detach.done',
                "{{bot}} left {{team}}. It's listed on its own again.",
                names
              )
        )
      })
      .catch((error: unknown) => toast.error(botErrorMessage(error)))
      .finally(() => {
        pendingDetaches.delete(key)
      })
  }
  return { detach, disabled }
}

function DetachLabel({ disabled }: { disabled: boolean }): React.JSX.Element {
  const t = useTranslate()
  return (
    <>
      <Unlink className="size-3.5" />
      <span className="flex min-w-0 flex-col">
        {t('bots.groups.detach.menu', 'Detach from team')}
        {disabled ? (
          <span className="text-xs text-muted-foreground">
            {t('bots.groups.detach.onlyMember', 'A team needs at least one member')}
          </span>
        ) : null}
      </span>
    </>
  )
}

export function BotGroupDetachMenuItem({ group, bot }: DetachProps): React.JSX.Element {
  const { detach, disabled } = useBotGroupDetach(group, bot)
  return (
    <ContextMenuItem disabled={disabled} onSelect={detach}>
      <DetachLabel disabled={disabled} />
    </ContextMenuItem>
  )
}

export function BotGroupDetachDropdownItem({ group, bot }: DetachProps): React.JSX.Element {
  const { detach, disabled } = useBotGroupDetach(group, bot)
  return (
    <DropdownMenuItem disabled={disabled} onSelect={detach}>
      <DetachLabel disabled={disabled} />
    </DropdownMenuItem>
  )
}
