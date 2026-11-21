import { describe, expect, it } from 'vitest'
import { botRowStepText } from './bot-row-step-text'

// Returns the key and its values, so the test checks which phrase is picked, not its wording.
const t = (key: string, _fallback: string, values?: Record<string, unknown>): string =>
  values ? `${key} ${JSON.stringify(values)}` : key

describe('botRowStepText', () => {
  it('says a shell tool is running a command, whatever the command', () => {
    expect(
      botRowStepText({ toolName: 'Bash', toolInput: 'cd ~/.claude/projects/-Users-x && ls' }, t)
    ).toBe('bots.row.step.command')
  })

  it('names the file being read by its last path segment', () => {
    expect(botRowStepText({ toolName: 'Read', toolInput: '/a/b/BotRow.tsx' }, t)).toBe(
      'bots.row.step.readFile {"file":"BotRow.tsx"}'
    )
    expect(botRowStepText({ toolName: 'edit_file', toolInput: 'C:\\src\\main.css' }, t)).toBe(
      'bots.row.step.editFile {"file":"main.css"}'
    )
  })

  it('names a web page by its host without www', () => {
    expect(botRowStepText({ toolName: 'WebFetch', toolInput: 'https://www.github.com/x' }, t)).toBe(
      'bots.row.step.readSite {"site":"github.com"}'
    )
    expect(botRowStepText({ toolName: 'WebFetch', toolInput: 'not a url' }, t)).toBe(
      'bots.row.step.readPage'
    )
  })

  it('names an MCP tool by its server', () => {
    expect(botRowStepText({ toolName: 'mcp__figma__get_screenshot' }, t)).toBe(
      'bots.row.step.useServer {"server":"figma"}'
    )
  })

  it('names any other tool as it is', () => {
    expect(botRowStepText({ toolName: 'skill_manage' }, t)).toBe(
      'bots.row.step.useTool {"tool":"skill_manage"}'
    )
  })

  it('has nothing to say without a tool', () => {
    expect(botRowStepText({ toolName: '', toolInput: 'ls' }, t)).toBeNull()
    expect(botRowStepText({}, t)).toBeNull()
  })
})
