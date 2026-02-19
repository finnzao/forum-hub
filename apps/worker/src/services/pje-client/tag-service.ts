// ============================================================
// apps/worker/src/services/pje-client/tag-service.ts
// Tag Service — etiquetas e processos vinculados
// ============================================================

import { PJEHttpClient } from './http-client';
import { config } from '../../config';
import type { PJEProcess } from './task-service';

export interface PJETag {
  id: number;
  nomeTag: string;
  nomeTagCompleto: string;
  favorita: boolean;
}

export class TagService {
  constructor(private http: PJEHttpClient) {}

  async searchTags(search = ''): Promise<PJETag[]> {
    const result = await this.http.apiPost<{ entities: PJETag[] }>(
      'painelUsuario/etiquetas',
      {
        page: 0,
        maxResults: 500,
        tagsString: search,
      }
    );
    return result.entities || [];
  }

  async getTagProcessCount(tagId: number): Promise<number> {
    const result = await this.http.apiGet<string>(
      `painelUsuario/etiquetas/${tagId}/processos/total`
    );
    return parseInt(String(result), 10);
  }

  async listTagProcesses(
    tagId: number,
    limit = config.pje.defaultPageSize,
    offset = 0
  ): Promise<PJEProcess[]> {
    return this.http.apiGet<PJEProcess[]>(
      `painelUsuario/etiquetas/${tagId}/processos?limit=${limit}&offset=${offset}`
    );
  }

  async *getAllTagProcesses(tagId: number): AsyncGenerator<PJEProcess[], void, unknown> {
    const pageSize = config.pje.defaultPageSize;
    const total = await this.getTagProcessCount(tagId);
    let offset = 0;

    while (offset < total) {
      const processes = await this.listTagProcesses(tagId, pageSize, offset);
      if (processes.length === 0) break;

      yield processes;
      offset += pageSize;

      await sleep(config.pje.requestDelay);
    }
  }

  async findTagByName(name: string): Promise<PJETag | null> {
    const tags = await this.searchTags(name);
    return tags.find((t) => t.nomeTag === name || t.nomeTagCompleto === name) || null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
