declare global {
  namespace App {
    interface Platform {
      env: Env;
      ctx: ExecutionContext;
      cf: Record<string, unknown>;
    }
  }
}

export {};
