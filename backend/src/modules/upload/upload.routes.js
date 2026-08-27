const express = require('express');
const multer = require('multer');
const path = require('path');
const { requireAuth } = require('../../middleware/auth');
const ApiError = require('../../utils/ApiError');

const router = express.Router();

// Multer config for local storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Relative to the root where the process is started (backend/)
    cb(null, 'public/uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'Only image files are allowed!'), false);
    }
  },
});

router.use(requireAuth);

router.post('/', upload.single('image'), (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('No image file provided. Make sure to use the "image" field in form-data.');
  }

  // Construct absolute URL for the frontend
  // E.g., https://your-ngrok.dev/uploads/image-123.jpg
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

  res.status(201).json({ url: fileUrl });
});

module.exports = router;
