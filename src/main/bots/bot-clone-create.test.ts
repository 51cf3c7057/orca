import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Bot } from '../../shared/bot-types'
import { closeTestStores, createStore, testState } from '../persistence/persistence-test-harness'
import type { Store } from '../persistence/loading-store/store'
import { RuntimeProjectGroupController } from '../runtime/repositories/runtime-project-group-controller'
import { deleteAutomationsOfBot } from './bot-automations-removal'
import { createBotFromClone } from './bot-clone-create'
import { BotController } from './bot-controller'
import { botsRootFolder, localBotHomeFilesystem } from './bot-home'
import { useBotToolCredentialsRoot } from './bot-tool-credentials'
import { changeBotToolServers } from './bot-tools-file'
import { squarePng } from './sharing/bot-share-received.test-fixture'
import { readBotShareable } from './sharing/bot-share-sources'

const osHome = vi.hoisted(() => ({ dir: '' }))
vi.mock('node:os', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  homedir: () => osHome.dir
}))
vi.mock('electron', () => ({ app: { getPath: () => testState.dir } }))
vi.mock('../telemetry/client', () => ({ track: vi.fn() }))

let root: string
let store: Store
let bots: BotController

beforeEach(() => {
  testState.dir = mkdtempSync(join(tmpdir(), 'orca-clone-create-profile-'))
  osHome.dir = mkdtempSync(join(tmpdir(), 'orca-clone-create-home-'))
  root = mkdtempSync(join(tmpdir(), 'orca-clone-create-'))
  useBotToolCredentialsRoot(join(root, 'credentials'))
  store = createStore()
  const projectGroups = new RuntimeProjectGroupController({
    getStore: () => store,
    resolveRepo: vi.fn(),
    notifyReposChanged: vi.fn(),
    resolveFolderConnectionId: () => null,
    teardownFolderWorkspacePtys: vi.fn(async () => undefined),
    acquireFileWatcherRemoval: vi.fn(async () => ({ finish: async () => undefined })),
    cleanupRemovedFolderWorkspaceState: vi.fn(),
    emitWorktreeLifecycle: vi.fn()
  })
  bots = new BotController({
    getStore: () => store,
    notifyBotsWritten: vi.fn(),
    createFolderWorkspace: async (input) =>
      (await projectGroups.createFolderWorkspace(input)).folderWorkspace,
    deleteFolderWorkspace: async (id) => ({ deleted: store.removeFolderWorkspace(id) }),
    deleteBotAutomations: (botId) =>
      deleteAutomationsOfBot(store.listAutomations(), botId, async (id) => {
        store.deleteAutomation(id)
        return { removed: true, id }
      }),
    botsRoot: () => botsRootFolder(),
    filesystem: localBotHomeFilesystem
  })
})

afterEach(async () => {
  useBotToolCredentialsRoot(null)
  await closeTestStores()
  for (const dir of [testState.dir, osHome.dir, root]) {
    rmSync(dir, { recursive: true, force: true })
  }
})

function makeSchedule(bot: { id: string }, name: string, enabled: boolean): void {
  store.createAutomation({
    name,
    prompt: 'Check the release train.',
    agentId: 'claude',
    projectId: '',
    workspaceMode: 'existing',
    timezone: 'UTC',
    rrule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=9;BYMINUTE=0',
    dtstart: Date.UTC(2026, 10, 1),
    enabled,
    bot: { botId: bot.id, runsIn: 'new', resultsTo: 'chat' }
  })
}

function deps(failOn?: string) {
  return {
    bots,
    filesystem: localBotHomeFilesystem,
    botsRoot: () => botsRootFolder(),
    readShareable: (bot: Bot) =>
      readBotShareable({ bot, home: homeOf(bot), automations: store.listAutomations() }),
    createPausedSchedule: async (bot: Bot, schedule: { name: string }) => {
      if (schedule.name === failOn) {
        throw new Error('automation store unavailable')
      }
      makeSchedule(bot, schedule.name, false)
    }
  }
}

const homeOf = (bot: Pick<Bot, 'folder'>) => join(botsRootFolder(), bot.folder)

async function write(path: string, text: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, text)
}

/** Scout: a Claude bot with a soul, memory, a skill, a signed-in tool, a picture, settings and a schedule. */
async function makeScout(): Promise<Bot> {
  const made = await bots.create({
    name: 'Scout',
    agent: 'claude',
    launch: { model: 'opus' },
    permissionMode: 'ask'
  })
  await bots.setAvatarImage(made.id, squarePng())
  const scout = await bots.update(made.id, { skillProjects: ['repo-harbor'] })
  const home = homeOf(scout)
  await write(join(home, 'SOUL.md'), '# Scout\nWatches the release train.\n\n## Never\n- Merge.\n')
  await write(join(home, 'MEMORY.md'), '# Memory\n\n- 2026-11-01 Releases go out on Tuesdays.\n')
  await write(join(home, 'memory', 'release-owners.md'), 'The release owner is on call.\n')
  await write(
    join(home, '.claude', 'skills', 'release-notes', 'SKILL.md'),
    '---\nname: release-notes\ndescription: House style\n---\nShort lines.\n'
  )
  await changeBotToolServers(home, () => [
    {
      name: 'docs',
      url: 'https://mcp.example.com/mcp?team=harbor',
      headers: { Authorization: 'Bearer synthetic-header-value' }
    }
  ])
  await write(
    join(home, '.claude', 'settings.json'),
    JSON.stringify({
      model: 'opus',
      effortLevel: 'high',
      env: { SYNTHETIC_KEY: 'synthetic-value' },
      permissions: { allow: ['Bash'] },
      hooks: { Stop: [] }
    })
  )
  makeSchedule(scout, 'Weekday check', true)
  return bots.list().find((bot) => bot.id === made.id)!
}

