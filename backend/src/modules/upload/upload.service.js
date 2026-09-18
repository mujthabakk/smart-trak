const { masterPool } = require('../../config/db');
const ApiError = require('../../utils/ApiError');

// Always reads/writes the MASTER database explicitly (never the ambient
// tenant-context-routed `query()` from config/db) — uploaded files aren't
// owned by any one school's tenant DB, so relying on ambient context would
// scope a shared media store down to whichever tenant happens to be on the
// uploading/viewing request. See plans.service.js for the same pattern.

async function create({ filename, mimetype, size, data }) {
  const { rows } = await masterPool.query(
    `INSERT INTO uploaded_files (filename, mimetype, size, data)
     VALUES ($1,$2,$3,$4)
     RETURNING id`,
    [filename, mimetype, size, data]
  );
  return rows[0].id;
}

async function getById(id) {
  const { rows } = await masterPool.query(
    'SELECT id, filename, mimetype, size, data FROM uploaded_files WHERE id = $1',
    [id]
  );
  if (!rows[0]) throw ApiError.notFound('File not found');
  return rows[0];
}

module.exports = { create, getById };
