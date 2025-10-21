import { DndContext, DragOverlay, pointerWithin } from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { observer } from "mobx-react-lite";
import { useState } from "react";

import type { FilterEditorStore } from "../FilterEditorStore";

import { FilterGroup } from "./FilterGroup";

interface ConstructorTabProps {
    store: FilterEditorStore;
}

export const ConstructorTab = observer(({ store }: ConstructorTabProps) => {
    const [activeId, setActiveId] = useState<string | number | null>(null);

    if (!store.filterState) {
        return null;
    }

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveId(null);
        const { active, over } = event;

        if (!over) {
            return;
        }

        const activeData = active.data.current;
        const overData = over.data.current;

        if (!activeData || !overData) {
            return;
        }

        if (active.id === over.id) {
            return;
        }

        const activeIsCondition = activeData.type === "condition";
        const activeIsGroup = activeData.type === "group";

        const overIsCondition = overData.type === "condition";
        const overIsGroup = overData.type === "group";

        const resolveTargetGroupId = (): number | null => {
            if (overIsGroup) {
                return over.id as number;
            }
            if (overIsCondition) {
                return overData.parentGroupId;
            }
            return null;
        };

        const resolveOverItemId = (): number | null => {
            if (overIsCondition || overIsGroup) {
                return over.id as number;
            }
            return null;
        };

        if (activeIsCondition) {
            const targetGroupId = resolveTargetGroupId();
            const overItemId = resolveOverItemId();

            if (targetGroupId === null) {
                return;
            }

            store.moveConditionToGroup(
                active.id as number,
                targetGroupId,
                overItemId
            );
        }

        if (activeIsGroup) {
            const targetGroupId = resolveTargetGroupId();
            const overItemId = resolveOverItemId();

            if (targetGroupId === null) {
                return;
            }

            if (active.id === targetGroupId) return;

            store.moveGroupToGroup(
                active.id as number,
                targetGroupId,
                overItemId
            );
        }
    };

    const handleDragCancel = () => {
        setActiveId(null);
    };

    return (
        <div className="filter-constructor">
            <div className="filter-root">
                <DndContext
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                    collisionDetection={pointerWithin}
                >
                    <FilterGroup
                        group={store.filterState.rootGroup}
                        store={store}
                        parentGroupId={null}
                        isRoot
                    />
                    <DragOverlay>
                        {activeId ? (
                            <div className="drag-overlay-ghost"></div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>
        </div>
    );
});

ConstructorTab.displayName = "FeatureFilterConstructorTab";
