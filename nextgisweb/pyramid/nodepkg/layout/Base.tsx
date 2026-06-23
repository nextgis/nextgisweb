import { EntrypointSuspense } from "../component/EntrypointSuspense";

import { BaseLayout, PageModelProvider } from "./BaseLayout";
import { ClientPageRouterProvider } from "./ClientPageRouter";
import type { PageModel } from "./PageModel";

export type BaseProps = PageModel;

export function Base(props: BaseProps) {
  return (
    <PageModelProvider value={props}>
      <ClientPageRouterProvider
        fallback={
          <BaseLayout>
            <EntrypointSuspense
              entrypoint={props.entrypoint}
              props={props.entrypointProps}
            />
          </BaseLayout>
        }
      />
    </PageModelProvider>
  );
}
