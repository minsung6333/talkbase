import { Client } from '@notionhq/client'
import type { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints'
import type { Recording } from '@/types'

const notion = new Client({ auth: process.env.NOTION_API_KEY })
const DATABASE_ID = process.env.NOTION_DATABASE_ID!

const TYPE_LABEL: Record<string, string> = {
  team_meeting: 'Team Meeting',
  client_meeting: 'Client Meeting',
  phone_call: 'Phone Call',
  other: 'Other',
}

export async function createNotionPage(recording: Recording, aiResult: string): Promise<string> {
  const blocks = splitIntoBlocks(aiResult)

  const page = await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties: {
      title: {
        title: [{ text: { content: recording.title } }],
      },
      Type: {
        select: { name: TYPE_LABEL[recording.type] || 'Other' },
      },
      Visibility: {
        select: { name: recording.visibility === 'team' ? 'Team' : 'Private' },
      },
      Uploader: {
        rich_text: [{ text: { content: recording.user?.full_name || recording.user?.email || '' } }],
      },
      Date: {
        date: { start: recording.created_at.split('T')[0] },
      },
      Format: {
        select: { name: recording.output_format === 'minutes' ? 'Minutes' : 'Summary' },
      },
    },
    children: blocks,
  })

  return `https://notion.so/${page.id.replace(/-/g, '')}`
}

function splitIntoBlocks(text: string): BlockObjectRequest[] {
  const lines = text.split('\n')
  const blocks: BlockObjectRequest[] = []

  for (const line of lines) {
    if (!line.trim()) {
      blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [] } })
      continue
    }

    // 헤딩 처리
    if (line.startsWith('📋') || line.startsWith('📝')) {
      blocks.push({
        object: 'block', type: 'heading_1',
        heading_1: { rich_text: [{ text: { content: line.trim() } }] },
      })
    } else if (line.startsWith('📌') || line.startsWith('💬') || line.startsWith('✅')) {
      blocks.push({
        object: 'block', type: 'heading_2',
        heading_2: { rich_text: [{ text: { content: line.trim() } }] },
      })
    } else if (line.startsWith('- [ ]') || line.startsWith('- [x]')) {
      blocks.push({
        object: 'block', type: 'to_do',
        to_do: {
          rich_text: [{ text: { content: line.replace(/^- \[.\] /, '').trim() } }],
          checked: line.startsWith('- [x]'),
        },
      })
    } else if (line.startsWith('- ')) {
      blocks.push({
        object: 'block', type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: [{ text: { content: line.slice(2).trim() } }] },
      })
    } else {
      // 2000자 제한 처리
      const chunks = chunkString(line.trim(), 1900)
      for (const chunk of chunks) {
        blocks.push({
          object: 'block', type: 'paragraph',
          paragraph: { rich_text: [{ text: { content: chunk } }] },
        })
      }
    }

    // Notion API 최대 100 블록 제한
    if (blocks.length >= 98) break
  }

  return blocks
}

function chunkString(str: string, size: number): string[] {
  const chunks = []
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.slice(i, i + size))
  }
  return chunks
}
