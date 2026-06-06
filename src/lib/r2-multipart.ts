import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3'
import { r2Client } from './r2'

const BUCKET = process.env.R2_BUCKET_NAME!

export async function startMultipartUpload(key: string, contentType: string) {
  const cmd = new CreateMultipartUploadCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  })
  const res = await r2Client.send(cmd)
  if (!res.UploadId) throw new Error('UploadId 없음')
  return res.UploadId
}

export async function uploadChunk(
  key: string,
  uploadId: string,
  partNumber: number,
  body: Buffer
) {
  const cmd = new UploadPartCommand({
    Bucket: BUCKET,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
    Body: body,
  })
  const res = await r2Client.send(cmd)
  if (!res.ETag) throw new Error('ETag 없음')
  return { PartNumber: partNumber, ETag: res.ETag }
}

export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: { PartNumber: number; ETag: string }[]
) {
  const cmd = new CompleteMultipartUploadCommand({
    Bucket: BUCKET,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts },
  })
  return r2Client.send(cmd)
}

export async function abortMultipartUpload(key: string, uploadId: string) {
  const cmd = new AbortMultipartUploadCommand({
    Bucket: BUCKET,
    Key: key,
    UploadId: uploadId,
  })
  return r2Client.send(cmd)
}
