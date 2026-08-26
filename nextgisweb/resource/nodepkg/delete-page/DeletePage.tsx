import classNames from "classnames";
import { sortBy } from "lodash-es";
import { useMemo, useState } from "react";

import { Button } from "@nextgisweb/gui/antd";
import { CountdownButton } from "@nextgisweb/gui/buttons";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import { errorModal } from "@nextgisweb/gui/error";
import { DeleteIcon } from "@nextgisweb/gui/icon";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import { useRouteGet } from "@nextgisweb/pyramid/hook";
import { gettext, ngettextf } from "@nextgisweb/pyramid/i18n";
import type { ResourceCls } from "@nextgisweb/resource/type/api";

import { ResourceIcon } from "../icon";

import { DeleteMessage, msgResourcesCount } from "./DeleteMessage";
import type { DeletePageProps } from "./type";

import "./DeletePage.less";

const msgDeleteButton = (resources: number) =>
  ngettextf("Delete {} resource", "Delete {} resources", resources)(resources);

export function DeletePage({
  resources,
  navigateToId,
  isModal = false,
  onCancel,
  onOk,
}: DeletePageProps) {
  const [deletingInProgress, setDeletingInProgress] = useState(false);

  if (!isModal && navigateToId !== undefined) {
    const parentResourceUrl = routeURL("resource.show", {
      id: navigateToId,
    });
    onOk = () => window.open(parentResourceUrl, "_self");
  }

  const { data, isLoading } = useRouteGet({
    name: "resource.items.delete",
    options: { query: { resources } },
  });

  const { data: labelData, isLoading: isLabelDataLoading } = useRouteGet(
    "resource.blueprint",
    undefined,
    { cache: true }
  );

  const isSingle = resources.length === 1;

  const { data: singleResource, isLoading: isSingleResourceLoading } =
    useRouteGet({
      name: "resource.item",
      params: { id: resources[0] },
      enabled: isSingle,
      loadOnInit: isSingle,
      options: { cache: true },
    });

  const sortedData = useMemo(() => {
    if (data && labelData)
      return sortBy(
        Object.entries(data.affected.resources).map(([cls, count]) => {
          const pb = labelData?.resources[cls as ResourceCls];
          return { cls, count, label: pb.label, order: pb.order };
        }),
        ["order", "label"]
      );
  }, [data, labelData]);

  const dataReady =
    !isLoading &&
    !isLabelDataLoading &&
    !!data &&
    !!labelData &&
    (!isSingle || !isSingleResourceLoading);

  const onDeleteClick = async () => {
    setDeletingInProgress(true);
    try {
      const { deleted } = await route("resource.items.delete").post({
        query: {
          resources,
          partial: true,
        },
        body: "",
      });
      onOk?.(deleted);
    } catch (err) {
      errorModal(err);
    } finally {
      setDeletingInProgress(false);
    }
  };

  const nonModalonCancel = () => {
    window.open(routeURL("resource.show", { id: resources[0] ?? 0 }), "_self");
  };

  if (!dataReady || !data || !labelData) {
    return <LoadingWrapper />;
  }

  return (
    <div className="ngw-resource-delete-page">
      <DeleteMessage
        affected={data.affected}
        unaffected={data.unaffected}
        selectedCount={resources.length}
        resourceName={
          isSingle ? singleResource?.resource.display_name : undefined
        }
      />

      {sortedData && sortedData.length > 0 && (
        <div className={classNames("table", isModal && "modal")}>
          <div>
            {sortedData.map(({ cls, count, label }) => (
              <div key={cls}>
                <ResourceIcon
                  identity={cls as ResourceCls}
                  style={{
                    width: "16px",
                    height: "16px",
                  }}
                />
                <div>{label}</div>
                <div className="count">{count}</div>
                <div>{msgResourcesCount(count)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="buttons">
        {data.affected.count > 0 && (
          <CountdownButton
            danger
            type="primary"
            icon={<DeleteIcon />}
            loading={deletingInProgress}
            onClick={onDeleteClick}
          >
            {msgDeleteButton(data.affected.count)}
          </CountdownButton>
        )}
        <Button
          className="cancel"
          type="default"
          onClick={isModal ? onCancel : nonModalonCancel}
        >
          {gettext("Cancel")}
        </Button>
      </div>
    </div>
  );
}
