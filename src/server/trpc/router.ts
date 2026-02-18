import { createTRPCRouter } from "@/server/trpc/trpc";
import { buildsRouter } from "@/server/trpc/routers/builds";
import { offersRouter } from "@/server/trpc/routers/offers";
import { plantsRouter } from "@/server/trpc/routers/plants";
import { productsRouter } from "@/server/trpc/routers/products";
import { priceAlertsRouter } from "@/server/trpc/routers/price-alerts";
import { rulesRouter } from "@/server/trpc/routers/rules";
import { reportsRouter } from "@/server/trpc/routers/reports";
import { usersRouter } from "@/server/trpc/routers/users";
import { visualBuilderRouter } from "@/server/trpc/routers/visual-builder";

export const appRouter = createTRPCRouter({
  builds: buildsRouter,
  offers: offersRouter,
  plants: plantsRouter,
  products: productsRouter,
  priceAlerts: priceAlertsRouter,
  rules: rulesRouter,
  reports: reportsRouter,
  users: usersRouter,
  visualBuilder: visualBuilderRouter,
});

export type AppRouter = typeof appRouter;
