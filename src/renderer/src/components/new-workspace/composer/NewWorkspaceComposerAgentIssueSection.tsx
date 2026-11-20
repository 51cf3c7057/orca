import React from 'react'
import { useTranslate } from '@/i18n/use-translate'
import { ComposerAgentIssuePicker } from '../source-search/ComposerAgentIssuePicker'
import type { NewWorkspaceComposerCardProps } from './new-workspace-composer-card-props'

type NewWorkspaceComposerAgentIssueSectionProps = Pick<
  NewWorkspaceComposerCardProps,
  | 'selectedRepo'
  | 'selectedRepoIsGit'
  | 'selectedRepoRequiresConnection'
  | 'repoBackedSourcesDisabled'
  | 'smartNameGitHubSourceContext'
  | 'smartNameSelection'
  | 'onSmartGitHubItemSelect'
  | 'onClearSmartNameSelection'
>

export function NewWorkspaceComposerAgentIssueSection({
  selectedRepo,
  selectedRepoIsGit,
  selectedRepoRequiresConnection,
  repoBackedSourcesDisabled = false,
  smartNameGitHubSourceContext,
  smartNameSelection,
  onSmartGitHubItemSelect,
  onClearSmartNameSelection
}: NewWorkspaceComposerAgentIssueSectionProps): React.JSX.Element | null {
  const t = useTranslate()
  if (!selectedRepo || !selectedRepoIsGit || repoBackedSourcesDisabled) {
    return null
  }
  return (
    <div className="min-w-0 space-y-1">
      <label className="block text-xs font-medium text-muted-foreground">
        {t('components.newWorkspace.agentIssue.label', 'GitHub issue for the agent')}{' '}
        <span className="text-muted-foreground/70">
          {t('auto.components.NewWorkspaceComposerCard.0c5d6a479c', '[Optional]')}
        </span>
      </label>
      <ComposerAgentIssuePicker
        // Why: issue results are repo-scoped, so a project switch must drop them before the next paint.
        key={selectedRepo.id}
        repo={selectedRepo}
        sourceContext={smartNameGitHubSourceContext}
        selectedLabel={
          smartNameSelection?.kind === 'github-issue' ? smartNameSelection.label : null
        }
        disabled={selectedRepoRequiresConnection}
        onSelect={onSmartGitHubItemSelect}
        onClear={onClearSmartNameSelection}
      />
      <p className="text-2xs text-muted-foreground">
        {t(
          'components.newWorkspace.agentIssue.help',
          'Links the worktree to this issue. The agent opens with the issue link as an unsent message.'
        )}
      </p>
    </div>
  )
}
