import { RESIZE_HANDLE_WIDTH } from "../constant";
import type { EffectiveWidths, FeatureLayerFieldCol } from "../type";

import { DraggableColumn } from "./DraggableColumn";

interface HeaderHandlesProps {
    columns: FeatureLayerFieldCol[];
    effectiveWidths: EffectiveWidths;
    setUserDefinedWidths: React.Dispatch<
        React.SetStateAction<Record<string, number>>
    >;
}

export function HeaderHandles({
    columns,
    effectiveWidths,
    setUserDefinedWidths,
}: HeaderHandlesProps) {
    let cumWidth = 0;
    const headerCols: [number, number, number][] = [];

    columns.forEach(({ id }) => {
        const width = effectiveWidths[id];
        if (width !== null && width !== undefined && !Number.isNaN(width)) {
            cumWidth += width;
            headerCols.push([id, width, cumWidth]);
        }
    });

    const MIN_WIDTH = 40;

    return headerCols.map(([id, width, cum]) => (
        <DraggableColumn
            key={`${id}-${width}`}
            onStop={(_, { x }) => {
                const next = Math.max(MIN_WIDTH, width + x);
                setUserDefinedWidths((prev) => ({
                    ...prev,
                    [id]: next,
                }));
            }}
            style={{
                left: cum - RESIZE_HANDLE_WIDTH / 2,
                width: RESIZE_HANDLE_WIDTH,
            }}
        />
    ));
}
