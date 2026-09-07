import { Elysia, t } from "elysia";
import { ensureAuth } from "../../common/auth.util";
import { authPlugin } from "../../plugins/auth";
import { CreateDisputeSchema } from "./model";
import { disputesService } from "./service";

export const disputesModule = new Elysia({
  prefix: "/disputes",
  name: "disputesModule",
})
  .use(authPlugin)
  .post(
    "/",
    ({ body, user }) => {
      const authed = ensureAuth(user);
      return disputesService.createDispute(authed.id, body);
    },
    {
      body: CreateDisputeSchema,
      response: t.Any(),
      detail: { summary: "Submit dispute on booking", tags: ["Disputes"] },
    },
  )
  .get(
    "/me",
    ({ user }) => {
      const authed = ensureAuth(user);
      return disputesService.findMyDisputes(authed.id);
    },
    {
      response: t.Any(),
      detail: { summary: "List current user's disputes", tags: ["Disputes"] },
    },
  );
