import { Elysia, t } from "elysia";
import { ensureAuth } from "../../common/auth.util";
import { authPlugin } from "../../plugins/auth";
import { notificationsService } from "./service";

export const notificationsModule = new Elysia({
  prefix: "/notifications",
  name: "notificationsModule",
})
  .use(authPlugin)
  .get(
    "/stream",
    ({ user }) => {
      const authed = ensureAuth(user);

      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();

          controller.enqueue(
            encoder.encode(
              `event: ping\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`,
            ),
          );

          const sub = notificationsService.streamForUser(authed.id).subscribe({
            next: (notification) => {
              try {
                controller.enqueue(
                  encoder.encode(
                    `event: notification\ndata: ${JSON.stringify(notification)}\n\n`,
                  ),
                );
              } catch {
                // stream closed
              }
            },
          });

          const heartbeat = setInterval(() => {
            try {
              controller.enqueue(
                encoder.encode(
                  `event: ping\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`,
                ),
              );
            } catch {
              clearInterval(heartbeat);
              sub.unsubscribe();
            }
          }, 25000);
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    },
    {
      detail: {
        summary: "Subscribe to real-time notification stream (SSE)",
        tags: ["Notifications"],
      },
    },
  )
  .get(
    "/",
    ({ user }) => {
      const authed = ensureAuth(user);
      return notificationsService.findMyNotifications(authed.id);
    },
    {
      response: t.Any(),
      detail: {
        summary: "Get current user notifications",
        tags: ["Notifications"],
      },
    },
  )
  .get(
    "/unread-count",
    ({ user }) => {
      const authed = ensureAuth(user);
      return notificationsService.getUnreadCount(authed.id);
    },
    {
      response: t.Any(),
      detail: {
        summary: "Get unread notifications count",
        tags: ["Notifications"],
      },
    },
  )
  .patch(
    "/read-all",
    ({ user }) => {
      const authed = ensureAuth(user);
      return notificationsService.markAllAsRead(authed.id);
    },
    {
      response: t.Any(),
      detail: {
        summary: "Mark all notifications as read",
        tags: ["Notifications"],
      },
    },
  )
  .patch(
    "/:id/read",
    ({ params, user }) => {
      const authed = ensureAuth(user);
      return notificationsService.markAsRead(params.id, authed.id);
    },
    {
      response: t.Any(),
      detail: { summary: "Mark notification as read", tags: ["Notifications"] },
    },
  );
