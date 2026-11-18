import type { ClaudeStreamJsonLaunch } from '../../claude-stream-json-connection'
import type { ClaudeStructuredLaunch } from './claude-structured-launch-resolution'
import { claudeConfigDirEnvPatch } from './claude-config-dir-pin'

export function claudeAcquisitionConnectionLaunch(
  launch: ClaudeStructuredLaunch
): ClaudeStreamJsonLaunch {
  return {
    pathToClaudeCodeExecutable: launch.pathToClaudeCodeExecutable,
    prefixArgs: launch.prefixArgs,
    options: launch.options,
    cwd: launch.cwd,
    env: {
      ...launch.env,
      ...claudeConfigDirEnvPatch(launch.claudeConfigDir, { env: launch.env })
    },
    ...(launch.envToDelete ? { envToDelete: launch.envToDelete } : {})
  }
}
