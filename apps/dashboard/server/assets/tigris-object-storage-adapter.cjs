'use strict';

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
  GetBucketLifecycleConfigurationCommand
} = require('@aws-sdk/client-s3');

const TIGRIS_ENDPOINT = 'https://t3.storage.dev';
const TIGRIS_REGION = 'auto';

function required(env, key) {
  const configured = String(env[key] || '').trim();
  if (!configured) throw new Error(`Tigris object storage requires ${key}.`);
  return configured;
}

function affectsPrefix(rule, authoritativePrefix) {
  const filter = rule.Filter;
  const prefix = typeof rule.Prefix === 'string' ? rule.Prefix
    : typeof filter?.Prefix === 'string' ? filter.Prefix
      : typeof filter?.And?.Prefix === 'string' ? filter.And.Prefix : null;
  if (prefix === null) return true;
  return authoritativePrefix.startsWith(prefix) || prefix.startsWith(authoritativePrefix);
}

function inspectLifecycleRules(rules = [], authoritativePrefix) {
  const enabled = rules.filter((rule) => String(rule.Status || '').toLowerCase() === 'enabled');
  const applicable = enabled.filter((rule) => affectsPrefix(rule, authoritativePrefix));
  const unsafe = applicable.filter((rule) => Boolean(
    rule.Expiration
    || rule.NoncurrentVersionExpiration
    || (Array.isArray(rule.Transitions) && rule.Transitions.length)
    || (Array.isArray(rule.NoncurrentVersionTransitions) && rule.NoncurrentVersionTransitions.length)
  ));
  return Object.freeze({
    inspected: true,
    enabled_rule_count: enabled.length,
    applicable_rule_count: applicable.length,
    destructive_rule_count: unsafe.length,
    authoritative_retention_safe: unsafe.length === 0
  });
}

async function bufferBody(body) {
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (typeof body?.transformToByteArray === 'function') return Buffer.from(await body.transformToByteArray());
  const chunks = [];
  for await (const chunk of body || []) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function createTigrisObjectStorageClient({ env = process.env, s3Client = null } = {}) {
  if (String(env.CALINIUM_OBJECT_STORAGE_PROVIDER || '').trim() !== 'tigris') throw new Error('Public durable storage provider must be tigris.');
  const endpoint = required(env, 'CALINIUM_OBJECT_STORAGE_ENDPOINT');
  const region = required(env, 'CALINIUM_OBJECT_STORAGE_REGION');
  if (endpoint !== TIGRIS_ENDPOINT) throw new Error('Tigris object storage endpoint is invalid.');
  if (region !== TIGRIS_REGION) throw new Error('Tigris object storage region is invalid.');
  const accessKeyId = required(env, 'AWS_ACCESS_KEY_ID');
  const secretAccessKey = required(env, 'AWS_SECRET_ACCESS_KEY');
  const sessionToken = String(env.AWS_SESSION_TOKEN || '').trim() || undefined;
  const client = s3Client || new S3Client({
    endpoint,
    region,
    forcePathStyle: false,
    credentials: { accessKeyId, secretAccessKey, ...(sessionToken ? { sessionToken } : {}) }
  });

  return Object.freeze({
    providerName: 'tigris',
    async putObject(input) {
      try {
        await client.send(new PutObjectCommand({
          Bucket: input.bucket,
          Key: input.key,
          Body: input.body,
          ContentType: input.contentType,
          Metadata: input.metadata,
          IfNoneMatch: input.ifNoneMatch
        }));
        return { created: true };
      } catch (error) {
        const status = Number(error?.$metadata?.httpStatusCode || error?.statusCode || error?.status);
        if (error?.name === 'PreconditionFailed' || error?.code === 'PreconditionFailed' || status === 412) return { created: false, preconditionFailed: true };
        throw error;
      }
    },
    async getObject({ bucket, key }) {
      const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      return { body: await bufferBody(response.Body), metadata: response.Metadata || {} };
    },
    async deleteObject({ bucket, key }) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
    async headObject({ bucket, key }) {
      const response = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return { exists: true, sizeBytes: response.ContentLength ?? null, metadata: response.Metadata || {} };
    },
    async healthCheck({ bucket }) {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
      return { ready: true };
    },
    async lifecyclePolicy({ bucket, authoritativePrefix }) {
      let rules = [];
      try {
        const response = await client.send(new GetBucketLifecycleConfigurationCommand({ Bucket: bucket }));
        rules = response.Rules || [];
      } catch (error) {
        if (!['NoSuchLifecycleConfiguration', 'NoSuchLifecycle'].includes(String(error?.name || error?.code || ''))) throw error;
      }
      return inspectLifecycleRules(rules, authoritativePrefix);
    }
  });
}

function createObjectStorageClient(options = {}) { return createTigrisObjectStorageClient(options); }

module.exports = {
  TIGRIS_ENDPOINT,
  TIGRIS_REGION,
  createObjectStorageClient,
  createTigrisObjectStorageClient,
  inspectLifecycleRules
};
