import React, { useEffect, useRef, useState } from 'react'
import { Users } from 'lucide-react'
import {
  readPrefersReducedMotion,
  usePrefersReducedMotion
} from '@/hooks/theme/usePrefersReducedMotion'
import type { Bot } from '../../../../shared/bot-types'
import {
  BOT_GROUP_FACE_SLOT,
  BOT_GROUP_FACE_WIDTH,
  botGroupFaceLinks,
  botGroupFaces,
  type BotGroupFace,
  type BotGroupFaceLink
} from '../../../../shared/bots/bot-group-face-layout'
import { BotAvatar, BotAvatarTile } from './BotAvatar'

// The group picture at four times its size.
const SCALE = 4
const POP = 'cubic-bezier(0.34, 1.56, 0.64, 1)'
const SETTLE_MS = 420
const SETTLE = ['left', 'top', 'width', 'height']
  .map((p) => `${p} ${SETTLE_MS}ms ${POP}`)
  .join(', ')
const FACE_FRAMES: Keyframe[] = [
  { transform: 'scale(0.3)', opacity: 0 },
  { transform: 'scale(1)', opacity: 1 }
]
// A link grows from its centre to full length.
const LINK_FRAMES: Keyframe[] = [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }]
const EMPTY_SIZE = 20

type Face = BotGroupFace<Bot> | { key: 'empty'; face: null; x: number; y: number; size: number }

const EMPTY: Face = {
  key: 'empty',
  face: null,
  x: (BOT_GROUP_FACE_WIDTH - EMPTY_SIZE) / 2,
  y: (BOT_GROUP_FACE_SLOT - EMPTY_SIZE) / 2,
  size: EMPTY_SIZE
}

/** The group's picture as the sidebar will draw it; faces pop in and out and links grow and shrink
 *  as members change. */
export function BotGroupFaceCluster({ members }: { members: readonly Bot[] }): React.JSX.Element {
  const reduced = usePrefersReducedMotion()
  const layout = botGroupFaces(members, (bot) => bot.id)
  const faces: Face[] = layout.length > 0 ? layout : [EMPTY]
  const links = botGroupFaceLinks(layout)
  const signature = faces.map((face) => face.key).join(' ')
  // Faces and links just dropped stay until they have shrunk away.
  const [shown, setShown] = useState({ signature, faces, links })
  const [leavingFaces, setLeavingFaces] = useState<Face[]>([])
  const [leavingLinks, setLeavingLinks] = useState<BotGroupFaceLink[]>([])
  if (shown.signature !== signature) {
    setShown({ signature, faces, links })
    setLeavingFaces((current) => stillLeaving(current, shown.faces, faces, reduced))
    setLeavingLinks((current) => stillLeaving(current, shown.links, links, reduced))
  }
  return (
    <span
      className="relative block"
      style={{ width: BOT_GROUP_FACE_WIDTH * SCALE, height: BOT_GROUP_FACE_SLOT * SCALE }}
      aria-hidden
    >
      {/* Links first, so every face covers their ends. */}
      {leavingLinks.map((link) => (
        <ClusterLink
          key={`leaving-${link.key}`}
          link={link}
          reduced={reduced}
          onLeft={() => setLeavingLinks((current) => current.filter((old) => old.key !== link.key))}
        />
      ))}
      {links.map((link) => (
        <ClusterLink key={link.key} link={link} reduced={reduced} />
      ))}
      {leavingFaces.map((face) => (
        <ClusterFace
          key={`leaving-${face.key}`}
          face={face}
          z={0}
          reduced={reduced}
          onLeft={() => setLeavingFaces((current) => current.filter((old) => old.key !== face.key))}
        />
      ))}
      {faces.map((face, index) => (
        <ClusterFace key={face.key} face={face} z={index + 1} reduced={reduced} />
      ))}
    </span>
  )
}

/** What is still shrinking away: earlier leavers plus those just dropped, less any that came back. */
function stillLeaving<T extends { key: string }>(
  current: readonly T[],
  before: readonly T[],
  now: readonly T[],
  reduced: boolean
): T[] {
  const kept = (old: T): boolean => !now.some((item) => item.key === old.key)
  return [...current.filter(kept), ...(reduced ? [] : before.filter(kept))]
}

/** Plays `frames` on mount, or backwards then reports back when given onLeft; at once under reduced motion. */
function useEnterOrLeave(
  frames: Keyframe[],
  onLeft: (() => void) | undefined
): React.RefObject<HTMLSpanElement | null> {
  const ref = useRef<HTMLSpanElement>(null)
  const leftRef = useRef(onLeft)
  useEffect(() => {
    const el = ref.current
    if (!el || readPrefersReducedMotion()) {
      leftRef.current?.()
      return
    }
    if (!leftRef.current) {
      el.animate(frames, { duration: SETTLE_MS, easing: POP })
      return
    }
    const leave = el.animate(frames.toReversed(), {
      duration: 220,
      easing: 'cubic-bezier(0.4, 0, 1, 1)',
      fill: 'forwards'
    })
    leave.onfinish = () => leftRef.current?.()
  }, [frames])
  return ref
}

/** One link bar behind the faces; it grows in on mount, or shrinks away and reports back when given onLeft. */
function ClusterLink({
  link,
  reduced,
  onLeft
}: {
  link: BotGroupFaceLink
  reduced: boolean
  onLeft?: () => void
}): React.JSX.Element {
  const ref = useEnterOrLeave(LINK_FRAMES, onLeft)
  return (
    <span
      ref={ref}
      className="absolute rounded-full bg-muted-foreground"
      style={{
        left: link.x * SCALE,
        top: link.y * SCALE,
        width: link.length * SCALE,
        height: link.thickness * SCALE,
        transition: reduced ? undefined : SETTLE
      }}
    />
  )
}

/** One circle; it pops in on mount, or shrinks away and reports back when given onLeft. */
function ClusterFace({
  face,
  z,
  reduced,
  onLeft
}: {
  face: Face
  z: number
  reduced: boolean
  onLeft?: () => void
}): React.JSX.Element {
  const ref = useEnterOrLeave(FACE_FRAMES, onLeft)
  const more = face.face && 'more' in face.face ? face.face.more : null
  const lastMore = useRef(more)
  useEffect(() => {
    // "+N" bumps when N changes.
    if (more === lastMore.current) {
      return
    }
    lastMore.current = more
    if (!readPrefersReducedMotion()) {
      ref.current?.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }],
        { duration: 260, easing: 'ease-out' }
      )
    }
  }, [more, ref])
  return (
    <span
      ref={ref}
      className="absolute flex rounded-full"
      style={{
        left: face.x * SCALE,
        top: face.y * SCALE,
        width: face.size * SCALE,
        height: face.size * SCALE,
        zIndex: z,
        transition: reduced ? undefined : SETTLE
      }}
    >
      {face.face === null ? (
        <span className="flex size-full items-center justify-center rounded-full border border-dashed border-input text-muted-foreground">
          <Users className="size-8" strokeWidth={1.5} />
        </span>
      ) : 'member' in face.face ? (
        <BotAvatar
          bot={face.face.member}
          className="size-full rounded-full"
          style={{ fontSize: 28 }}
        />
      ) : (
        <BotAvatarTile
          src={null}
          fallback={`+${face.face.more}`}
          className="size-full rounded-full text-xl font-medium text-muted-foreground tabular-nums"
        />
      )}
    </span>
  )
}
