export interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
  timestamp: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API Domain Types
export interface Project {
  id: string;
  api_key: string;
  name: string;
  description?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  collectionId: string;
  name: string;
  content: any;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  project_name: string;
  description?: string;
  contract_hash: string;
  contract_json: string;
}

export interface CreateCollectionInput {
  name: string;
}

export interface CreateDocumentInput {
  id: string;
  data: any;
  metadata: {
    created_at: number;
    updated_at: number;
    version: number;
    tags: string[];
  };
}

export interface UpdateDocumentInput {
  id: string;
  data: any;
  metadata: any;
}
