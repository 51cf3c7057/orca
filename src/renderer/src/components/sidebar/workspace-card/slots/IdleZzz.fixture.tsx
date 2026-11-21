import React, { useEffect, useState } from 'react'
import { defineFixture } from '../../../../component-fixtures/component-fixture'
import { IdleZzz } from './IdleZzz'

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function DelayedMark({ delayMs }: { delayMs: number }): React.JSX.Element | null {
  const [shown, setShown] = useState(delayMs === 0)
  useEffect(() => {
    if (shown) {
      return
    }
    const timer = setTimeout(() => setShown(true), delayMs)
    return () => clearTimeout(timer)
  }, [delayMs, shown])
  return shown ? <IdleZzz label="Idle" /> : null
}

function ReshownMark(): React.JSX.Element | null {
  const [shown, setShown] = useState(true)
  useEffect(() => {
    const hide = setTimeout(() => setShown(false), 500)
    const show = setTimeout(() => setShown(true), 1400)
    return () => {
      clearTimeout(hide)
      clearTimeout(show)
    }
  }, [])
  return shown ? <IdleZzz label="Idle" /> : null
}

function Row({ name, children }: { name: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 text-[13px] leading-5">
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <span className="ml-auto flex shrink-0 items-center text-xs leading-4 text-muted-foreground tabular-nums">
        {children}
        2m
      </span>
    </div>
  )
}

export const staggered = defineFixture({
  width: 280,
  render: () => (
    <div>
      <Row name="Mounted at 0 ms">
        <DelayedMark delayMs={0} />
      </Row>
      <Row name="Mounted at 800 ms">
        <DelayedMark delayMs={800} />
      </Row>
      <Row name="Mounted at 1600 ms">
        <DelayedMark delayMs={1600} />
      </Row>
    </div>
  ),
  interact: () => wait(1900)
})

export const reshown = defineFixture({
  width: 280,
  render: () => (
    <div>
      <Row name="Always shown">
        <IdleZzz label="Idle" />
      </Row>
      <Row name="Hidden at 500 ms, shown at 1400 ms">
        <ReshownMark />
      </Row>
    </div>
  ),
  interact: () => wait(1700)
})
