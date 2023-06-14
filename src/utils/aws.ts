import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getConfig } from "./vscode";

export class AWSUtils {
  static getS3Client() {
    const {region, accessKeyId, secretAccessKey} = getConfig();
    return new S3Client({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
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
}