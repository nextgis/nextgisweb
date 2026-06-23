import type { AnchorHTMLAttributes, MouseEvent } from "react";
import { useInRouterContext, useNavigate } from "react-router-dom";

import { getClientPageLocation, isClientPagePath } from "./clientPageRouteUtil";

export interface RouteLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
}

interface RouteLinkInRouterProps extends RouteLinkProps {
  to: string;
}

function isModifiedEvent(event: MouseEvent<HTMLAnchorElement>) {
  return event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;
}

function isNonSelfTarget(target?: string) {
  return target !== undefined && target !== "" && target !== "_self";
}

function shouldUseBrowserNavigation({
  event,
  target,
}: {
  event: MouseEvent<HTMLAnchorElement>;
  target?: string;
}) {
  return (
    event.button !== 0 || isModifiedEvent(event) || isNonSelfTarget(target)
  );
}

function PlainRouteLink({
  href,
  target,
  children,
  ...anchorProps
}: RouteLinkProps) {
  return (
    <a href={href} target={target} {...anchorProps}>
      {children}
    </a>
  );
}

function RouteLinkInRouter({
  href,
  to,
  target,
  onClick,
  children,
  ...anchorProps
}: RouteLinkInRouterProps) {
  const navigate = useNavigate();

  return (
    <a
      href={href}
      target={target}
      onClick={(event) => {
        onClick?.(event);

        if (
          event.defaultPrevented ||
          shouldUseBrowserNavigation({ event, target })
        ) {
          return;
        }

        event.preventDefault();
        navigate(to);
      }}
      {...anchorProps}
    >
      {children}
    </a>
  );
}

export function RouteLink(props: RouteLinkProps) {
  const inRouter = useInRouterContext();

  if (!inRouter || isNonSelfTarget(props.target)) {
    return <PlainRouteLink {...props} />;
  }

  const location = getClientPageLocation(props.href);

  if (!location || !isClientPagePath(location.pathname)) {
    return <PlainRouteLink {...props} />;
  }

  return <RouteLinkInRouter {...props} to={location.to} />;
}
