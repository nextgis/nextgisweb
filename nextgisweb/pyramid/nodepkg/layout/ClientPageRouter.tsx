import { Suspense, useState } from "react";
import type { ReactNode } from "react";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

import { EntrypointFallback } from "../component/EntrypointSuspense";
import routeData from "../page-route.inc";

import {
  getClientPageBasename,
  setClientPageRoutes,
} from "./clientPageRouteUtil";

setClientPageRoutes(routeData);

interface ClientPageRouterProviderProps {
  fallback: ReactNode;
}

export function ClientPageRouterProvider({
  fallback,
}: ClientPageRouterProviderProps) {
  const [router] = useState(() =>
    createBrowserRouter(
      [
        ...routeData,
        {
          path: "*",
          element: fallback,
        },
      ],
      {
        basename: getClientPageBasename(),
      }
    )
  );

  return (
    <Suspense fallback={<EntrypointFallback />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
