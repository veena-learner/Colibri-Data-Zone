import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../store/authStore';
import type {
  ApiResponse,
  AuthResponse,
  DataAsset,
  Domain,
  GlossaryTerm,
  LineageEdge,
  LineageGraph,
  DashboardStats,
  User,
  IngestionStatus,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await api.post<ApiResponse<AuthResponse>>('/auth/login', {
      email,
      password,
    });
    return data.data!;
  },

  register: async (
    email: string,
    name: string,
    password: string
  ): Promise<AuthResponse> => {
    const { data } = await api.post<ApiResponse<AuthResponse>>('/auth/register', {
      email,
      name,
      password,
    });
    return data.data!;
  },

  getMe: async (): Promise<{ id: string; email: string; name: string; role: string }> => {
    const { data } = await api.get<ApiResponse<{ id: string; email: string; name: string; role: string }>>('/auth/me');
    return data.data!;
  },
};

export const sourceTablesApi = {
  list: async (params?: {
    sourceSystem?: string;
    domainId?: string;
    ingestionStatus?: IngestionStatus;
    search?: string;
  }): Promise<DataAsset[]> => {
    const { data } = await api.get<ApiResponse<DataAsset[]>>('/assets/source-tables', { params });
    return data.data || [];
  },

  updateMapping: async (id: string, updates: Partial<DataAsset>): Promise<DataAsset> => {
    const { data } = await api.put<ApiResponse<DataAsset>>(`/assets/${id}`, updates);
    return data.data!;
  },
};

export const assetsApi = {
  list: async (params?: { domainId?: string; search?: string }): Promise<DataAsset[]> => {
    const { data } = await api.get<ApiResponse<DataAsset[]>>('/assets', { params });
    return data.data || [];
  },

  getById: async (id: string): Promise<DataAsset> => {
    const { data } = await api.get<ApiResponse<DataAsset>>(`/assets/${id}`);
    return data.data!;
  },

  create: async (asset: Partial<DataAsset>): Promise<DataAsset> => {
    const { data } = await api.post<ApiResponse<DataAsset>>('/assets', asset);
    return data.data!;
  },

  update: async (id: string, updates: Partial<DataAsset>): Promise<DataAsset> => {
    const { data } = await api.put<ApiResponse<DataAsset>>(`/assets/${id}`, updates);
    return data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/assets/${id}`);
  },
};

export const domainsApi = {
  list: async (): Promise<Domain[]> => {
    const { data } = await api.get<ApiResponse<Domain[]>>('/domains');
    return data.data || [];
  },

  getById: async (id: string): Promise<Domain> => {
    const { data } = await api.get<ApiResponse<Domain>>(`/domains/${id}`);
    return data.data!;
  },

  create: async (domain: Partial<Domain>): Promise<Domain> => {
    const { data } = await api.post<ApiResponse<Domain>>('/domains', domain);
    return data.data!;
  },

  update: async (id: string, updates: Partial<Domain>): Promise<Domain> => {
    const { data } = await api.put<ApiResponse<Domain>>(`/domains/${id}`, updates);
    return data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/domains/${id}`);
  },
};

export const glossaryApi = {
  list: async (params?: { search?: string }): Promise<GlossaryTerm[]> => {
    const { data } = await api.get<ApiResponse<GlossaryTerm[]>>('/glossary', { params });
    return data.data || [];
  },

  getById: async (id: string): Promise<GlossaryTerm> => {
    const { data } = await api.get<ApiResponse<GlossaryTerm>>(`/glossary/${id}`);
    return data.data!;
  },

  create: async (term: Partial<GlossaryTerm>): Promise<GlossaryTerm> => {
    const { data } = await api.post<ApiResponse<GlossaryTerm>>('/glossary', term);
    return data.data!;
  },

  update: async (id: string, updates: Partial<GlossaryTerm>): Promise<GlossaryTerm> => {
    const { data } = await api.put<ApiResponse<GlossaryTerm>>(`/glossary/${id}`, updates);
    return data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/glossary/${id}`);
  },
};

export const lineageApi = {
  list: async (): Promise<LineageEdge[]> => {
    const { data } = await api.get<ApiResponse<LineageEdge[]>>('/lineage');
    return data.data || [];
  },

  getGraph: async (assetId: string, depth?: number): Promise<LineageGraph> => {
    const { data } = await api.get<ApiResponse<LineageGraph>>(
      `/lineage/graph/${assetId}`,
      { params: { depth } }
    );
    return data.data!;
  },

  create: async (edge: Partial<LineageEdge>): Promise<LineageEdge> => {
    const { data } = await api.post<ApiResponse<LineageEdge>>('/lineage', edge);
    return data.data!;
  },

  delete: async (sourceAssetId: string, targetAssetId: string): Promise<void> => {
    await api.delete(`/lineage/${sourceAssetId}/${targetAssetId}`);
  },
};

export const statsApi = {
  getDashboard: async (): Promise<DashboardStats> => {
    const { data } = await api.get<ApiResponse<DashboardStats>>('/stats/dashboard');
    return data.data!;
  },
};

export interface BulkUploadResult {
  totalRows: number;
  successCount: number;
  errorCount: number;
  createdAssets: string[];
  errors: { row: number; name: string; error: string }[];
}

export const uploadApi = {
  bulkUploadAssets: async (file: File): Promise<BulkUploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<ApiResponse<BulkUploadResult>>('/upload/assets', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data.data!;
  },

  downloadTemplate: (): string => {
    return '/api/upload/template';
  },
};

export interface UsersByRole {
  domainOwners: User[];
  dataStewards: User[];
  dataOwners: User[];
}

export const usersApi = {
  list: async (): Promise<User[]> => {
    const { data } = await api.get<ApiResponse<User[]>>('/users');
    return data.data || [];
  },

  getByRole: async (): Promise<UsersByRole> => {
    const { data } = await api.get<ApiResponse<UsersByRole>>('/users/by-role');
    return data.data!;
  },
};

export default api;
