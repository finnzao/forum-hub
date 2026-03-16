/**
 * Pool de execução paralela com limite de concorrência.
 *
 * Executa tarefas em paralelo respeitando um máximo de slots simultâneos.
 * Cada tarefa que termina libera o slot para a próxima da fila.
 *
 * Uso:
 *   const pool = new ParallelPool(3);
 *   for (const item of items) {
 *     await pool.add(() => processItem(item));
 *   }
 *   await pool.drain();
 */
export class ParallelPool {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly concurrency: number) {}

  /** Enfileira uma tarefa. Resolve quando há um slot disponível para INICIAR. */
  async add<T>(fn: () => Promise<T>): Promise<void> {
    if (this.running >= this.concurrency) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.running++;
    fn()
      .catch(() => {})
      .finally(() => {
        this.running--;
        const next = this.queue.shift();
        if (next) next();
      });
  }

  /** Aguarda todas as tarefas em execução terminarem. */
  async drain(): Promise<void> {
    while (this.running > 0) {
      await new Promise<void>((resolve) => {
        if (this.running === 0) {
          resolve();
        } else {
          // Poll a cada 50ms — simples e eficaz
          const interval = setInterval(() => {
            if (this.running === 0) {
              clearInterval(interval);
              resolve();
            }
          }, 50);
        }
      });
    }
  }

  get activeCount(): number {
    return this.running;
  }

  get pendingCount(): number {
    return this.queue.length;
  }
}
