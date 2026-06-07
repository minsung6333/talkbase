import type { SttResult } from '@/types'

/**
 * 같은 화자의 연속 발화를 하나의 블록으로 묶음.
 * - 화자가 다르면 새 블록
 * - 같은 화자라도 이전 발화 종료 ~ 다음 발화 시작의 갭이 GAP_THRESHOLD 초보다 크면 새 블록 (대화 흐름 끊김)
 */

export const STT_GAP_THRESHOLD_SECONDS = 5

export interface SttGroup {
  speaker: string
  start_at: number          // 첫 utterance의 시작 시간
  end_at: number            // 마지막 utterance의 종료 시간 (start_at + duration)
  text: string              // 합친 본문
  items: SttResult[]        // 원본 utterance 배열
}

export function groupSttBySpeaker(
  items: SttResult[],
  gapThreshold = STT_GAP_THRESHOLD_SECONDS
): SttGroup[] {
  const groups: SttGroup[] = []

  for (const item of items) {
    const last = groups[groups.length - 1]
    const itemText = (item.text || '').trim()
    if (!itemText) continue

    if (last && last.speaker === item.speaker) {
      const gap = item.start_at - last.end_at
      if (gap <= gapThreshold) {
        // 연결: 이전 텍스트가 문장 부호로 안 끝나면 공백, 끝나면 공백 (둘 다 공백, 단순화)
        last.text = (last.text + ' ' + itemText).trim()
        last.end_at = item.start_at + (item.duration || 0)
        last.items.push(item)
        continue
      }
    }

    groups.push({
      speaker: item.speaker,
      start_at: item.start_at,
      end_at: item.start_at + (item.duration || 0),
      text: itemText,
      items: [item],
    })
  }

  return groups
}
