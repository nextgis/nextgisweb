import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { observer } from "mobx-react-lite";

import type { FilterEditorStore } from "../FilterEditorStore";
import type { FilterGroup as FilterGroupType } from "../type";

import { FilterGroup } from "./FilterGroup";

interface SortableFilterGroupProps {
    group: FilterGroupType;
    store: FilterEditorStore;
    isRoot?: boolean;
}

export const SortableFilterGroup = observer(
    ({ group, store, isRoot = false }: SortableFilterGroupProps) => {
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging,
        } = useSortable({ id: group.id });

        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.5 : 1,
        };

        return (
            <div ref={setNodeRef} style={style}>
                <FilterGroup
                    group={group}
                    store={store}
                    isRoot={isRoot}
                    dragHandleProps={{ attributes, listeners }}
                />
            </div>
        );
    }
);

SortableFilterGroup.displayName = "SortableFilterGroup";
