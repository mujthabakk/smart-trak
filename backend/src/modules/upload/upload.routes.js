const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../../middleware/auth');
const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/ApiError');
const uploadService = require('./upload.service');

const router = express.Router();

// Buffered in memory, then written straight into Postgres as a BLOB — no
// local disk involved, so it survives redeploys and works the same across
// multiple server instances (see uploaded_files migration for why).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'Only image files are allowed!'), false);
    }
  },
});

// Publicly readable, like the old static /uploads path it replaces — an
// <img src> tag can't send an Authorization header, and every existing
// consumer (avatars, student/driver photos, school logos) already just
// embeds this URL directly with no auth. Must be registered before the
// requireAuth below applies to the rest of this router.
router.get('/:id', asyncHandler(async (req, res) => {
  const file = await uploadService.getById(req.params.id);
  res.set('Content-Type', file.mimetype);
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(file.data);
}));

router.use(requireAuth);

router.post('/', upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('No image file provided. Make sure to use the "image" field in form-data.');
  }

  const id = await uploadService.create({
    filename: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    data: req.file.buffer,
  });

  // Matches this router's own mount point (/api/upload, see routes.index.js)
  // so the GET /:id route above actually resolves this URL.
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const fileUrl = `${baseUrl}/api/upload/${id}`;
  res.status(201).json({ url: fileUrl });
}));

module.exports = router;
