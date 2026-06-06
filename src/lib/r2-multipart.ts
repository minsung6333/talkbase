import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { r2Client } from './r2'

const BUCKET = process.env.R2_BUCKET_NAME!

// 임시 청크 저장
export async function putChunk(key: string, body: Buffer) {
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: 'application/octet-stream',
  })
  await r2Client.send(cmd)
}

export async function getChunk(key: string): Promise<Buffer> {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key })
  const res = await r2Client.send(cmd)
  if (!res.Body) throw new Error(`청크 못 가져옴: ${key}`)
  const chunks: Uint8Array[] = []
  // @ts-expect-error stream typing
  for await (const c of res.Body) chunks.push(c)
  return Buffer.concat(chunks.map(c => Buffer.from(c)))
}

export async function deleteChunk(key: string) {
  await r2Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

export function tempChunkKey(fileKey: string, partNumber: number) {
  return `_chunks/${fileKey}/part-${String(partNumber).padStart(5, '0')}`
}

// 모든 청크 결합 → 최종 파일 PUT → 임시 청크 삭제
export async function assembleAndCleanup(
  fileKey: string,
  totalChunks: number,
  contentType: string
) {
  // 1. 모든 청크 다운로드 (병렬)
  const buffers = await Promise.all(
    Array.from({ length: totalChunks }, (_, i) =>
      getChunk(tempChunkKey(fileKey, i + 1))
    )
  )

  // 2. 결합 후 최종 키로 PUT
  const combined = Buffer.concat(buffers)
  await r2Client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: fileKey,
    Body: combined,
    ContentType: contentType,
  }))

  // 3. 임시 청크 삭제 (병렬, 실패해도 무시)
  await Promise.all(
    Array.from({ length: totalChunks }, (_, i) =>
      deleteChunk(tempChunkKey(fileKey, i + 1)).catch(() => {})
    )
  )

  return combined.length
}
