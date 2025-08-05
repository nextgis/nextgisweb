import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { observer } from "mobx-react-lite";
import type React from "react";

import { Button, Radio, Space } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { FilterEditorStore } from "../FilterEditorStore";
import type { FilterCondition as FilterConditionType } from "../type";

import { SortableFilterCondition } from "./SortableFilterCondition";

import { DeleteOutlined, DragOutlined, PlusOutlined } from "@ant-design/icons";

interface FilterGroupType {
    id: number;
    operator: "all" | "any";
    conditions: FilterConditionType[];
    groups: FilterGroupType[];
}

interface FilterGroupProps {
    group: FilterGroupType;
    store: FilterEditorStore;
    isRoot?: boolean;
    parentGroupId: number | null;
}

export const FilterGroup = observer(
    ({ group, store, isRoot = false, parentGroupId }: FilterGroupProps) => {
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

        const style: React.CSSProperties = {
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.5 : 1,
            border: "1px solid #d9d9d9",
            borderRadius: "4px",
            padding: "12px",
            margin: "8px 0",
            backgroundColor: "#ffffff",
        };

        const childItems = [
            ...group.conditions.map((c) => c.id),
            ...group.groups.map((g) => g.id),
        ];

        return (
            <div ref={setNodeRef} style={style} className="filter-group">
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: "12px",
                    }}
                >
                    {!isRoot && (
                        <DragOutlined
                            {...attributes}
                            {...listeners}
                            style={{ cursor: "move", marginRight: "8px" }}
                        />
                    )}
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
                            icon={<PlusOutlined />}
                            onClick={() => store.addCondition(group.id)}
                            size="small"
                        >
                            {gettext("Condition")}
                        </Button>
                        <Button
                            icon={<PlusOutlined />}
                            onClick={() => store.addGroup(group.id)}
                            size="small"
                        >
                            {gettext("Group")}
                        </Button>
                        {!isRoot && (
                            <Button
                                icon={<DeleteOutlined />}
                                onClick={() => store.deleteGroup(group.id)}
                                size="small"
                            />
                        )}
                    </Space>
                </div>

                <div style={{ paddingLeft: isRoot ? 0 : "24px" }}>
                    <SortableContext
                        items={childItems}
                        strategy={verticalListSortingStrategy}
                    >
                        {group.conditions.map((condition) => (
                            <SortableFilterCondition
                                key={condition.id}
                                condition={condition}
                                parentGroupId={group.id}
                                store={store}
                            />
                        ))}
                        {group.groups.map((subGroup) => (
                            <FilterGroup
                                key={subGroup.id}
                                group={subGroup}
                                store={store}
                                parentGroupId={group.id as number | null}
                            />
                        ))}
                    </SortableContext>
                </div>
            </div>
        );
    }
);

FilterGroup.displayName = "FeatureFilterGroup";