/** Every file under `folder` with its bytes, as a sorted list. */
async function filesOf(folder: string): Promise<[string, string][]> {
  const names = readdirSync(folder, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
    .sort()
  return Promise.all(
    names.map(async (path): Promise<[string, string]> => [
      path,
      (await readFile(path)).toString('base64')
    ])
  )
}

async function sourceState(scout: Bot) {
  return {
    record: JSON.stringify(bots.list().find((bot) => bot.id === scout.id)),
    files: await filesOf(homeOf(scout)),
    schedules: JSON.stringify(store.listAutomations().filter((a) => a.bot?.botId === scout.id))
  }
}

describe('cloning a bot', () => {
  it('gives the clone its traits under the new name and none of its specifics', async () => {
    const scout = await makeScout()
    const before = await sourceState(scout)

    const harbor = await createBotFromClone(deps(), {
      name: 'Harbor',
      cloneFrom: { botId: scout.id }
    })

    const home = homeOf(harbor)
    const read = (path: string) => readFile(join(home, path), 'utf8')
    expect(harbor).toMatchObject({
      name: 'Harbor',
      agent: 'claude',
      launch: { model: 'opus' },
      permissionMode: 'ask',
      skillProjects: ['repo-harbor'],
      clonedFrom: { botId: scout.id, name: 'Scout', clonedAt: expect.any(Number) }
    })
    expect(harbor.avatar).toMatch(/^mascot:/)
    expect(existsSync(join(home, 'avatar.png'))).toBe(false)
    expect(await read('SOUL.md')).toBe(
      '# Harbor\nWatches the release train.\n\n## Never\n- Merge.\n'
    )
    expect(await read('MEMORY.md')).toBe(
      '# Memory\n\nOne line per fact, newest first. Longer notes go in memory/<topic>.md.\n'
    )
    expect(readdirSync(join(home, 'memory'))).toEqual([])
    expect(await read('.claude/skills/release-notes/SKILL.md')).toBe(
      '---\nname: release-notes\ndescription: House style\n---\nShort lines.\n'
    )
    expect(JSON.parse(await read('.orca/bot-tools.json')).servers).toEqual([
      { name: 'docs', url: 'https://mcp.example.com/mcp' }
    ])
    expect(JSON.parse(await read('.claude/settings.json'))).toEqual({
      model: 'opus',
      effortLevel: 'high'
    })
    expect(
      store
        .listAutomations()
        .filter((automation) => automation.bot?.botId === harbor.id)
        .map(({ name, enabled }) => ({ name, enabled }))
    ).toEqual([{ name: 'Weekday check', enabled: false }])
    expect(JSON.parse(await read('import/shared-setup.json'))).toMatchObject({
      clonedFrom: 'Scout',
      toolsToSignIn: ['docs'],
      schedulesOff: ['Weekday check']
    })
    expect(await sourceState(scout)).toEqual(before)
  })

  it('starts from a given soul and puts skills where another agent loads them', async () => {
    const scout = await makeScout()

    const harbor = await createBotFromClone(deps(), {
      name: 'Harbor',
      agent: 'codex',
      cloneFrom: { botId: scout.id },
      soul: '---\ntitle: draft\n---\n# Draft\nKeeps the harbor log.\n'
    })

    const home = homeOf(harbor)
    expect(harbor.launch).toBeUndefined()
    expect(await readFile(join(home, 'SOUL.md'), 'utf8')).toBe('# Harbor\nKeeps the harbor log.\n')
    expect(existsSync(join(home, '.agents/skills/release-notes/SKILL.md'))).toBe(true)
    expect(existsSync(join(home, '.claude/settings.json'))).toBe(false)
  })

  it('leaves no partly made bot when a late step fails, and the source as it was', async () => {
    const scout = await makeScout()
    const before = await sourceState(scout)

    await expect(
      createBotFromClone(deps('Weekday check'), { name: 'Harbor', cloneFrom: { botId: scout.id } })
    ).rejects.toThrow('automation store unavailable')

    expect(bots.list().map((bot) => bot.name)).toEqual(['Scout'])
    expect(readdirSync(botsRootFolder())).toEqual([scout.folder])
    expect(await sourceState(scout)).toEqual(before)
  })

  it('creates nothing when the source is gone', async () => {
    await expect(
      createBotFromClone(deps(), { name: 'Harbor', cloneFrom: { botId: 'gone-bot' } })
    ).rejects.toThrow('The bot to clone is gone.')
    expect(bots.list()).toEqual([])
  })
})
