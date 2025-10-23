import {
    DndContext,
    DragOverlay,
    pointerWithin,
    rectIntersection,
} from "@dnd-kit/core";
import type {
    CollisionDescriptor,
    CollisionDetection,
    DragEndEvent,
    DragStartEvent,
    DroppableContainer,
} from "@dnd-kit/core";
import { observer } from "mobx-react-lite";
import { useRef, useState } from "react";

import type { FilterEditorStore } from "../FilterEditorStore";
import type { FilterGroup } from "../type";

import { FilterGroup as FilterGroupComponent } from "./FilterGroup";

interface ConstructorTabProps {
    store: FilterEditorStore;
}

const getInsertionConditionPosition = (
    event: DragEndEvent
): "before" | "after" => {
    const { active, over } = event;
    const overRect = over!.rect;
    const activeTranslatedRect = active.rect.current.translated;
    if (!overRect || !activeTranslatedRect) {
        return "after";
    }

    const overMidY = overRect.top + overRect.height / 2;
    const activeMidY =
        activeTranslatedRect.top + activeTranslatedRect.height / 2;

    return activeMidY < overMidY ? "before" : "after";
};

const getInsertionGroupPosition = (
    event: DragEndEvent,
    allOverItems: CollisionDescriptor[],
    sourceItemId: number,
    targetGroup: FilterGroup
): { id?: number; parentGroupId: number; position: "before" | "after" } => {
    const { active, over } = event;
    const overRect = over!.rect;
    const activeTranslatedRect = active.rect.current.translated;
    if (
        !overRect ||
        !activeTranslatedRect ||
        targetGroup.childrenOrder.length === 0
    ) {
        return {
            id: undefined,
            parentGroupId: targetGroup.id,
            position: "after",
        };
    }

    const childrenOrderMap = new Map<number, "condition" | "group">();
    targetGroup.childrenOrder.forEach((i) => {
        childrenOrderMap.set(i.id, i.type);
    });
    const targetGroupOverItems = allOverItems.filter((i) => {
        return (
            childrenOrderMap.has(i.id as number) &&
            targetGroup.id !== sourceItemId
        );
    });

    const activeMidY =
        activeTranslatedRect.top + activeTranslatedRect.height / 2;

    if (targetGroupOverItems.length === 0) {
        const overMidY = overRect.top + overRect.height / 2;
        const nearTop = activeMidY < overMidY;
        const elementIndex = nearTop ? 0 : targetGroup.childrenOrder.length - 1;
        return {
            id: targetGroup.childrenOrder[elementIndex].id,
            parentGroupId: targetGroup.id,
            position: nearTop ? "before" : "after",
        };
    } else if (targetGroupOverItems.length === 1) {
        const overChildItem = targetGroupOverItems[0];
        const overChildData = overChildItem.data;
        if (overChildData && "droppableContainer" in overChildData) {
            const droppableContainer =
                overChildData.droppableContainer as DroppableContainer;
            const rect = droppableContainer.rect.current;
            if (!rect) {
                return {
                    id: overChildItem.id as number,
                    parentGroupId: targetGroup.id,
                    position: "after",
                };
            }
            const overChildMidY = rect?.top + rect.height / 2;
            return {
                id: overChildItem.id as number,
                parentGroupId: targetGroup.id,
                position: activeMidY < overChildMidY ? "before" : "after",
            };
        }
        return {
            id: overChildItem.id as number,
            parentGroupId: targetGroup.id,
            position: "after",
        };
    } else if (targetGroupOverItems.length === 2) {
        let indexForBefore = -1;
        targetGroupOverItems.forEach((i) => {
            const id = i.id as number;
            const index = targetGroup.childrenOrder.findIndex(
                (i) => i.id === id
            );
            if (index !== -1) {
                if (indexForBefore < index) {
                    indexForBefore = index;
                }
            }
        });

        if (indexForBefore !== -1) {
            return {
                id: targetGroupOverItems[0].id as number,
                parentGroupId: targetGroup.id,
                position: "after",
            };
        }
        return {
            id: indexForBefore,
            parentGroupId: targetGroup.id,
            position: "before",
        };
    }

    return { id: undefined, parentGroupId: targetGroup.id, position: "after" };
};

export const ConstructorTab = observer(({ store }: ConstructorTabProps) => {
    const [activeId, setActiveId] = useState<string | number | null>(null);
    const collisionsRef = useRef<CollisionDescriptor[]>([]);

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

        if (!activeData || !overData || active.id === over.id) {
            return;
        }

        if (overData.type === "condition") {
            const position = getInsertionConditionPosition(event);
            store.moveFilterItem(
                {
                    id: active.id as number,
                    parentGroupId: activeData.parentGroupId,
                },
                {
                    id: over.id as number,
                    parentGroupId: overData.parentGroupId,
                },
                activeData.type as "condition" | "group",
                position
            );
            return;
        } else {
            const allOverItems = collisionsRef.current;
            const targetGroup = overData.item as FilterGroup;
            const { id, parentGroupId, position } = getInsertionGroupPosition(
                event,
                allOverItems,
                active.id as number,
                targetGroup
            );
            store.moveFilterItem(
                {
                    id: active.id as number,
                    parentGroupId: activeData.parentGroupId,
                },
                {
                    id: id,
                    parentGroupId,
                },
                activeData.type as "condition" | "group",
                position
            );
        }
    };

    const handleDragCancel = () => {
        setActiveId(null);
    };

    const customCollisionDetection: CollisionDetection = (args) => {
        const pointerCollisions = pointerWithin(args);
        const rectCollisions = rectIntersection(args);
        collisionsRef.current = rectCollisions as CollisionDescriptor[];

        if (pointerCollisions.length > 0) {
            const filteredRectCollisions = rectCollisions.filter(
                (c) => c.id !== pointerCollisions[0].id
            );

            return [...pointerCollisions, ...filteredRectCollisions];
        }
        return rectCollisions;
    };

    return (
        <div className="filter-constructor">
            <div className="filter-root">
                <DndContext
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                    collisionDetection={customCollisionDetection}
                >
                    <FilterGroupComponent
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
