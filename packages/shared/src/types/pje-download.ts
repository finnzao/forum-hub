export type PJEDownloadMode = 'by_number' | 'by_task' | 'by_tag';

export interface PJEDownloadJobPayload {
  jobId: string;
  userId: number;
  requestedBy: string;
  credentials?: PJECredentials;
  mode: PJEDownloadMode;
  processNumbers?: string[];
  taskName?: string;
  isFavorite?: boolean;
  tagId?: number;
  tagName?: string;
  documentType?: number;
  downloadDir?: string;
  maxWaitTime?: number;
  pjeProfileIndex?: number;
}

export interface PJECredentials {
  cpf: string;
  password: string;
}

export type PJEJobStatus =
  | 'pending' | 'authenticating' | 'awaiting_2fa' | 'selecting_profile'
  | 'processing' | 'downloading' | 'checking_integrity' | 'retrying'
  | 'completed' | 'failed' | 'cancelled' | 'partial';

export interface PJEDownloadProgress {
  jobId: string;
  status: PJEJobStatus;
  progress: number;
  totalProcesses: number;
  successCount: number;
  failureCount: number;
  currentProcess?: string;
  files: PJEDownloadedFile[];
  errors: PJEDownloadError[];
  message?: string;
  timestamp: number;
}

export interface PJEDownloadedFile {
  processNumber: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  downloadedAt: string;
}

export interface PJEDownloadError {
  processNumber?: string;
  message: string;
  code?: string;
  timestamp: string;
}

export interface PJEDownloadResult {
  jobId: string;
  status: 'completed' | 'failed' | 'partial';
  totalProcesses: number;
  successCount: number;
  failureCount: number;
  files: PJEDownloadedFile[];
  errors: PJEDownloadError[];
  startedAt: string;
  completedAt: string;
}

export interface CreateDownloadJobDTO {
  mode: PJEDownloadMode;
  credentials: PJECredentials;
  processNumbers?: string[];
  taskName?: string;
  isFavorite?: boolean;
  tagId?: number;
  tagName?: string;
  documentType?: number;
  pjeProfileIndex?: number;
}

export interface Submit2FADTO {
  code: string;
}

export interface DownloadJobResponse {
  id: string;
  userId: number;
  mode: PJEDownloadMode;
  status: PJEJobStatus;
  progress: number;
  totalProcesses: number;
  successCount: number;
  failureCount: number;
  files: PJEDownloadedFile[];
  errors: PJEDownloadError[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export const PJE_QUEUE_NAME = 'pje-download';

export const PJE_REDIS_KEYS = {
  session: (userId: number) => `pje:session:${userId}`,
  twoFaCode: (jobId: string) => `pje:2fa:${jobId}`,
  twoFaRequest: (jobId: string) => `pje:2fa-request:${jobId}`,
  progress: (jobId: string) => `pje:progress:${jobId}`,
} as const;

export const PJE_SESSION_TTL = 8 * 60 * 60;
export const PJE_2FA_TTL = 5 * 60;
export const PJE_MAX_CONCURRENT_JOBS = 3;
export const PJE_DEFAULT_PAGE_SIZE = 500;
export const PJE_DEFAULT_WAIT_TIME = 300;
export const PJE_DOWNLOAD_BATCH_SIZE = 10;
export const PJE_MAX_RETRIES = 2;
