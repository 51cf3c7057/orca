type Translate = (key: string, fallback: string, values?: Record<string, unknown>) => string

// Tool names as agents report them, grouped by what a person would say the agent is doing.
const SHELL_TOOLS = new Set([
  'Bash',
  'bash',
  'Execute',
  'run_shell_command',
  'run_command',
  'exec_command',
  'shell_command',
  'run_terminal_cmd',
  'run_terminal_command',
  'terminal',
  'powershell',
  'execute_code'
])
const READ_TOOLS = new Set([
  'Read',
  'read_file',
  'read_many_files',
  'read',
  'view',
  'view_file',
  'view_image'
])
const EDIT_TOOLS = new Set([
  'Edit',
  'MultiEdit',
  'NotebookEdit',
  'edit_file',
  'edit',
  'replace',
  'search_replace',
  'apply_patch',
  'patch',
  'replace_file_content',
  'multi_replace_file_content'
])
const WRITE_TOOLS = new Set(['Write', 'Create', 'write_file', 'write_to_file', 'write', 'create'])
const CODE_SEARCH_TOOLS = new Set([
  'Grep',
  'Glob',
  'grep',
  'glob',
  'search_file_content',
  'grep_search',
  'find_by_name',
  'search_files',
  'list_dir'
])
const WEB_SEARCH_TOOLS = new Set(['WebSearch', 'google_web_search', 'web_search', 'search_web'])
const WEB_PAGE_TOOLS = new Set([
  'WebFetch',
  'FetchUrl',
  'web_fetch',
  'fetch_content',
  'read_url_content',
  'browser_navigate',
  'open_page'
])
const HELPER_AGENT_TOOLS = new Set(['Task', 'Agent', 'spawn_subagent', 'delegate_task'])
const QUESTION_TOOLS = new Set([
  'AskUserQuestion',
  'AskUser',
  'ask_user',
  'ask_user_question',
  'ask_question'
])

function lastPathSegment(input: string): string {
  return input.split(/[\\/]/).findLast((part) => part.length > 0) ?? ''
}

function webPageHost(input: string): string {
  try {
    return new URL(input).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** A short plain phrase for an agent's current tool, such as "Reading BotRow.tsx"; null without a tool. */
export function botRowStepText(
  entry: { toolName?: string | null; toolInput?: string | null },
  t: Translate
): string | null {
  const tool = entry.toolName?.trim()
  if (!tool) {
    return null
  }
  const input = entry.toolInput?.trim() ?? ''
  if (SHELL_TOOLS.has(tool)) {
    return t('bots.row.step.command', 'Running a command')
  }
  if (READ_TOOLS.has(tool)) {
    const file = lastPathSegment(input)
    return file
      ? t('bots.row.step.readFile', 'Reading {{file}}', { file })
      : t('bots.row.step.readAny', 'Reading a file')
  }
  if (EDIT_TOOLS.has(tool)) {
    const file = lastPathSegment(input)
    return file
      ? t('bots.row.step.editFile', 'Editing {{file}}', { file })
      : t('bots.row.step.editAny', 'Editing a file')
  }
  if (WRITE_TOOLS.has(tool)) {
    const file = lastPathSegment(input)
    return file
      ? t('bots.row.step.writeFile', 'Writing {{file}}', { file })
      : t('bots.row.step.writeAny', 'Writing a file')
  }
  if (CODE_SEARCH_TOOLS.has(tool)) {
    return t('bots.row.step.searchCode', 'Searching the code')
  }
  if (WEB_SEARCH_TOOLS.has(tool)) {
    return input
      ? t('bots.row.step.searchWebFor', 'Searching the web for {{query}}', { query: input })
      : t('bots.row.step.searchWeb', 'Searching the web')
  }
  if (WEB_PAGE_TOOLS.has(tool)) {
    const site = webPageHost(input)
    return site
      ? t('bots.row.step.readSite', 'Reading {{site}}', { site })
      : t('bots.row.step.readPage', 'Reading a web page')
  }
  if (HELPER_AGENT_TOOLS.has(tool)) {
    return t('bots.row.step.helper', 'Working with a helper agent')
  }
  if (QUESTION_TOOLS.has(tool)) {
    return t('bots.row.step.question', 'Asking you a question')
  }
  if (tool === 'TodoWrite') {
    return t('bots.row.step.todo', 'Updating its to-do list')
  }
  const server = tool.startsWith('mcp__') ? tool.split('__')[1] : undefined
  if (server) {
    return t('bots.row.step.useServer', 'Using {{server}}', { server })
  }
  return t('bots.row.step.useTool', 'Using {{tool}}', { tool })
}
