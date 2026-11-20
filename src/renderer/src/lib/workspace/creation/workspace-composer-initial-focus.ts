// Fields under the closed Advanced section are inert and cannot take focus.
const OUTSIDE_CLOSED_SECTION = ':not([inert] *)'
const WORKSPACE_NAME_INPUT_SELECTOR = `[data-workspace-name-input="true"]${OUTSIDE_CLOSED_SECTION}`
const WORKSPACE_SOURCE_PILL_SELECTOR = `[data-workspace-source-pill="true"]${OUTSIDE_CLOSED_SECTION}`
const AGENT_PICKER_TRIGGER_SELECTOR = '[data-agent-launch-picker-trigger="true"]:not(:disabled)'
const PROJECT_COMBOBOX_TRIGGER_SELECTOR = '[data-project-combobox-root="true"][role="combobox"]'
const LEGACY_REPO_COMBOBOX_TRIGGER_SELECTOR = '[data-repo-combobox-root="true"][role="combobox"]'

export function getWorkspaceComposerInitialFocusTarget(root: ParentNode): HTMLElement | null {
  // Name/source when it is in view, for immediate typing; otherwise the agent picker, whose Enter creates.
  return (
    root.querySelector<HTMLElement>(WORKSPACE_NAME_INPUT_SELECTOR) ??
    root.querySelector<HTMLElement>(WORKSPACE_SOURCE_PILL_SELECTOR) ??
    root.querySelector<HTMLElement>(AGENT_PICKER_TRIGGER_SELECTOR) ??
    root.querySelector<HTMLElement>(PROJECT_COMBOBOX_TRIGGER_SELECTOR) ??
    root.querySelector<HTMLElement>(LEGACY_REPO_COMBOBOX_TRIGGER_SELECTOR)
  )
}
