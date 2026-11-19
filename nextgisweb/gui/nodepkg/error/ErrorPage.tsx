import { ContentCard } from "../component/content-card/ContentCard";

import { ErrorWidget } from "./ErrorWidget";
import type { ErrorInfo } from "./extractError";

export function ErrorPage({ error }: { error: ErrorInfo }) {
  return (
    <ContentCard style={{ width: "40em" }}>
      <ErrorWidget error={error} />
    </ContentCard>
  );
}
