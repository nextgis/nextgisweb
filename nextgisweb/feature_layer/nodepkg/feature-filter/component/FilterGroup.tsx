import { DndContext } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
    SortableContext,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { observer } from "mobx-react-lite";

import { Button, Radio, Space } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { FilterEditorStore } from "../FilterEditorStore";
import type { FilterGroup as FilterGroupType } from "../type";

import { SortableFilterCondition } from "./SortableFilterCondition";
import { SortableFilterGroup } from "./SortableFilterGroup";

import { DeleteOutlined, DragOutlined, PlusOutlined } from "@ant-design/icons";

const msgAll = gettext("ALL");
const msgAny = gettext("ANY");
const msgAddCondition = gettext("Add Condition");
const msgAddGroup = gettext("Add Group");
const msgDeleteGroup = gettext("Delete Group");

interface FilterGroupProps {
    group: FilterGroupType;
    store: FilterEditorStore;
    isRoot?: boolean;
    dragHandleProps?: {
        attributes: any;
        listeners: any;
    };
}

const findGroupIdForCondition = (
    group: FilterGroupType,
    conditionId: number
): number | null => {
    if (group.conditions.some((c) => c.id === conditionId)) {
        return group.id;
    }

    for (const childGroup of group.groups) {
        const result = findGroupIdForCondition(childGroup, conditionId);
        if (result) return result;
    }

    return null;
};

const findConditionIndexInGroup = (
    group: FilterGroupType,
    conditionId: number
): number => {
    const index = group.conditions.findIndex((c) => c.id === conditionId);
    if (index !== -1) {
        return index;
    }

    for (const childGroup of group.groups) {
        const result = findConditionIndexInGroup(childGroup, conditionId);
        if (result !== -1) return result;
    }

    return -1;
};

