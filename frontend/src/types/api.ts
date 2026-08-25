export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]> | string[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}
