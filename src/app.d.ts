declare global {
  namespace App {
    interface Platform {
      env: {
        RATE_LIMITER: { limit(options: { key: string }): Promise<{ success: boolean }> };
      };
      ctx: ExecutionContext;
      cf: Record<string, unknown>;
    }
  }
}

export {};
