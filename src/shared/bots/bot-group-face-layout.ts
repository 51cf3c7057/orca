/** Height of a group's picture, in px at scale 1: a bot avatar's side, so names line up with bot rows. */
export const BOT_GROUP_FACE_SLOT = 28
/** Width of a group's picture with at least one member, in px at scale 1: room for faces side by side. */
export const BOT_GROUP_FACE_WIDTH = 44
/** Clear gap cut around an overlapping face, in px. */
export const BOT_GROUP_FACE_GAP = 1.5

export type BotGroupFace<T> = {
  key: string
  /** A member, or how many more members the faces leave out. */
  face: { member: T } | { more: number }
  x: number
  y: number
  size: number
  /** An emoji or initial's size in this circle, in px. */
  font: number
}

/** A bar joining two neighbouring faces across the gap between them; (x, y) is its top-left. */
export type BotGroupFaceLink = {
  key: string
  x: number
  y: number
  length: number
  thickness: number
}

type Spot = { x: number; y: number; size: number; font: number }
const SINGLE: Spot = { x: 12, y: 4, size: 20, font: 11 }
const PAIR: Spot[] = [
  { x: 0, y: 5, size: 18, font: 10 },
  { x: 26, y: 5, size: 18, font: 10 }
]
const TRIO: Spot[] = [
  { x: 0, y: 7.5, size: 13, font: 8 },
  { x: 15.5, y: 7.5, size: 13, font: 8 },
  { x: 31, y: 7.5, size: 13, font: 8 }
]

/** A group's circles in one row, left to right in member order, none overlapping: every member up to
 *  three; past that the first two and a "+N" circle. `scale` sizes the 44 by 28 picture for a larger one. */
export function botGroupFaces<T>(
  members: readonly T[],
  keyOf: (member: T) => string,
  scale = 1
): BotGroupFace<T>[] {
  const [first, second, third] = members
  if (!first) {
    return []
  }
  const at = (spot: Spot, face: BotGroupFace<T>['face'], key: string): BotGroupFace<T> => ({
    key,
    face,
    x: spot.x * scale,
    y: spot.y * scale,
    size: spot.size * scale,
    font: spot.font * scale
  })
  if (!second) {
    return [at(SINGLE, { member: first }, keyOf(first))]
  }
  if (!third) {
    return [
      at(PAIR[0]!, { member: first }, keyOf(first)),
      at(PAIR[1]!, { member: second }, keyOf(second))
    ]
  }
  return [
    at(TRIO[0]!, { member: first }, keyOf(first)),
    at(TRIO[1]!, { member: second }, keyOf(second)),
    members.length === 3
      ? at(TRIO[2]!, { member: third }, keyOf(third))
      : at({ ...TRIO[2]!, font: 7 }, { more: members.length - 2 }, 'more')
  ]
}

/** The links that mark a group's faces as one team: a bar across each gap between neighbours, on their
 *  shared centre line. Faces that touch or overlap, like a tab icon's, get none. */
export function botGroupFaceLinks<T>(faces: readonly BotGroupFace<T>[]): BotGroupFaceLink[] {
  const row = faces.toSorted((a, b) => a.x - b.x)
  return row.slice(1).flatMap((right, index) => {
    const left = row[index]!
    const length = right.x - (left.x + left.size)
    if (length <= 0) {
      return []
    }
    const thickness = Math.min(left.size, right.size) / 9
    return [
      {
        key: `${left.key}~${right.key}`,
        x: left.x + left.size,
        y: left.y + left.size / 2 - thickness / 2,
        length,
        thickness
      }
    ]
  })
}

/** Size of one face in a group's tab icon, in px: a bot tab's avatar size. */
export const BOT_GROUP_TAB_FACE = 12
const TAB_FACE_STEP = 8

/** A group's tab icon, back to front: its first two members side by side, the first in front. */
export function botGroupTabFaces<T>(
  members: readonly T[],
  keyOf: (member: T) => string
): BotGroupFace<T>[] {
  const shown = members.slice(0, 2)
  return shown
    .map((member, index) => ({
      key: keyOf(member),
      face: { member },
      x: index * TAB_FACE_STEP,
      y: 0,
      size: BOT_GROUP_TAB_FACE,
      font: 7
    }))
    .toReversed()
}
