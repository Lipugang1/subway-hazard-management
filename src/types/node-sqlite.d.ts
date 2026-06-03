declare module 'node:sqlite' {
  interface DatabaseSyncOptions {
    read?: boolean;
    allowExtension?: boolean;
  }

  interface RunResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  class DatabaseSync {
    constructor(path: string, options?: DatabaseSyncOptions);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
    readonly changes: number;
    readonly lastInsertRowid: number | bigint;
    transaction<T extends (...args: any[]) => any>(fn: T): T & { readonly name: string };
  }

  interface StatementSync {
    run(...params: any[]): RunResult;
    get(...params: any[]): any;
    all(...params: any[]): any[];
    iterate(...params: any[]): IterableIterator<any>;
    readonly columns: any[];
  }

  export { DatabaseSync, DatabaseSyncOptions, RunResult, StatementSync };
}
