import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { HttpException } from "./common/errors";
import { prisma } from "./common/prisma";
import { adminModule } from "./modules/admin";
import { authModule } from "./modules/auth";
import { bookingsModule } from "./modules/bookings";
import { bookingExpiryService } from "./modules/bookings/expiry.service";
import { courtsModule } from "./modules/courts";
import { disputesModule } from "./modules/disputes";
import { invitesModule } from "./modules/invites";
import { notificationsModule } from "./modules/notifications";
import { paymentsModule } from "./modules/payments";
import { refundsModule } from "./modules/refunds";
import { reviewsModule } from "./modules/reviews";
import { statsModule } from "./modules/stats";
import { uploadsModule } from "./modules/uploads";
import { usersModule } from "./modules/users";
import { venuesModule } from "./modules/venues";
import { vouchersModule } from "./modules/vouchers";

const port = process.env.PORT ? Number(process.env.PORT) : 3001;

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Sweep rate limit map periodically
if (process.env.NODE_ENV !== "test") {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of rateLimitMap.entries()) {
      if (now > record.resetTime) {
        rateLimitMap.delete(ip);
      }
    }
  }, 60000);
}

export const app = new Elysia()
  .onRequest(({ request, store, set }) => {
    const reqId =
      request.headers.get("x-request-id") ||
      `req_${Math.random().toString(36).slice(2, 10)}`;
    (store as any).reqId = reqId;
    (store as any).startTime = performance.now();

    const url = new URL(request.url).pathname;
    if (url === "/api/health" || url.startsWith("/api/swagger")) return;

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const now = Date.now();
    const windowMs = 60000;
    const maxRequests = 120;
    const record = rateLimitMap.get(ip);

    if (!record || now > record.resetTime) {
      rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
      return;
    }

    record.count++;
    if (record.count > maxRequests) {
      set.status = 429;
      set.headers["retry-after"] = String(
        Math.ceil((record.resetTime - now) / 1000),
      );
      return {
        statusCode: 429,
        message: "Too many requests. Please try again in a minute.",
        error: "Too Many Requests",
      };
    }
  })
  .onAfterResponse(({ request, store, set }) => {
    const startTime = (store as any).startTime || performance.now();
    const reqId = (store as any).reqId || "unknown";
    const duration = Math.round(performance.now() - startTime);
    const method = request.method;
    const url = new URL(request.url).pathname;
    const status = typeof set.status === "number" ? set.status : 200;
    const timestamp = new Date().toISOString();

    set.headers["x-request-id"] = reqId;

    if (process.env.NODE_ENV === "production") {
      const level = status >= 500 ? "ERROR" : status >= 400 ? "WARN" : "INFO";
      const logPayload = JSON.stringify({
        timestamp,
        level,
        reqId,
        method,
        path: url,
        status,
        durationMs: duration,
      });
      if (status >= 500) console.error(logPayload);
      else if (status >= 400) console.warn(logPayload);
      else console.log(logPayload);
    } else {
      const formattedTime = timestamp.replace("T", " ").slice(0, 19);
      if (status >= 500) {
        console.error(
          `[${formattedTime}] [ERROR] [${reqId}] ${method} ${url} ${status} - ${duration}ms`,
        );
      } else if (status >= 400) {
        console.warn(
          `[${formattedTime}] [WARN] [${reqId}] ${method} ${url} ${status} - ${duration}ms`,
        );
      } else {
        console.log(
          `[${formattedTime}] [INFO] [${reqId}] ${method} ${url} ${status} - ${duration}ms`,
        );
      }
    }
  })
  .use(
    cors({
      origin: true,
      credentials: true,
      allowedHeaders: [
        "Authorization",
        "Content-Type",
        "Accept",
        "X-Request-ID",
      ],
      methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    }),
  )
  .use(
    swagger({
      path: "/api/swagger",
      scalarConfig: {
        spec: {
          url: "/api/swagger/json",
        },
      },
      documentation: {
        info: {
          title: "Padelhive API (ElysiaJS)",
          version: "1.0.0",
          description:
            "High-performance Padel booking platform API powered by Bun and ElysiaJS",
        },
        tags: [
          { name: "Auth", description: "Authentication endpoints" },
          { name: "Users", description: "User profile endpoints" },
          {
            name: "Venues",
            description: "Padel venues discovery & availability",
          },
          {
            name: "Courts",
            description: "Court scheduling & pricing management",
          },
          {
            name: "Bookings",
            description: "Booking reservation & split payments",
          },
          {
            name: "Payments",
            description: "Payment intents and Midtrans gateway webhooks",
          },
          {
            name: "Refunds",
            description: "Cancellation refunds and dispute review workflows",
          },
          {
            name: "Invites",
            description: "Friend invite links and RSVP management",
          },
          { name: "Vouchers", description: "Promotional discount codes" },
          { name: "Reviews", description: "Player reviews and venue ratings" },
          {
            name: "Disputes",
            description: "Dispute resolution and complaint tracking",
          },
          {
            name: "Admin",
            description: "Super Admin dashboards and platform metrics",
          },
          {
            name: "Notifications",
            description: "Real-time SSE push stream & user alerts",
          },
          { name: "Uploads", description: "Cloudinary upload signatures" },
          { name: "Stats", description: "Live marketplace metrics" },
          { name: "Health", description: "Service health & readiness checks" },
        ],
      },
    }),
  )
  .get("/api/health", async ({ set }) => {
    const startTime = performance.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      const dbLatency = Math.round(performance.now() - startTime);
      return {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
          database: {
            status: "up",
            latencyMs: dbLatency,
          },
        },
      };
    } catch (error) {
      set.status = 503;
      return {
        status: "error",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
          database: {
            status: "down",
            error: String(error),
          },
        },
      };
    }
  })
  .onError(({ request, store, set, error, code }) => {
    const reqId = (store as any)?.reqId || "unknown";
    set.headers["x-request-id"] = reqId;

    let statusCode = 500;
    let message = (error as any)?.message || "Internal Server Error";
    let errorType = "Internal Server Error";

    if (error instanceof HttpException) {
      statusCode = error.statusCode;
      message = error.message;
      errorType = error.name;
    } else if (code === "VALIDATION") {
      statusCode = 400;
      message = (error as any)?.message || "Validation Error";
      errorType = "Bad Request";
    } else if (code === "NOT_FOUND") {
      statusCode = 404;
      message = "Route not found";
      errorType = "Not Found";
    }

    set.status = statusCode;

    const timestamp = new Date().toISOString();
    if (process.env.NODE_ENV === "production") {
      console.error(
        JSON.stringify({
          timestamp,
          level: "ERROR",
          reqId,
          method: request?.method || "UNKNOWN",
          path: request?.url ? new URL(request.url).pathname : "UNKNOWN",
          status: statusCode,
          code,
          error: errorType,
          message,
          stack: (error as any)?.stack,
        }),
      );
    } else {
      console.error(
        `[${timestamp.replace("T", " ").slice(0, 19)}] [ERROR] [${reqId}] ${request?.method || "REQ"} ${request?.url ? new URL(request.url).pathname : ""} ${statusCode} (${code}: ${message})`,
      );
    }

    return {
      statusCode,
      message,
      error: errorType,
    };
  })
  .group("/api", (app) =>
    app
      .use(authModule)
      .use(usersModule)
      .use(venuesModule)
      .use(courtsModule)
      .use(bookingsModule)
      .use(paymentsModule)
      .use(refundsModule)
      .use(invitesModule)
      .use(vouchersModule)
      .use(reviewsModule)
      .use(disputesModule)
      .use(adminModule)
      .use(notificationsModule)
      .use(uploadsModule)
      .use(statsModule),
  );

// Background cron interval (sweeps expired bookings & unpaid reschedule charges)
if (process.env.NODE_ENV !== "test") {
  setInterval(async () => {
    try {
      await bookingExpiryService.sweepExpiredBookings();
      await bookingExpiryService.sweepUnpaidRescheduleCharges();
      await bookingExpiryService.sweepCompletedBookings();
    } catch (err) {
      console.warn(`[Cron] Background sweep error: ${String(err)}`);
    }
  }, 60000);
}

const host = process.env.HOST || "0.0.0.0";
const displayHost = host === "0.0.0.0" ? "localhost" : host;

app.listen({ port, hostname: host }, () => {
  console.log(
    `🎾 Padelhive API (ElysiaJS) running at http://${displayHost}:${port}/api`,
  );
  console.log(
    `📖 Swagger documentation available at http://${displayHost}:${port}/api/swagger`,
  );
});

export type App = typeof app;
