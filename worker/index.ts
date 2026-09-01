/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  AI_KEY_ENCRYPTION_SECRET?: string;
  AI_SCHEDULER_SECRET?: string;
  AI_QUERY_RATE_LIMIT_PER_MINUTE?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

interface ScheduledController {
  cron: string;
  scheduledTime: number;
  noRetry(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    if (!env.AI_SCHEDULER_SECRET) {
      console.error("AI scheduler skipped: AI_SCHEDULER_SECRET is not configured");
      return;
    }
    const scheduledRequests = [
      new Request("https://atlas.internal/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-atlas-scheduler": env.AI_SCHEDULER_SECRET },
        body: JSON.stringify({ action: "run-due" }),
      }),
      new Request("https://atlas.internal/api/industry", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-atlas-scheduler": env.AI_SCHEDULER_SECRET },
        body: JSON.stringify({ action: "run-due" }),
      }),
    ];
    ctx.waitUntil(Promise.all(scheduledRequests.map(async (request) => {
      const response = await handler.fetch(request, env, ctx);
      if (!response.ok) throw new Error(`${new URL(request.url).pathname} scheduler failed: ${response.status}`);
    })).then(() => undefined));
  },
};

export default worker;
