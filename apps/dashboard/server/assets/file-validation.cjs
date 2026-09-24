'use strict';

const crypto = require('crypto');
const path = require('path');
const { DashboardError, assert } = require('../lib/errors.cjs');

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const FILE_TYPES = {
  'image/png': { extensions: ['.png'], signature: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/jpeg': { extensions: ['.jpg', '.jpeg'], signature: (buffer) => buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  'image/webp': { extensions: ['.webp'], signature: (buffer) => buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP' },
  'application/pdf': { extensions: ['.pdf'], signature: (buffer) => buffer.subarray(0, 5).toString('ascii') === '%PDF-' },
  'video/mp4': { extensions: ['.mp4'], signature: (buffer) => buffer.length > 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp' },
  'video/webm': { extensions: ['.webm'], signature: (buffer) => buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) }
};

function safeOriginalFilename(value) {
  const filename = path.basename(String(value || '')).replace(/[\u0000-\u001f<>:"|?*]/g, '_').trim();
  assert(filename && filename.length <= 255, 'filename_invalid', 'Choose a valid file name.', 422);
  return filename;
}
function extensionFor(mimeType) { return FILE_TYPES[mimeType]?.extensions[0] || null; }
function fileDimensions(buffer, mimeType) {
  if (mimeType === 'image/png' && buffer.length >= 24) return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  if (mimeType === 'image/jpeg') {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) { offset += 1; continue; }
      const marker = buffer[offset + 1]; const length = buffer.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      offset += 2 + length;
    }
  }
  return { width: null, height: null };
}
function validateUpload({ buffer, mimeType, filename }) {
  assert(Buffer.isBuffer(buffer) && buffer.length > 0, 'upload_empty', 'Choose a non-empty file.', 422);
  assert(buffer.length <= MAX_UPLOAD_BYTES, 'upload_too_large', `Files must be ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))} MB or smaller.`, 413);
  const type = FILE_TYPES[mimeType];
  assert(type, 'upload_type_not_allowed', 'That file type is not allowed.', 422);
  const originalFilename = safeOriginalFilename(filename);
  assert(type.extensions.includes(path.extname(originalFilename).toLowerCase()), 'upload_extension_invalid', 'The file extension does not match the allowed file type.', 422);
  assert(type.signature(buffer), 'upload_signature_invalid', 'The uploaded file does not match its declared type.', 422);
  const dimensions = fileDimensions(buffer, mimeType);
  if (dimensions.width !== null) assert(dimensions.width > 0 && dimensions.height > 0 && dimensions.width <= 20000 && dimensions.height <= 20000, 'image_dimensions_invalid', 'The image dimensions are not supported.', 422);
  return { originalFilename, checksum_sha256: crypto.createHash('sha256').update(buffer).digest('hex'), size_bytes: buffer.length, ...dimensions };
}

module.exports = { MAX_UPLOAD_BYTES, FILE_TYPES, extensionFor, validateUpload, safeOriginalFilename, fileDimensions };
