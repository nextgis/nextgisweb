import { useCallback } from "react";
// @ts-expect-error - @types/swagger-ui-react has nested dependencies for latest @types/react
import SwaggerUIReact from "swagger-ui-react";

import { routeURL } from "@nextgisweb/pyramid/api";

import "swagger-ui-react/swagger-ui.css";
import "./SwaggerUI.less";

const allowTryItOutFor = () => (_: unknown, path: string) =>
  !path.match(/\?context=\w+$/i);

const openApiJsonUrl = routeURL("pyramid.openapi_json");

const Plugin = () => {
  return {
    components: {
      InfoContainer: () => (
        <a href={openApiJsonUrl} target="_blank">
          {ngwConfig.applicationUrl + openApiJsonUrl}
        </a>
      ),
    },
    statePlugins: {
      // NOTE: Hide the "Try it out" button for overloaded paths
      // containing "?context=...", see NGW-1359 for details.
      spec: { wrapSelectors: { allowTryItOutFor } },
    },
  };
};

const defaults = {
  plugins: [Plugin],
  url: routeURL("pyramid.openapi_json"),
  showCommonExtensions: true,
  deepLinking: true,
};

// NOTE: Fix deep-link scrolling broken in swagger-ui > 5.16.2. When the page
// loads with a URL hash, OperationWrapper ref callbacks fire before
// parseDeepLinkHash sets scrollToKey, so the built-in scroll never triggers.
// After the spec finishes loading (onComplete), we find the target element by
// its swagger-ui-generated ID and scroll to it directly.
function scrollToHash() {
  const hash = decodeURIComponent(window.location.hash);
  if (!hash || hash.length <= 2) return; // "#/" or empty

  // hash format: "#/Tag/operationId" or "#/Tag"
  const [tag, opId] = hash.replace(/^#\//, "").split("/");
  if (!tag) return;

  const id = opId ? `operations-${tag}-${opId}` : `operations-tag-${tag}`;

  requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "instant" as ScrollBehavior,
      block: "start",
    });
  });
}

export function SwaggerUI({
  onComplete: userOnComplete,
  ...props
}: Record<string, unknown>) {
  const handleComplete = useCallback(
    (system: unknown) => {
      if (typeof userOnComplete === "function") {
        userOnComplete(system);
      }
      scrollToHash();
    },
    [userOnComplete]
  );

  const mergedProps = Object.assign({ ...defaults }, props, {
    onComplete: handleComplete,
  });
  return <SwaggerUIReact {...mergedProps} />;
}
