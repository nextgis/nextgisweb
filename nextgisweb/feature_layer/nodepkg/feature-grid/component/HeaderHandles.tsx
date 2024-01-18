import Draggable from "react-draggable";

import { RESIZE_HANDLE_WIDTH } from "../constant";
import type { EffectiveWidths, FeatureLayerFieldCol } from "../type";

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
    return (
        <>
            {columns.map(({ id }) => {
                const width = effectiveWidths[id];
                if (isNaN(width)) {
                    return null;
                }
                cumWidth += width;
                return (
                    <Draggable
                        key={id}
                        axis="x"
                        defaultClassName="handle"
                        defaultClassNameDragging="handle-dragging"
                        defaultClassNameDragged="handle-dragged"
                        onStop={(_, { lastX }) => {
                            setTimeout(() => {
                                setUserDefinedWidths((prev) => ({
                                    ...prev,
                                    [id]: width + lastX,
                                }));
                            });
                        }}
                    >
                        <div
                            style={{
                                left: cumWidth - RESIZE_HANDLE_WIDTH / 2,
                                width: RESIZE_HANDLE_WIDTH,
                            }}
                        ></div>
                    </Draggable>
                );
            })}
        </>
    );
}
