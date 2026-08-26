import { lazy, useCallback, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";

import { useShowModal } from "@nextgisweb/gui";
import { Dropdown } from "@nextgisweb/gui/antd";
import type { MenuProps } from "@nextgisweb/gui/antd";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { useResourcePicker } from "@nextgisweb/resource/component/resource-picker/hook";
import type { ResourcePickerAttr } from "@nextgisweb/resource/component/resource-picker/type";
import { useResourceNotify } from "@nextgisweb/resource/hook/useResourceNotify";

import type { DefaultResourceAttrItem } from "../../type";
import type { ChildrenResource } from "../type";
import { createResourceTableItemOptions } from "../util/createResourceTableItemOptions";
import { forEachSelected } from "../util/forEachSelected";
import { loadVolumes } from "../util/loadVoluems";

import MoreVertIcon from "@nextgisweb/icon/material/more_vert";

const DeletePageModalLazy = lazy(
  () => import("@nextgisweb/resource/delete-page/DeletePageModal")
);

interface MenuDropdownProps {
  items: ChildrenResource[];
  selected: number[];
  allowBatch: boolean;
  resourceId: number;
  volumeVisible: boolean;
  storageEnabled: boolean;
  creationDateVisible: boolean;
  setCreationDateVisible: Dispatch<SetStateAction<boolean>>;
  setVolumeVisible: Dispatch<SetStateAction<boolean>>;
  setVolumeValues: Dispatch<SetStateAction<Record<number, number>>>;
  setAllowBatch: Dispatch<SetStateAction<boolean>>;
  setAttrItems: Dispatch<SetStateAction<DefaultResourceAttrItem[]>>;
  setSelected: Dispatch<SetStateAction<number[]>>;
}

type MenuItems = NonNullable<MenuProps["items"]>;
type MenuItem = MenuItems[0];

export function MenuDropdown({
  items,
  selected,
  allowBatch,
  resourceId,
  volumeVisible,
  storageEnabled,
  creationDateVisible,
  setCreationDateVisible,
  setVolumeVisible,
  setVolumeValues,
  setAllowBatch,
  setAttrItems,
  setSelected,
}: MenuDropdownProps) {
  const { showResourcePicker } = useResourcePicker();
  const { showModal, modalHolder } = useShowModal();
  const {
    contextHolder,
    notifyMoveWithError,
    notifySuccessfulMove,
    notifyMoveAbsolutError,
  } = useResourceNotify();

  const selectedAllowedForFeatureExport = useMemo(() => {
    const allowedToFeatureExport = [];

    for (const item of items) {
      if (selected.includes(item.resourceId)) {
        if (item.cls === "vector_layer") {
          allowedToFeatureExport.push(item.resourceId);
        }
      }
    }
    return allowedToFeatureExport;
  }, [selected, items]);

  const onNewGroup = useCallback(
    async (newGroup: ResourcePickerAttr) => {
      if (newGroup) {
        const parent = newGroup.get("resource.parent");
        if (parent && parent.id === resourceId) {
          const newItem = await createResourceTableItemOptions(newGroup.id);
          setAttrItems((old) => {
            return [...old, newItem];
          });
        }
      }
    },
    [resourceId, setAttrItems]
  );

  const moveSelectedTo = useCallback(
    (parentId: number) => {
      forEachSelected({
        title: gettext("Moving resources"),
        setAttrItems,
        setSelected,
        selected,
        executer: ({ selectedId, signal }) =>
          route("resource.item", selectedId).put({
            signal,
            json: {
              resource: {
                parent: { id: parentId },
              },
            },
          }),
        onComplate: (successItems, errorItems) => {
          if (successItems.length) {
            if (errorItems.length) {
              notifyMoveWithError(successItems, errorItems);
            } else {
              notifySuccessfulMove(successItems.length);
            }
          } else if (errorItems) {
            notifyMoveAbsolutError(errorItems);
          }
        },
      });
    },
    [
      notifyMoveAbsolutError,
      notifySuccessfulMove,
      notifyMoveWithError,
      setSelected,
      setAttrItems,
      selected,
    ]
  );
  const onDeleteClick = useCallback(() => {
    const { destroy } = showModal(DeletePageModalLazy, {
      resources: selected,
      onCancelDelete: () => {
        destroy();
      },
      onOkDelete: (deletedIds) => {
        destroy();
        setAttrItems((old) => old.filter((x) => !deletedIds.includes(x.id)));
      },
    });
  }, [showModal, selected, setAttrItems]);

  const menuItems = useMemo(() => {
    const menuItems_: MenuItems = [];
    menuItems_.push({
      key: "multiple_selection",
      label: allowBatch
        ? gettext("Turn off multiple selection")
        : gettext("Select multiple resources"),
      onClick: () => {
        setAllowBatch(!allowBatch);
      },
    });

    if (storageEnabled) {
      menuItems_.push({
        key: "volumes",
        label: volumeVisible
          ? gettext("Hide resource volume")
          : gettext("Show resource volume"),
        onClick: () => {
          setVolumeVisible(!volumeVisible);
          if (!volumeVisible) {
            loadVolumes({ items, setState: setVolumeValues });
          }
        },
      });
    }
    menuItems_.push({
      key: "creation_dates",
      label: creationDateVisible
        ? gettext("Hide resource creation date")
        : gettext("Show resource creation date"),
      onClick: () => {
        setCreationDateVisible(!creationDateVisible);
      },
    });
    if (allowBatch) {
      const deleteOperationConfig: MenuItem = {
        key: "delete",
        label: gettext("Delete"),
        disabled: !selected.length,
        onClick: onDeleteClick,
      };

      // Batch change parent
      const moveOperationConfig: MenuItem = {
        key: "move",
        label: <>{gettext("Move")}</>,
        onClick: () => {
          const resourcePicker = showResourcePicker<number>({
            pickerOptions: {
              parentId: resourceId,
              traverseClasses: ["resource_group"],
              hideUnavailable: true,
              disableResourceIds: [...selected, resourceId],
              onNewGroup,
            },
            onSelect: (newParentId) => {
              moveSelectedTo(newParentId);
              resourcePicker.close();
            },
          });
        },
      };
      const exportFeaturesOperationConfig: MenuItem = {
        key: "export",
        label: <>{gettext("Export vector layers")}</>,
        disabled: !selectedAllowedForFeatureExport.length,
        onClick: () => {
          window.open(
            `${routeURL(
              "feature_layer.export_multiple"
            )}?resources=${selectedAllowedForFeatureExport.join(",")}`
          );
        },
      };

      const batchOperations: MenuItems = [];
      if (selected.length) {
        batchOperations.push(
          ...[
            deleteOperationConfig,
            moveOperationConfig,
            exportFeaturesOperationConfig,
          ]
        );
      }
      if (batchOperations.length) {
        batchOperations.unshift({
          type: "divider",
        });
      }
      menuItems_.push(...batchOperations);
    }
    return menuItems_;
  }, [
    selectedAllowedForFeatureExport,
    creationDateVisible,
    storageEnabled,
    volumeVisible,
    allowBatch,
    resourceId,
    selected,
    items,
    onNewGroup,
    setAllowBatch,
    onDeleteClick,
    moveSelectedTo,
    setVolumeValues,
    setVolumeVisible,
    showResourcePicker,
    setCreationDateVisible,
  ]);

  if (!menuItems.length) {
    return null;
  }

  return (
    <>
      {contextHolder}
      {modalHolder}
      <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
        <a>
          <MoreVertIcon />
        </a>
      </Dropdown>
    </>
  );
}
