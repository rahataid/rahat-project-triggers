import { Pagination, PaginatedResult } from '../types/pagination.types';

/**
 * Takes pagination arguments and returns prepared page, perPage, skip
 * @param {number | string | undefined} rawPage
 * @param {number | string | undefined} rawPerPage
 * @return Pagination
 */
export const getPagination = (
  rawPage?: number | string,
  rawPerPage?: number | string,
): Pagination => {
  const page = Number(rawPage || 1);
  const perPage = Number(rawPerPage || 10);
  // const skip: number = page > 0 ? perPage * (page - 1) : 0;

  return {
    perPage,
    page,
  };
};

/**
 * Returns data array with pagination
 * @param {Array} data
 * @param {PaginatorTypes.Pagination} pagination
 * @param {string | number | undefined} count
 * @return PaginatorTypes.PaginatedResult<T>
 */
export const getPaginatedResult = <T>({
  data,
  pagination,
  count = data.length,
}: {
  data: T[];
  pagination: Pagination;
  count?: string | number;
}): PaginatedResult<T> => {
  const { page = 1, perPage = 10 } = pagination;

  const slicedData = data.slice(
    pagination.page === 1 ? 0 : (pagination.page - 1) * pagination.perPage,
    pagination.page * pagination.perPage,
  );
  const total = Number(count || 0);
  const lastPage: number = Math.ceil(total / perPage);

  return {
    data: slicedData,
    meta: {
      total,
      lastPage,
      currentPage: page,
      perPage,
      prev: page > 1 ? page - 1 : null,
      next: page < lastPage ? page + 1 : null,
    },
  };
};
