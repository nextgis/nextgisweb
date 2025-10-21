import { useDndContext, useDroppable } from "@dnd-kit/core";
import type { Active, Over } from "@dnd-kit/core";
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { observer } from "mobx-react-lite";
import type React from "react";

import { Button, Radio, Space } from "@nextgisweb/gui/antd";
import { AddIcon, RemoveIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { FilterEditorStore } from "../FilterEditorStore";
import type {
    FilterGroupChild,
    FilterGroup as FilterGroupModel,
} from "../type";

import { SortableFilterCondition } from "./SortableFilterCondition";

import DragHandleIcon from "@nextgisweb/icon/material/drag_indicator";

interface FilterGroupProps {
    group: FilterGroupModel;
    store: FilterEditorStore;
    isRoot?: boolean;
    parentGroupId: number | null;
}

const getActiveType = (active: Active | null) => {
    if (!active) {
        return undefined;
    }
    return active.data.current?.type as "condition" | "group" | undefined;
};

const isOverInsideGroup = (over: Over | null, group: FilterGroupModel) => {
    const overData = over?.data?.current as
        | { type?: string; parentGroupId?: number; groupId?: number }
        | undefined;

    return (
        overData &&
        (overData.parentGroupId === group.id ||
            (overData.type === "group-dropzone" &&
                overData.groupId === group.id))
    );
};

export const FilterGroup = observer(
    ({ group, store, isRoot = false, parentGroupId }: FilterGroupProps) => {
        const { active, over } = useDndContext();
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging,
        } = useSortable({
            id: group.id,
            data: {
                type: "group",
                parentGroupId: parentGroupId,
            },
            disabled: isRoot,
        });

        const dropZoneId = `group-dropzone-${group.id}`;
        const { setNodeRef: setDropZoneNodeRef } = useDroppable({
            id: dropZoneId,
            data: { type: "group-dropzone", groupId: group.id },
        });

        const activeType = getActiveType(active);
        const overMatchesGroup = over?.id === group.id;
        const overMatchesDropZone = over?.id === dropZoneId;
        const overInsideGroup = isOverInsideGroup(over, group);
        const isConditionDrag = activeType === "condition";
        const isGroupDrag = activeType === "group";

        const isCurrentGroupHovered =
            overMatchesGroup || overMatchesDropZone || overInsideGroup;

        const isDropTarget =
            isCurrentGroupHovered && (isConditionDrag || isGroupDrag);

        const showPlaceholder =
            (isConditionDrag || isGroupDrag) &&
            (overMatchesDropZone || group.childrenOrder.length === 0);

        const placeholderText = isGroupDrag
            ? gettext("Drop group here")
            : gettext("Drop condition here");

        const style: React.CSSProperties = {
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.5 : 1,
            border: "1px solid #d9d9d9",
            borderRadius: "4px",
            padding: "5px",
            margin: "5px 0",
            backgroundColor: "#ffffff",
        };

        const childItems = group.childrenOrder.map(
            (item: FilterGroupChild) => item.id
        );

        const dropTargetClassName = isDropTarget ? " drop-target" : "";
        const emptyClassName = group.childrenOrder.length === 0 ? " empty" : "";
        const childContainerClassName = `filter-group-children${dropTargetClassName}${emptyClassName}`;
        const dropZoneClassName = `group-drop-zone${overMatchesDropZone ? " active" : ""}${
            showPlaceholder ? " with-placeholder" : ""
        }`;

        const renderChild = (child: FilterGroupChild) => {
            if (child.type === "condition") {
                const condition = group.conditions.find(
                    (c) => c.id === child.id
                );
                if (!condition) {
                    return null;
                }
                return (
                    <SortableFilterCondition
                        key={condition.id}
                        condition={condition}
                        parentGroupId={group.id}
                        store={store}
                    />
                );
            }

            const subGroup = group.groups.find((g) => g.id === child.id);
            if (!subGroup) {
                return null;
            }
            return (
                <FilterGroup
                    key={subGroup.id}
                    group={subGroup}
                    store={store}
                    parentGroupId={group.id as number | null}
                />
            );
        };

        return (
            <div
                ref={setNodeRef}
                style={style}
                className={`filter-group${isDropTarget ? " drop-target" : ""}`}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: "12px",
                    }}
                    className={dropZoneClassName}
                >
                    {
                        <DragHandleIcon
                            {...attributes}
                            {...listeners}
                            style={{ cursor: "move", marginRight: "8px" }}
                        />
                    }
                    <Radio.Group
                        value={group.operator}
                        onChange={(e) =>
                            store.updateGroupOperator(group.id, e.target.value)
                        }
                        size="small"
                    >
                        <Radio.Button value="all">
                            {gettext("ALL")}
                        </Radio.Button>
                        <Radio.Button value="any">
                            {gettext("ANY")}
                        </Radio.Button>
                    </Radio.Group>
                    <Space style={{ marginLeft: "auto" }}>
                        <Button
                            icon={<AddIcon />}
                            onClick={() => store.addCondition(group.id)}
                            size="small"
                        >
                            {gettext("Condition")}
                        </Button>
                        <Button
                            icon={<AddIcon />}
                            onClick={() => store.addGroup(group.id)}
                            size="small"
                        >
                            {gettext("Group")}
                        </Button>
                        {!isRoot && (
                            <Button
                                icon={<RemoveIcon />}
                                onClick={() => store.deleteGroup(group.id)}
                                size="small"
                            />
                        )}
                    </Space>
                </div>

                <div className={childContainerClassName}>
                    <SortableContext
                        items={childItems}
                        strategy={verticalListSortingStrategy}
                    >
                        {group.childrenOrder.map((child: FilterGroupChild) =>
                            renderChild(child)
                        )}
                    </SortableContext>
                    <div
                        ref={setDropZoneNodeRef}
                        className={dropZoneClassName}
                        data-placeholder={
                            showPlaceholder ? placeholderText : undefined
                        }
                    />
                </div>
            </div>
        );
    }
);

FilterGroup.displayName = "FeatureFilterGroup";
