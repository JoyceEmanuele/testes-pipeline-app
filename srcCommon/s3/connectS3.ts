import configfile from "../../configfile";
import {
  S3Client,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  ListObjectsV2CommandInput,
  ListObjectsV2CommandOutput,
  PutObjectCommand,
  _Object as S3Object,
  ObjectCannedACL,
} from "@aws-sdk/client-s3"
import type { Readable } from 'stream';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from '../../srcCommon/helpers/logger';
import { ReadStream } from "node:fs";

function isAwsDisabled() {
  return (!configfile.isProductionServer) && (!configfile.awsConfig);
}

export async function preSigningUrl(bucket: { name: string, region: string }, key: string){
  const s3Client = getS3client(bucket.region);
  const command = new GetObjectCommand({ Bucket: bucket.name, Key: key });
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

const s3Clients = new Map<string,S3Client>();
function getS3client(region: string) {
  let client = s3Clients.get(region);
  if (!client) {
    client = new S3Client({
      region: region,
      credentials: {
        accessKeyId: configfile.awsConfig.accessKeyId,
        secretAccessKey: configfile.awsConfig.secretAccessKey,
        sessionToken: configfile.awsConfig.sessionToken || undefined,
      }
    });
    s3Clients.set(region, client);
  }
  return client;
}

export async function putItemS3(bucket: { name: string, region: string }, key: string, body: any, contentDisposition: string, acl: ObjectCannedACL) {
  const s3Client = getS3client(bucket.region);
  const pres = await s3Client.send(new PutObjectCommand({
    Key: key,
    Body: body,
    Bucket: bucket.name,
    ContentDisposition: contentDisposition,
    ACL: acl,
  }))
    .catch((perr) => {
      logger.error("Error uploading data (S3):");
      logger.error(perr);
      throw Error('Error uploading data.' + perr.toString()).HttpStatus(500);
    });

  return pres;
}

export async function getItemS3(bucket: { name: string, region: string }, key: string) {
  const s3Client = getS3client(bucket.region);
  const object = await s3Client.send(new GetObjectCommand({
    Key: key,
    Bucket: bucket.name,
  }))
    .catch((perr) => {
      logger.error("Error getting data (S3):");
      logger.error(perr);
      return null;
    });

  return object;
}

export async function getObjectsS3(bucket: { name: string, region: string }, prefix: string) {
  if (isAwsDisabled()) {
    logger.warn('AWS access is disabled');
    return null;
  }
  const s3Client = getS3client(bucket.region);
  const s3_params: ListObjectsV2CommandInput = {
    Bucket: bucket.name,
    Delimiter: '/',
    Prefix: prefix,
  };
  const object: ListObjectsV2CommandOutput = await s3Client.send(new ListObjectsV2Command(s3_params))
    .catch((perr) => {
      logger.error("Error getting data (S3): ", perr);
      return null;
    });

  return object;
}

export async function listS3folderContents (bucket: { name: string, region: string }, path: string, singlePage?: boolean) {
  let list: S3Object[] = []
  if (isAwsDisabled()) {
    logger.warn('AWS access is disabled');
    return list;
  }
  const s3Client = getS3client(bucket.region);
  const s3_params: ListObjectsV2CommandInput = {
    Bucket: bucket.name, // configfile.otaConfig.bucket,
    Prefix: path, // '', `${fw_type}/${hardware_revision}/`
    // ContinuationToken: null as string,
    // MaxKeys: 5,
  };

  while (true) {
    const object_list = await s3Client.send(new ListObjectsV2Command(s3_params));
    if (!object_list.Contents) {
      break; // break out of the loop if error
    }

    // for (const obj of object_list.Contents) {
    //   const split_path = obj.Key.split('/');
    //   const version = split_path[split_path.length - 1].split('.')[0];
    //   if (version === wanted_version) {
    //     const { Body } = await getS3object(s3_params.Bucket, obj.Key);
    //     return Body;
    //   }
    // }

    list = list.concat(object_list.Contents)

    if (object_list.IsTruncated) { //paging the results
      if (singlePage) break;
      s3_params.ContinuationToken = object_list.NextContinuationToken;
    }
    else {
      break;
    }
  }

  return list
}

export async function listS3commonPrefixes (bucket: { name: string, region: string }, path: string) {
  let list: string[] = []
  if (isAwsDisabled()) {
    logger.warn('AWS access is disabled');
    return list;
  }

  const s3Client = getS3client(bucket.region);
  const s3_params: ListObjectsV2CommandInput = {
    Bucket: bucket.name, // configfile.otaConfig.bucket,
    Prefix: path, // '', `${fw_type}/${hardware_revision}/`
    // ContinuationToken: null as string,
    // MaxKeys: 5,
    Delimiter: '/',
  };

  while (true) {
    const object_list = await s3Client.send(new ListObjectsV2Command(s3_params));
    // if (!object_list.Contents) {
    //   break; // break out of the loop if error
    // }

    list = list.concat((object_list.CommonPrefixes||[]).map(x => x.Prefix));

    if (object_list.IsTruncated) { //paging the results
      s3_params.ContinuationToken = object_list.NextContinuationToken;
    }
    else {
      break;
    }
  }

  return list
}

export async function sendToS3 (bucket: { name: string, region: string }, S3_PATH: string, file: Buffer) {
  const s3Client = getS3client(bucket.region);
  await s3Client.send(new PutObjectCommand({
    Bucket: bucket.name,
    Key: S3_PATH,
    Body: file // string | Buffer | Uint8Array | Blob | Readable
  }))
  .catch((perr) => {
    logger.error(perr);
    throw Error('Could not save uploaded file').HttpStatus(500).DebugInfo(perr)
  })
}

export async function getS3object(bucket: { name: string, region: string }, path: string) {
  const s3Client = getS3client(bucket.region);
  const response = await s3Client.send(new GetObjectCommand({
    Bucket: bucket.name,
    Key: path,
  }));
  const stream = response.Body as Readable;
  const blob = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = []
      stream.on('data', chunk => chunks.push(chunk))
      stream.once('end', () => resolve(Buffer.concat(chunks)))
      stream.once('error', reject)
  });
  return { response, blob };
}

