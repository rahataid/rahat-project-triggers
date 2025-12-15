export function paginateResult<T>(
  items: T[],
  page = 1,
  perPage = 10,
): {
  data: T[];
  meta: {
    total: number;
    lastPage: number;
    currentPage: number;
    perPage: number;
    prev: number | null;
    next: number | null;
  };
} {
  const total = items.length;
  const lastPage = Math.ceil(total / perPage) || 1;
  const currentPage = Math.min(Math.max(page, 1), lastPage);
  const start = (currentPage - 1) * perPage;
  const end = start + perPage;

  const data = items.slice(start, end);

  return {
    data,
    meta: {
      total,
      lastPage,
      currentPage,
      perPage,
      prev: currentPage > 1 ? currentPage - 1 : null,
      next: currentPage < lastPage ? currentPage + 1 : null,
    },
  };
}
