import { Fragment, useLayoutEffect, useRef, useState } from "react";
import type { Key, ReactNode } from "react";

import { Button, Dropdown } from "@nextgisweb/gui/antd";
import { useThemeVariables } from "@nextgisweb/gui/hook";
import { SvgIcon } from "@nextgisweb/gui/svg-icon";

import "./Breadcrumbs.less";

export interface BreadcrumbItem {
  key?: Key;
  icon?: ReactNode;
  link?: string;
  label: ReactNode;
  title?: string;
  current?: boolean;
  onClick?: () => void;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

const getItemTitle = ({ title, label }: BreadcrumbItem) =>
  title ?? (typeof label === "string" ? label : undefined);

const getItemIcon = ({ icon }: BreadcrumbItem) =>
  typeof icon === "string" && icon ? <SvgIcon icon={icon} /> : icon;

function BreadcrumbOverflow({ items }: { items: BreadcrumbItem[] }) {
  return (
    <span className="breadcrumb-overflow">
      <Dropdown
        trigger={["click"]}
        menu={{
          items: items.map((item, idx) => {
            const { key, label, link, onClick } = item;

            return {
              key: String(key ?? idx),
              label: link !== undefined ? <a href={link}>{label}</a> : label,
              icon: getItemIcon(item),
              title: getItemTitle(item),
              onClick: link === undefined ? onClick : undefined,
              disabled: link === undefined && !onClick,
            };
          }),
        }}
      >
        <Button type="text" size="small">
          ...
        </Button>
      </Dropdown>
    </span>
  );
}

function BreadcrumbItemView({ item }: { item: BreadcrumbItem }) {
  const { label, link, onClick, current } = item;
  const title = getItemTitle(item);
  const icon = getItemIcon(item);

  const labelNode =
    label !== null ? <span className="breadcrumb-label">{label}</span> : null;

  const content = (
    <>
      {icon}
      {labelNode}
    </>
  );

  return (
    <span
      className="breadcrumb-item"
      aria-current={current ? "location" : undefined}
    >
      {link !== undefined ? (
        <a className="breadcrumb-link" href={link} title={title}>
          {content}
        </a>
      ) : onClick ? (
        <Button
          className="breadcrumb-link"
          classNames={{ icon: "breadcrumb-icon" }}
          type="text"
          size="small"
          icon={icon}
          onClick={onClick}
          title={title}
          aria-label={title}
        >
          {labelNode}
        </Button>
      ) : (
        <span className="breadcrumb-link" title={title}>
          {content}
        </span>
      )}
    </span>
  );
}

interface BreadcrumbItemsProps {
  items: BreadcrumbItem[];
  hiddenItems?: BreadcrumbItem[];
  withOverflow?: boolean;
}

function BreadcrumbItems({
  items,
  hiddenItems,
  withOverflow = false,
}: BreadcrumbItemsProps) {
  return items.map((item, idx) => (
    <Fragment key={item.key ?? idx}>
      <BreadcrumbItemView item={item} />
      {idx === 0 && withOverflow && (
        <BreadcrumbOverflow items={hiddenItems ?? []} />
      )}
    </Fragment>
  ));
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [hiddenCount, setHiddenCount] = useState(0);

  const themeVariables = useThemeVariables({
    "theme-color-link-active": "colorLinkActive",
    "theme-color-text-tertiary": "colorTextTertiary",
    "theme-color-text": "colorText",
  });

  const visibleTailCount = 2;
  const fixedVisibleCount = visibleTailCount + 1;
  const maxHiddenCount = Math.max(0, items.length - fixedVisibleCount);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measuring = measureRef.current;

    if (!container || !measuring) {
      setHiddenCount(0);
      return;
    }

    const measuredElements = Array.from(measuring.children);

    const updateHiddenCount = () => {
      const [firstItemWidth, overflowWidth, ...remainingWidths] =
        measuredElements.map(
          (element) => element.getBoundingClientRect().width
        );

      const availableWidth = container.getBoundingClientRect().width;
      let requiredWidth = remainingWidths.reduce(
        (sum, width) => sum + width,
        firstItemWidth
      );
      let nextHiddenCount = 0;

      if (requiredWidth > availableWidth) {
        requiredWidth += overflowWidth;

        while (
          requiredWidth > availableWidth &&
          nextHiddenCount < maxHiddenCount
        ) {
          requiredWidth -= remainingWidths[nextHiddenCount];
          nextHiddenCount++;
        }
      }

      setHiddenCount(nextHiddenCount);
    };

    updateHiddenCount();

    const observer = new ResizeObserver(updateHiddenCount);
    observer.observe(container);

    for (const element of measuredElements) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [items, maxHiddenCount]);

  const collapsedCount = Math.min(hiddenCount, maxHiddenCount);

  const hiddenItems = items.slice(1, collapsedCount + 1);
  const visibleItems = [
    ...items.slice(0, 1),
    ...items.slice(collapsedCount + 1),
  ];

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className="ngw-gui-breadcrumbs"
      style={themeVariables}
      ref={containerRef}
    >
      <BreadcrumbItems
        items={visibleItems}
        hiddenItems={hiddenItems}
        withOverflow={hiddenItems.length > 0}
      />

      {items.length > fixedVisibleCount && (
        <div
          className="ngw-gui-breadcrumbs breadcrumb-measure"
          ref={measureRef}
          aria-hidden
          inert
        >
          <BreadcrumbItems items={items} withOverflow />
        </div>
      )}
    </div>
  );
}