export async function moveS3object(bucket: { name: string, region: string }, sourcePath: string, destPath: string) {
  if (!configfile.isProductionServer) { throw Error('Action only allowed in production!').HttpStatus(400); }
  const s3Client = getS3client(bucket.region);

  const { response: obj1 } = await getS3object(bucket, sourcePath);

  const copyResp = await s3Client.send(new CopyObjectCommand({
    Bucket: bucket.name,
    CopySource: `${bucket}/${sourcePath}`,
    Key: destPath, // Destination
  }));

  const { response: obj2 } = await getS3object(bucket, destPath);

  if (obj1.ContentLength !== obj2.ContentLength) throw Error('S3 object is not the same').HttpStatus(500);
  if (obj1.ETag !== obj2.ETag) throw Error('S3 object is not the same').HttpStatus(500);

  const delResp = await s3Client.send(new DeleteObjectCommand({
    Bucket: bucket.name,
    Key: sourcePath,
  }));
}

// export async function getBucketLocation (bucketName: string) {
//   await s3.send(new GetBucketLocationCommand({
//     Bucket: bucketName,
//   }))
//   .catch((perr) => {
//     logger.error(perr);
//     throw Error('Could not get bucket location').HttpStatus(500).DebugInfo(perr)
//   })
// }

export async function fetch_firmware_file (path: string) {
  const object_list = await listS3folderContents(configfile.firmwareBucket, path);
  if (object_list.length === 0) {
    return null;
  }
  if (object_list.length !== 1) {
    throw Error('Multiple files returned').HttpStatus(500)
  }
  const { blob } = await getS3object(configfile.firmwareBucket, object_list[0].Key);
  return blob;
}

export async function sendToS3_vtImages(fileName: string, img: Buffer|Blob) {
  const bucket = configfile.filesBucket;
  const s3Client = getS3client(bucket.region);
  return s3Client.send(new PutObjectCommand({
    Bucket: bucket.name,
    Key: bucket.vtImagesBucketPath + fileName,
    Body: img,
    ACL: "public-read",
  }));
}

