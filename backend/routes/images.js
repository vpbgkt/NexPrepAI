const express = require('express');
const router = express.Router();
const { s3 } = require('../config/s3Config');

/**
 * Serve image from S3 using pre-signed URL
 * GET /api/images/s3-proxy?key=question-images/...
 */
router.get('/s3-proxy', async (req, res) => {
  try {
    const { key } = req.query;
    
    if (!key) {
      return res.status(400).json({ message: 'S3 key is required' });
    }

    // Generate a pre-signed URL valid for 1 hour
    const signedUrl = s3.getSignedUrl('getObject', {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      Expires: 3600 // 1 hour
    });    // Redirect to the signed URL
    res.redirect(signedUrl);
    
  } catch (error) {
    res.status(500).json({ message: 'Failed to serve image' });
  }
});

/**
 * Get signed URL for image
 * GET /api/images/signed-url?key=question-images/...
 */
router.get('/signed-url', async (req, res) => {
  try {
    const { key } = req.query;
    
    if (!key) {
      return res.status(400).json({ message: 'S3 key is required' });
    }

    const signedUrl = s3.getSignedUrl('getObject', {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      Expires: 3600 // 1 hour
    });    res.json({ signedUrl });
    
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate signed URL' });
  }
});

module.exports = router;
