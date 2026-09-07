import { UserRole } from "@prisma/client";
import { Elysia, t } from "elysia";
import { ensureRoles } from "../../common/auth.util";
import { authPlugin } from "../../plugins/auth";
import {
  AvailabilityQuerySchema,
  CreateVenueSchema,
  UpdateVenueSchema,
  VenueFilterSchema,
} from "./model";
import { availabilityService, venuesService } from "./service";

export const venuesModule = new Elysia({
  prefix: "/venues",
  name: "venuesModule",
})
  .use(authPlugin)
  .get(
    "/manage",
    ({ user }) => {
      const authed = ensureRoles(
        user,
        UserRole.VENUE_OWNER,
        UserRole.VENUE_ADMIN,
        UserRole.SUPER_ADMIN,
      );
      return venuesService.findVenuesForManagement(
        authed.id,
        authed.role === UserRole.SUPER_ADMIN,
      );
    },
    {
      response: t.Any(),
      detail: { summary: "List venues for management", tags: ["Venues"] },
    },
  )
  .get(
    "/:id/availability",
    ({ params, query }) => {
      return availabilityService.getVenueAvailability(
        params.id,
        query.date,
        query.courtId,
      );
    },
    {
      query: AvailabilityQuerySchema,
      response: t.Any(),
      detail: { summary: "Get venue availability calendar", tags: ["Venues"] },
    },
  )
  .get(
    "/",
    ({ query }) => {
      return venuesService.findApprovedVenues(query);
    },
    {
      query: VenueFilterSchema,
      response: t.Any(),
      detail: {
        summary: "List approved venues with filters",
        tags: ["Venues"],
      },
    },
  )
  .post(
    "/",
    ({ body, user }) => {
      const authed = ensureRoles(
        user,
        UserRole.VENUE_OWNER,
        UserRole.SUPER_ADMIN,
      );
      return venuesService.createVenue(authed.id, body);
    },
    {
      body: CreateVenueSchema,
      response: t.Any(),
      detail: { summary: "Create new venue", tags: ["Venues"] },
    },
  )
  .get(
    "/:id",
    ({ params }) => {
      return venuesService.findApprovedVenueById(params.id);
    },
    {
      response: t.Any(),
      detail: { summary: "Get venue details by ID", tags: ["Venues"] },
    },
  )
  .patch(
    "/:id",
    ({ params, body, user }) => {
      const authed = ensureRoles(
        user,
        UserRole.VENUE_OWNER,
        UserRole.VENUE_ADMIN,
        UserRole.SUPER_ADMIN,
      );
      return venuesService.updateVenue(
        params.id,
        authed.id,
        authed.role === UserRole.SUPER_ADMIN,
        body,
      );
    },
    {
      body: UpdateVenueSchema,
      response: t.Any(),
      detail: { summary: "Update venue details", tags: ["Venues"] },
    },
  );
