import { DndContext, DragOverlay, pointerWithin } from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { observer } from "mobx-react-lite";
import { useState } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";

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

        if (active.id === over.id) {
            return;
        }

        const activeData = active.data.current;
        const overData = over.data.current;

        if (!activeData || !overData) {
            return;
        }

        const activeIsCondition = activeData.type === "condition";
        const activeIsGroup = activeData.type === "group";

        const overIsCondition = overData.type === "condition";
        const overIsGroup = overData.type === "group";

        if (activeIsCondition) {
            const sourceGroupId = activeData.parentGroupId;
            const targetGroupId = overIsCondition
                ? overData.parentGroupId
                : over.id;
            const overItemId = overIsCondition ? over.id : null;

            store.moveConditionToGroup(
                active.id as number,
                sourceGroupId,
                targetGroupId,
                overItemId as number | null
            );
        }

        if (activeIsGroup) {
            const sourceGroupId = activeData.parentGroupId;
            const targetGroupId = overIsCondition
                ? overData.parentGroupId
                : over.id;
            const overItemId = overIsCondition || overIsGroup ? over.id : null;

            if (active.id === targetGroupId) return;

            store.moveGroupToGroup(
                active.id as number,
                sourceGroupId,
                targetGroupId,
                overItemId as number | null
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
                        group={store.filterState}
                        store={store}
                        parentGroupId={null}
                        isRoot
                    />
                    <DragOverlay>
                        {activeId ? <div>{gettext("Dragging")}</div> : null}
                    </DragOverlay>
                </DndContext>
            </div>
        </div>
    );
});

ConstructorTab.displayName = "FeatureFilterConstructorTab";
