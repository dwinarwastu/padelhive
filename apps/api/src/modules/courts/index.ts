import { UserRole } from "@prisma/client";
import { Elysia, t } from "elysia";
import { ensureRoles } from "../../common/auth.util";
import { authPlugin } from "../../plugins/auth";
import { CreateCourtSchema, UpdateCourtSchema } from "./model";
import { courtsService } from "./service";

export const courtsModule = new Elysia({
  prefix: "/venues/:id/courts",
  name: "courtsModule",
})
  .use(authPlugin)
  .get(
    "/manage",
    ({ params, user }) => {
      const authed = ensureRoles(
        user,
        UserRole.VENUE_OWNER,
        UserRole.VENUE_ADMIN,
        UserRole.SUPER_ADMIN,
      );
      return courtsService.findCourtsForManagement(
        params.id,
        authed.id,
        authed.role === UserRole.SUPER_ADMIN,
      );
    },
    {
      response: t.Any(),
      detail: { summary: "List courts for management", tags: ["Courts"] },
    },
  )
  .post(
    "/",
    ({ params, body, user }) => {
      const authed = ensureRoles(
        user,
        UserRole.VENUE_OWNER,
        UserRole.VENUE_ADMIN,
        UserRole.SUPER_ADMIN,
      );
      return courtsService.createCourt(
        params.id,
        authed.id,
        authed.role === UserRole.SUPER_ADMIN,
        body,
      );
    },
    {
      body: CreateCourtSchema,
      response: t.Any(),
      detail: { summary: "Create new court in venue", tags: ["Courts"] },
    },
  )
  .patch(
    "/:courtId",
    ({ params, body, user }) => {
      const authed = ensureRoles(
        user,
        UserRole.VENUE_OWNER,
        UserRole.VENUE_ADMIN,
        UserRole.SUPER_ADMIN,
      );
      return courtsService.updateCourt(
        params.id,
        params.courtId,
        authed.id,
        authed.role === UserRole.SUPER_ADMIN,
        body,
      );
    },
    {
      body: UpdateCourtSchema,
      response: t.Any(),
      detail: { summary: "Update court details", tags: ["Courts"] },
    },
  )
  .get(
    "/",
    ({ params }) => {
      return courtsService.findActiveCourtsForApprovedVenue(params.id);
    },
    {
      response: t.Any(),
      detail: { summary: "List active courts for venue", tags: ["Courts"] },
    },
  );
