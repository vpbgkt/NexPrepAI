// AWS S3 Configuration
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

// File type validation
const fileFilter = (req, file, cb) => {
  // Allow images
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// S3 upload configuration
const uploadToS3 = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET_NAME,
    // Removed ACL since bucket doesn't allow ACLs
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      // Generate unique filename
      const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
      
      // Organize files by type
      let folder;
      if (req.route && req.route.path.includes('question')) {
        folder = 'questions';
      } else if (req.route && req.route.path.includes('profile')) {
        folder = 'profiles';
      } else {
        folder = 'uploads';
      }
      
      cb(null, `${folder}/${uniqueName}`);
    }
  }),
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Function to delete file from S3
const deleteFromS3 = async (fileUrl) => {
  try {
    // Extract key from URL
    const url = new URL(fileUrl);
    const key = url.pathname.substring(1); // Remove leading slash
      const deleteParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key
    };
    
    await s3.deleteObject(deleteParams).promise();
  } catch (error) {
    throw error;
  }
};

// Function to get file URL
const getFileUrl = (key) => {
  return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

module.exports = {
  s3,
  uploadToS3,
  deleteFromS3,
  getFileUrl
};
