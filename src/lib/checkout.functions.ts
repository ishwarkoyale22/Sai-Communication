import { createServerFn } from "@tanstack/react-start";
import { placeWebsiteOrder, type PlaceOrderInput } from "./checkout.server";

export const placeOrder = createServerFn({ method: "POST" })
  .validator((d: PlaceOrderInput) => d)
  .handler(async ({ data }) => placeWebsiteOrder(data));
