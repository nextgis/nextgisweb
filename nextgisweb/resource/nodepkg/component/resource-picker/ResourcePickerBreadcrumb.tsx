import { observer } from "mobx-react-lite";
import { useMemo } from "react";

import { Skeleton, Space } from "@nextgisweb/gui/antd";
import { Breadcrumbs } from "@nextgisweb/gui/component";
import type { BreadcrumbItem } from "@nextgisweb/gui/component/Breadcrumbs";

import type { ResourcePickerBreadcrumbProps } from "./type";

import HomeFilledIcon from "@nextgisweb/icon/material/home";

function HomeIcon() {
  return <HomeFilledIcon style={{ fontSize: "1.1rem", flexShrink: 0 }} />;
}

export const ResourcePickerBreadcrumb = observer(
  ({ store }: ResourcePickerBreadcrumbProps) => {
    const { breadcrumbItems, loading, allowMoveInside } = store;
    const breadcrumbs = useMemo<BreadcrumbItem[]>(() => {
      return breadcrumbItems.map((parent, i) => {
        const displayName = parent.get("resource.display_name");
        return {
          key: parent.id,
          label: i === 0 && breadcrumbItems.length > 1 ? null : displayName,
          icon: i === 0 ? <HomeIcon /> : undefined,
          title: displayName,
          onClick: allowMoveInside
            ? () => store.changeParentTo(parent.id)
            : undefined,
          current: i === breadcrumbItems.length - 1,
        };
      });
    }, [breadcrumbItems, allowMoveInside, store]);

    const initialLoading =
      loading.setBreadcrumbItemsFor && breadcrumbItems.length === 0;

    return (
      <div className="resource-breadcrumb">
        {initialLoading ? (
          <Space>
            <Skeleton.Button active size="small" shape="circle" />
            <Skeleton.Input active size="small" />
          </Space>
        ) : (
          <Breadcrumbs items={breadcrumbs} />
        )}
      </div>
    );
  }
);

ResourcePickerBreadcrumb.displayName = "ResourcePickerBreadcrumb";
