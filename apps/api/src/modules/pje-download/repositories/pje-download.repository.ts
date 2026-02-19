import type { Pool } from 'pg';
import type {
  PJEDownloadMode,
  PJEJobStatus,
  PJEDownloadedFile,
  PJEDownloadError,
  DownloadJobResponse,
} from 'shared';

interface CreateJobParams {
  id: string;
  userId: number;
  mode: PJEDownloadMode;
  params: Record<string, unknown>;
}

interface UpdateJobParams {
  id: string;
  status?: PJEJobStatus;
  progress?: number;
  totalProcesses?: number;
  successCount?: number;
  failureCount?: number;
  files?: PJEDownloadedFile[];
  errors?: PJEDownloadError[];
  startedAt?: Date;
  completedAt?: Date;
}

export class PJEDownloadRepository {
  constructor(private pool: Pool) {}

  async createJob(params: CreateJobParams): Promise<DownloadJobResponse> {
    const { rows } = await this.pool.query(
      `INSERT INTO pje_download_jobs (id, user_id, mode, params)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [params.id, params.userId, params.mode, JSON.stringify(params.params)]
    );
    return this.mapRow(rows[0]);
  }

  async findJobById(id: string): Promise<DownloadJobResponse | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM pje_download_jobs WHERE id = $1`,
      [id]
    );
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  async findJobsByUser(
    userId: number,
    limit = 20,
    offset = 0
  ): Promise<{ jobs: DownloadJobResponse[]; total: number }> {
    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM pje_download_jobs WHERE user_id = $1`,
      [userId]
    );

    const { rows } = await this.pool.query(
      `SELECT * FROM pje_download_jobs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return {
      jobs: rows.map((r: any) => this.mapRow(r)),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  async updateJob(params: UpdateJobParams): Promise<void> {
    const sets: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [];
    let idx = 1;

    if (params.status !== undefined) { sets.push(`status = $${idx++}`); values.push(params.status); }
    if (params.progress !== undefined) { sets.push(`progress = $${idx++}`); values.push(params.progress); }
    if (params.totalProcesses !== undefined) { sets.push(`total_processes = $${idx++}`); values.push(params.totalProcesses); }
    if (params.successCount !== undefined) { sets.push(`success_count = $${idx++}`); values.push(params.successCount); }
    if (params.failureCount !== undefined) { sets.push(`failure_count = $${idx++}`); values.push(params.failureCount); }
    if (params.files !== undefined) { sets.push(`files = $${idx++}`); values.push(JSON.stringify(params.files)); }
    if (params.errors !== undefined) { sets.push(`errors = $${idx++}`); values.push(JSON.stringify(params.errors)); }
    if (params.startedAt !== undefined) { sets.push(`started_at = $${idx++}`); values.push(params.startedAt); }
    if (params.completedAt !== undefined) { sets.push(`completed_at = $${idx++}`); values.push(params.completedAt); }

    values.push(params.id);
    await this.pool.query(
      `UPDATE pje_download_jobs SET ${sets.join(', ')} WHERE id = $${idx}`,
      values
    );
  }

  async countActiveJobsByUser(userId: number): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT COUNT(*) FROM pje_download_jobs
       WHERE user_id = $1
       AND status IN ('pending','authenticating','awaiting_2fa','selecting_profile','processing','downloading','checking_integrity','retrying')`,
      [userId]
    );
    return parseInt(rows[0].count, 10);
  }

  async findAuditByJob(jobId: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM pje_download_audit WHERE job_id = $1 ORDER BY downloaded_at ASC`,
      [jobId]
    );
    return rows;
  }

  private mapRow(row: any): DownloadJobResponse {
    return {
      id: row.id,
      userId: row.user_id,
      mode: row.mode,
      status: row.status,
      progress: row.progress ?? 0,
      totalProcesses: row.total_processes ?? 0,
      successCount: row.success_count ?? 0,
      failureCount: row.failure_count ?? 0,
      files: row.files ?? [],
      errors: row.errors ?? [],
      createdAt: row.created_at?.toISOString(),
      startedAt: row.started_at?.toISOString(),
      completedAt: row.completed_at?.toISOString(),
    };
  }
}
