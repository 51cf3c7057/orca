import React from 'react'
import { Check, ChevronsUpDown, CircleDot, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/class-names'
import { useTranslate } from '@/i18n/use-translate'
import { useAppStore } from '@/store'
import type { GitHubWorkItem } from '../../../../../shared/github/work-items/work-item-types'
import type { TaskSourceContext } from '../../../../../shared/work-items/task-source-context'
import { RESULT_LIMIT, type RepoOption } from '../name-field/smart-workspace-name-field-model'
import { COMBOBOX_FIELD_SHELL } from '../type-ahead/type-ahead-combobox-styles'

type ComposerAgentIssuePickerProps = {
  repo: RepoOption
  sourceContext: TaskSourceContext | null | undefined
  /** Label of the linked issue, or null when none is chosen. */
  selectedLabel: string | null
  disabled?: boolean
  onSelect: (issue: GitHubWorkItem) => void
  onClear: () => void
}

/** Picks the open GitHub issue the new worktree's agent starts on. */
export function ComposerAgentIssuePicker({
  repo,
  sourceContext,
  selectedLabel,
  disabled = false,
  onSelect,
  onClear
}: ComposerAgentIssuePickerProps): React.JSX.Element {
  const t = useTranslate()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [issues, setIssues] = React.useState<readonly GitHubWorkItem[]>([])
  const [searching, setSearching] = React.useState(false)
  const label = t('components.newWorkspace.agentIssue.label', 'GitHub issue for the agent')

  React.useEffect(() => {
    if (!open) {
      return
    }
    const controller = new AbortController()
    setSearching(true)
    const timer = window.setTimeout(() => {
      const state = useAppStore.getState()
      // Why: a search held by a pending source save is obsolete, not empty; re-read once it settles.
      void state.githubSourceCollections
        .readCurrent(
          [repo],
          () =>
            state.fetchWorkItems(
              repo.id,
              repo.path,
              RESULT_LIMIT,
              `is:issue is:open ${query.trim()}`.trim(),
              { sourceContext: sourceContext ?? undefined }
            ),
          controller.signal
        )
        .then((items) => {
          if (!controller.signal.aborted) {
            setIssues((items ?? []).filter((item) => item.type === 'issue'))
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setIssues([])
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setSearching(false)
          }
        })
    }, 200)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [open, query, repo, sourceContext])

  return (
    <div className="flex min-w-0 items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-label={selectedLabel ? `${label}: ${selectedLabel}` : label}
            disabled={disabled}
            className={cn(
              COMBOBOX_FIELD_SHELL,
              'flex-1 cursor-pointer justify-between text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <CircleDot className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className={cn('truncate', !selectedLabel && 'text-muted-foreground')}>
                {selectedLabel ??
                  t('components.newWorkspace.agentIssue.placeholder', 'Choose an open issue')}
              </span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] min-w-[18rem]"
        >
          {/* GitHub does the matching, so cmdk must not filter the rows again. */}
          <Command shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder={t(
                'components.newWorkspace.agentIssue.searchPlaceholder',
                'Search open issues...'
              )}
            />
            <CommandList className="max-h-72">
              <CommandEmpty>
                {searching
                  ? t('components.newWorkspace.agentIssue.searching', 'Searching issues...')
                  : t('components.newWorkspace.agentIssue.empty', 'No open issues found.')}
              </CommandEmpty>
              {issues.map((issue) => {
                const issueLabel = `#${issue.number} ${issue.title}`
                return (
                  <CommandItem
                    key={issue.id}
                    value={issue.id}
                    onSelect={() => {
                      onSelect(issue)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        'size-4',
                        selectedLabel === issueLabel ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="min-w-0 truncate">{issueLabel}</span>
                  </CommandItem>
                )
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedLabel && !disabled ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClear}
          aria-label={t('components.newWorkspace.agentIssue.clear', 'Remove the issue')}
          className="shrink-0"
        >
          <X className="size-4" />
        </Button>
      ) : null}
    </div>
  )
}
