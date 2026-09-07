import { Elysia, t } from "elysia";
import { ensureAuth } from "../../common/auth.util";
import { authPlugin } from "../../plugins/auth";
import { CreateReviewSchema, ReviewQuerySchema } from "./model";
import { reviewsService } from "./service";

export const reviewsModule = new Elysia({
  prefix: "/reviews",
  name: "reviewsModule",
})
  .use(authPlugin)
  .get(
    "/",
    ({ query }) => {
      return reviewsService.findVenueReviews(query.venueId);
    },
    {
      query: ReviewQuerySchema,
      response: t.Any(),
      detail: { summary: "List reviews for a venue", tags: ["Reviews"] },
    },
  )
  .post(
    "/",
    ({ body, user }) => {
      const authed = ensureAuth(user);
      return reviewsService.createReview(authed.id, body);
    },
    {
      body: CreateReviewSchema,
      response: t.Any(),
      detail: {
        summary: "Submit review for completed booking",
        tags: ["Reviews"],
      },
    },
  );
