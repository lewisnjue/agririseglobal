const { GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { r2, bucketName, createObjectKey, getObjectUrl } = require('../config/r2');

const uploadImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const key = createObjectKey(req.file.originalname);
  await r2.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: req.file.buffer,
    ContentType: req.file.mimetype,
  }));

  res.status(201).json({ success: 1, file: { url: getObjectUrl(key, req), key } });
};

const getObject = async (req, res) => {
  const keyParam = req.params.splat || req.params[0];
  const key = Array.isArray(keyParam) ? keyParam.join('/') : keyParam;
  if (!key || key.includes('..')) return res.status(400).json({ error: 'Invalid object key' });

  try {
    const object = await r2.send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
    if (object.ContentType) res.type(object.ContentType);
    if (object.ETag) res.set('ETag', object.ETag);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    object.Body.pipe(res);
  } catch (error) {
    if (error.name === 'NoSuchKey') return res.status(404).json({ error: 'Object not found' });
    res.status(500).json({ error: 'Failed to read object' });
  }
};

module.exports = { uploadImage, getObject };