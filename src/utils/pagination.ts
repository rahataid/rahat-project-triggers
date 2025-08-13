export function costumePaginate(items, page = 1, perPage = 10) {
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
