import { useDndContext } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
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
                item: group,
            },
            disabled: isRoot,
        });

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

        const isDropTarget = over?.id === group.id && over?.id !== active?.id;
        const dropTargetClassName = isDropTarget ? " drop-target" : "";
        const emptyClassName = group.childrenOrder.length === 0 ? " empty" : "";

        return (
            <div
                ref={setNodeRef}
                style={style}
                className={`filter-group ${dropTargetClassName}`}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: "12px",
                    }}
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

                <div
                    className={`filter-group-children ${dropTargetClassName} ${emptyClassName}`}
                >
                    {group.childrenOrder.map((child: FilterGroupChild) =>
                        renderChild(child)
                    )}
                </div>
            </div>
        );
    }
);

FilterGroup.displayName = "FeatureFilterGroup";
