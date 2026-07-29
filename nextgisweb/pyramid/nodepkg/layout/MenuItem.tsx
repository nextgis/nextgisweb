import classNames from "classnames";
import { Suspense } from "react";

import { isMenuItem } from "./header/type";
import type { HeaderComponent } from "./header/type";

export function MenuItem<P = any>({
  props,
  item,
}: {
  item: HeaderComponent<P>;
  props?: P;
}) {
  if (!isMenuItem(item)) {
    const LazyItemComponent = item;

    return (
      <Suspense fallback={null}>
        <LazyItemComponent {...(props as any)} />
      </Suspense>
    );
  }
  const { title, className, notification, ...rest } = item;
  return (
    <a
      className={classNames(
        className,
        notification && `notification-${notification}`
      )}
      {...rest}
    >
      {title}
    </a>
  );
}
