import { Elysia, t } from "elysia";
import { ValidateVoucherSchema } from "./model";
import { vouchersService } from "./service";

export const vouchersModule = new Elysia({
  prefix: "/vouchers",
  name: "vouchersModule",
})
  .get(
    "/",
    () => {
      return vouchersService.findActiveVouchers();
    },
    {
      response: t.Any(),
      detail: { summary: "List active available vouchers", tags: ["Vouchers"] },
    },
  )
  .post(
    "/validate",
    async ({ body }) => {
      const priced = await vouchersService.priceVoucher(body.code, body.amount);
      return {
        code: priced.code,
        type: priced.type,
        discount: priced.discount,
        finalAmount: body.amount - priced.discount,
      };
    },
    {
      body: ValidateVoucherSchema,
      response: t.Any(),
      detail: {
        summary: "Validate voucher and calculate discount",
        tags: ["Vouchers"],
      },
    },
  );
