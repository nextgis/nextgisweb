import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { observer } from "mobx-react-lite";

import type { FilterEditorStore } from "../FilterEditorStore";
import { useAutoScroll } from "../hook/useAutoScroll";
import type { FilterCondition as FilterConditionType } from "../type";

import { FilterCondition } from "./FilterCondition";

interface SortableFilterConditionProps {
    condition: FilterConditionType;
    store: FilterEditorStore;
    parentGroupId: number;
}

export const SortableFilterCondition = observer(
    ({ condition, store, parentGroupId }: SortableFilterConditionProps) => {
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging,
        } = useSortable({
            id: condition.id,
            data: {
                type: "condition",
                parentGroupId: parentGroupId,
                item: condition,
            },
        });

        const domId = `filter-condition-${condition.id}`;
        useAutoScroll(condition.id, store, domId);

        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.5 : 1,
        };

        return (
            <div ref={setNodeRef} style={style} id={domId}>
                <FilterCondition
                    condition={condition}
                    store={store}
                    dragHandleProps={{ attributes, listeners }}
                />
            </div>
        );
    }
);

SortableFilterCondition.displayName = "SortableFilterCondition";
