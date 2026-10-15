export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

export const getPagination = (pageRaw?: unknown, limitRaw?: unknown): PaginationParams => {
  let page = parseInt(String(pageRaw), 10);
  let limit = parseInt(String(limitRaw), 10);

  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = 10;
  if (limit > 100) limit = 100;

  return { page, limit, skip: (page - 1) * limit, take: limit };
};

export default { getPagination };