export const FilterGroup = observer(
    ({ group, store, isRoot = false, dragHandleProps }: FilterGroupProps) => {
        const handleOperatorChange = (value: "all" | "any") => {
            store.updateGroupOperator(group.id, value);
        };

        const handleAddCondition = () => {
            store.addCondition(group.id, {
                field: "",
                operator: "==",
                value: "",
            });
        };

        const handleAddGroup = () => {
            store.addGroup(group.id);
        };

        const handleDeleteGroup = () => {
            if (!isRoot) {
                store.deleteGroup(group.id);
            }
        };

        const handleDragEnd = (event: DragEndEvent) => {
            const { active, over } = event;

            if (!active || !over || active.id === over.id) {
                return;
            }

            const activeId = active.id as number;
            const overId = over.id as number;

            const isActiveCondition =
                group.conditions.some((c) => c.id === activeId) ||
                group.groups.some(
                    (g) =>
                        g.conditions.some((c) => c.id === activeId) ||
                        g.groups.some((sg) =>
                            sg.conditions.some((c) => c.id === activeId)
                        )
                );

            const isActiveGroup =
                group.groups.some((g) => g.id === activeId) ||
                group.groups.some((g) =>
                    g.groups.some((sg) => sg.id === activeId)
                );

            if (isActiveCondition) {
                const isOverCondition =
                    group.conditions.some((c) => c.id === overId) ||
                    group.groups.some(
                        (g) =>
                            g.conditions.some((c) => c.id === overId) ||
                            g.groups.some((sg) =>
                                sg.conditions.some((c) => c.id === overId)
                            )
                    );

                if (isOverCondition) {
                    const targetCondition =
                        group.conditions.find((c) => c.id === overId) ||
                        group.groups
                            .flatMap((g) => g.conditions)
                            .find((c) => c.id === overId) ||
                        group.groups
                            .flatMap((g) =>
                                g.groups.flatMap((sg) => sg.conditions)
                            )
                            .find((c) => c.id === overId);

                    if (targetCondition) {
                        const targetGroupId = findGroupIdForCondition(
                            group,
                            overId
                        );
                        const targetIndex = findConditionIndexInGroup(
                            group,
                            overId
                        );

                        if (targetGroupId && targetIndex !== -1) {
                            const sourceGroupId = findGroupIdForCondition(
                                group,
                                activeId
                            );

                            if (sourceGroupId === targetGroupId) {
                                store.moveCondition(
                                    activeId,
                                    targetGroupId,
                                    targetIndex
                                );
                            } else {
                                store.moveConditionBetweenGroups(
                                    activeId,
                                    sourceGroupId!,
                                    targetGroupId,
                                    targetIndex
                                );
                            }
                        }
                    }
                } else if (isActiveGroup) {
                    const targetGroupId = overId;
                    const sourceGroupId = findGroupIdForCondition(
                        group,
                        activeId
                    );

                    if (sourceGroupId && sourceGroupId !== targetGroupId) {
                        store.moveConditionBetweenGroups(
                            activeId,
                            sourceGroupId,
                            targetGroupId,
                            0
                        );
                    }
                }
            } else if (isActiveGroup) {
                const isOverCondition =
                    group.conditions.some((c) => c.id === overId) ||
                    group.groups.some(
                        (g) =>
                            g.conditions.some((c) => c.id === overId) ||
                            g.groups.some((sg) =>
                                sg.conditions.some((c) => c.id === overId)
                            )
                    );

                if (isOverCondition) {
                    const targetGroupId = findGroupIdForCondition(
                        group,
                        overId
                    );
                    const targetIndex = findConditionIndexInGroup(
                        group,
                        overId
                    );

                    if (targetGroupId && targetIndex !== -1) {
                        store.moveGroup(activeId, targetGroupId, targetIndex);
                    }
                } else {
                    const targetGroupId = overId;
                    store.moveGroup(activeId, targetGroupId, 0);
                }
            }
        };

        return (
            <div className="filter-group">
                <div className="filter-group-header">
                    {!isRoot && dragHandleProps && (
                        <DragOutlined
                            className="filter-drag-handle"
                            style={{ cursor: "move", marginRight: "8px" }}
                            {...dragHandleProps.attributes}
                            {...dragHandleProps.listeners}
                        />
                    )}

                    <Radio.Group
                        value={group.operator}
                        onChange={(e) => handleOperatorChange(e.target.value)}
                        size="small"
                    >
                        <Radio.Button value="all">{msgAll}</Radio.Button>
                        <Radio.Button value="any">{msgAny}</Radio.Button>
                    </Radio.Group>

                    <div className="filter-group-actions">
                        <Space>
                            <Button
                                type="default"
                                icon={<PlusOutlined />}
                                onClick={handleAddCondition}
                                size="small"
                            >
                                {msgAddCondition}
                            </Button>
                            <Button
                                type="default"
                                icon={<PlusOutlined />}
                                onClick={handleAddGroup}
                                size="small"
                            >
                                {msgAddGroup}
                            </Button>
                            {!isRoot && (
                                <Button
                                    type="default"
                                    icon={<DeleteOutlined />}
                                    onClick={handleDeleteGroup}
                                    size="small"
                                    title={msgDeleteGroup}
                                />
                            )}
                        </Space>
                    </div>
                </div>

                <div className="filter-group-content">
                    <DndContext
                        onDragEnd={handleDragEnd}
                        modifiers={[restrictToVerticalAxis]}
                    >
                        <SortableContext
                            items={[
                                ...group.conditions.map((c) => c.id),
                                ...group.groups.map((g) => g.id),
                            ]}
                            strategy={verticalListSortingStrategy}
                        >
                            {group.conditions.map((condition) => (
                                <SortableFilterCondition
                                    key={condition.id}
                                    condition={condition}
                                    store={store}
                                />
                            ))}
                            {group.groups.map((subGroup) => (
                                <SortableFilterGroup
                                    key={subGroup.id}
                                    group={subGroup}
                                    store={store}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                </div>
            </div>
        );
    }
);

FilterGroup.displayName = "FeatureFilterGroup";
