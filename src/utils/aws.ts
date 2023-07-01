import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getConfig } from "./vscode";

export interface AWSError extends Error {
  $metadata: any
  $fault: string
}

export class AWSUtils {

  static getS3Client(secretAccessKey: string) {
    const {region, accessKeyId} = getConfig();
    return new S3Client({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey
      },
    });
  }

  static putObject(opts: {client: S3Client, bucketName: string, key: string, data: Buffer, mime: string}) {
    const {client, bucketName, key, data, mime} = opts;
    return client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: data,
      ContentDisposition: 'inline',
      ContentType: mime,
    }));
  }

  static isAWSError(err: unknown): err is AWSError {
    if (typeof err !== 'object' || err === null) return false;
    if (!('message' in err && 'code' in err && '$metadata' in err && '$fault' in err)) return false;
    return true;
  }

  static stringifyAWSError(err: AWSError) {
    return JSON.stringify(err, null, 2);
  }
}