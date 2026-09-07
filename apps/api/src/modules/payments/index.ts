import { Elysia, t } from "elysia";
import { ensureAuth } from "../../common/auth.util";
import { authPlugin } from "../../plugins/auth";
import { CreatePaymentIntentSchema, MidtransWebhookSchema } from "./model";
import { paymentsService } from "./service";

export const paymentsModule = new Elysia({
  prefix: "/payments",
  name: "paymentsModule",
})
  .use(authPlugin)
  .post(
    "/intents",
    ({ body, user }) => {
      const authed = ensureAuth(user);
      return paymentsService.createIntentForUser(authed.id, body);
    },
    {
      body: CreatePaymentIntentSchema,
      response: t.Any(),
      detail: { summary: "Create payment intent", tags: ["Payments"] },
    },
  )
  .get(
    "/:id",
    ({ params, user }) => {
      const authed = ensureAuth(user);
      return paymentsService.findPaymentForUser(params.id, authed.id);
    },
    {
      response: t.Any(),
      detail: { summary: "Get payment status by ID", tags: ["Payments"] },
    },
  )
  .patch(
    "/:id/mark-paid",
    ({ params, user }) => {
      const authed = ensureAuth(user);
      return paymentsService.markPaidForUser(params.id, authed.id);
    },
    {
      response: t.Any(),
      detail: { summary: "Mark demo payment as paid", tags: ["Payments"] },
    },
  )
  .post(
    "/webhook",
    async ({ body, set }) => {
      await paymentsService.handleMidtransWebhook(body);
      set.status = 200;
      return { ok: true };
    },
    {
      body: MidtransWebhookSchema,
      response: t.Any(),
      detail: { summary: "Midtrans webhook handler", tags: ["Payments"] },
    },
  );
