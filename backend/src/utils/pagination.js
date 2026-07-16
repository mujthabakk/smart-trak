function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

function paginationMeta(page, pageSize, total) {
  return { page, pageSize, total };
}

module.exports = { parsePagination, paginationMeta };
