/**
 * Common types used across services
 */

export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type ServiceResult<T> = {
  data?: T;
  page?: number;
  limit?: number;
  total?: number;
  message?: string;
};

/**
 * Create a success response with optional pagination
 */
export function createSuccessResponse<T>(
  payload: ServiceResult<T>
): ApiResponse<T> {
  const { data, page, limit, total, message } = payload;
  const res: ApiResponse<T> = { success: true, data, message };

  if (page && limit && typeof total === "number") {
    res.pagination = {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  return res;
}


