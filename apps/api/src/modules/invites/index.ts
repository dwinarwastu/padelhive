import { Elysia, t } from "elysia";
import { ensureAuth } from "../../common/auth.util";
import { authPlugin } from "../../plugins/auth";
import { CreateInviteSchema, RsvpInviteSchema } from "./model";
import { invitesService } from "./service";

export const invitesModule = new Elysia({ name: "invitesModule" })
  .use(authPlugin)
  .post(
    "/bookings/:id/invites",
    ({ params, body, user }) => {
      const authed = ensureAuth(user);
      return invitesService.createInviteForBooking(authed.id, params.id, body);
    },
    {
      body: CreateInviteSchema,
      response: t.Any(),
      detail: {
        summary: "Create player invite for booking",
        tags: ["Invites"],
      },
    },
  )
  .get(
    "/bookings/:id/invites",
    ({ params, user }) => {
      const authed = ensureAuth(user);
      return invitesService.listInvitesForBooking(authed.id, params.id);
    },
    {
      response: t.Any(),
      detail: { summary: "List invites for booking", tags: ["Invites"] },
    },
  )
  .get(
    "/invites/:token",
    ({ params }) => {
      return invitesService.getInviteByToken(params.token);
    },
    {
      response: t.Any(),
      detail: {
        summary: "Get public invite details by token",
        tags: ["Invites"],
      },
    },
  )
  .patch(
    "/invites/:token/rsvp",
    ({ params, body }) => {
      return invitesService.rsvpByToken(params.token, body);
    },
    {
      body: RsvpInviteSchema,
      response: t.Any(),
      detail: { summary: "RSVP to public invite token", tags: ["Invites"] },
    },
  );
