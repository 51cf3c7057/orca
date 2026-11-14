import { useEffect, useState } from 'react'
import type { RuntimeCapability } from '../../../../../shared/protocol-version'
import { runtimeEnvironmentSupportsCapability } from './runtime-capability-proof'

/** False until the environment proves the capability, so older hosts never see the feature. */
export function useRuntimeEnvironmentCapability(
  environmentId: string | null | undefined,
  capability: RuntimeCapability,
  refreshKey?: unknown
): boolean {
  const [result, setResult] = useState<{
    environmentId: string
    capability: RuntimeCapability
    supported: boolean
  } | null>(null)
  useEffect(() => {
    if (!environmentId) {
      setResult(null)
      return
    }
    let cancelled = false
    let retry: ReturnType<typeof setTimeout> | undefined
    let delay = 1_000
    const probe = (): void => {
      void runtimeEnvironmentSupportsCapability(environmentId, capability)
        .then((value) => {
          if (!cancelled) {
            setResult({ environmentId, capability, supported: value })
          }
        })
        .catch(() => {
          if (!cancelled) {
            setResult({ environmentId, capability, supported: false })
            retry = setTimeout(probe, delay)
            delay = Math.min(delay * 2, 30_000)
          }
        })
    }
    probe()
    return () => {
      cancelled = true
      clearTimeout(retry)
    }
  }, [environmentId, capability, refreshKey])
  return (
    result !== null &&
    result.environmentId === environmentId &&
    result.capability === capability &&
    result.supported
  )
}