export function uploadDevImage(fileName: string, file: Buffer) {
  const bucket = configfile.filesBucket;
  const s3Client = getS3client(bucket.region);
  return s3Client.send(new PutObjectCommand({
    Bucket: bucket.name,
    Key: bucket.imagesBucketPath + fileName,
    Body: file,
    ACL: 'public-read',
  }));
}

export function uploadAssetImage(fileName: string, file: Buffer) {
  const bucket = configfile.filesBucket;
  const s3Client = getS3client(bucket.region);
  return s3Client.send(new PutObjectCommand({
    Bucket: bucket.name,
    Key: bucket.assetImagesBucketPath + fileName,
    Body: file,
    ACL: 'public-read',
  }));
}

export function uploadMachinesImage(fileName: string, file: Buffer) {
  const bucket = configfile.filesBucket;
  const s3Client = getS3client(bucket.region);
  return s3Client.send(new PutObjectCommand({
    Bucket: bucket.name,
    Key: bucket.devGroupsImagesBucketPath + fileName,
    Body: file,
    ACL: 'public-read',
  }));
}

export function uploadLaagerImage(fileName: string, file: Buffer) {
  const bucket = configfile.filesBucket;
  const s3Client = getS3client(bucket.region);
  return s3Client.send(new PutObjectCommand({
    Bucket: bucket.name,
    Key: bucket.laagerBucketPath + fileName,
    Body: file,
    ACL: 'public-read',
  }));
}

export function deleteLaagerImage(fileName: string) {
  const bucket = configfile.filesBucket;
  const s3Client = getS3client(bucket.region);
  return s3Client.send(new DeleteObjectCommand({
    Bucket: bucket.name,
    Key: bucket.laagerBucketPath + fileName,
  }));
}

export function uploadUnitReport(path_s3Key: string, stream: ReadStream) {
  const bucket = configfile.filesBucketPrivate;
  const s3Client = getS3client(bucket.region);
  return s3Client.send(new PutObjectCommand({
    Bucket: bucket.name,
    Key:  path_s3Key,
    ACL: undefined,
    Body: stream // string | Buffer | Uint8Array | Blob | Readable
  }));
}

export function uploadUnitSketchImage(fileName: string, file: Buffer) {
  const bucket = configfile.filesBucketPrivate;
  const s3Client = getS3client(bucket.region);
  return s3Client.send(new PutObjectCommand({
    Bucket: bucket.name,
    Key: bucket.sketchesBucketPath + fileName,
    Body: file,
    ACL: undefined,
  }));
}

export function uploadSimcardImage(fileName: string, file: Buffer|Blob) {
  const bucket = configfile.filesBucketPrivate;
  const s3Client = getS3client(bucket.region);
  return s3Client.send(new PutObjectCommand({
    Bucket: bucket.name,
    Key: bucket.simcardsBucketPath + fileName,
    Body: file,
    ACL: undefined,
  }));
}

export function uploadDmtImageConnectS3(fileName: string, file: Buffer) {
  const bucket = configfile.filesBucket;
  const s3Client = getS3client(bucket.region);
  return s3Client.send(new PutObjectCommand({
    Bucket: bucket.name,
    Key: bucket.dmtImagesBucketPath + fileName,
    Body: file,
    ACL: 'public-read',
  }));
}


export function uploadNobreakImage(fileName: string, file: Buffer) {
  const bucket = configfile.filesBucket;
  const s3Client = getS3client(bucket.region);
  return s3Client.send(new PutObjectCommand({
    Bucket: bucket.name,
    Key: bucket.nobreakImagesBucketPath + fileName,
    Body: file,
    ACL: 'public-read',
  }));
}

export function uploadDalImages3(fileName: string, file: Buffer) {
  const bucket = configfile.filesBucket;
  const s3Client = getS3client(bucket.region);
  return s3Client.send(new PutObjectCommand({
    Bucket: bucket.name,
    Key: bucket.dalImagesBucketPath + fileName,
    Body: file,
    ACL: 'public-read',
  }));
}

export function uploadIlluminationImageS3(fileName: string, file: Buffer) {
  const bucket = configfile.filesBucket;
  const s3Client = getS3client(bucket.region);
  return s3Client.send(new PutObjectCommand({
    Bucket: bucket.name,
    Key: bucket.illuminationsImagesBucketPath + fileName,
    Body: file,
    ACL: 'public-read',
  }));
}
