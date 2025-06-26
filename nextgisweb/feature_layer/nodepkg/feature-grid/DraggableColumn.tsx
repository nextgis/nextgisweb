import { useRef } from "react";
import Draggable from "react-draggable";
import type { DraggableEventHandler } from "react-draggable";

export function DraggableColumn({
    style,
    onStop,
}: {
    style: React.CSSProperties;
    onStop: DraggableEventHandler;
}) {
    // Need to fix issue findDOMNode is not a function after migration to react 19
    // https://github.com/react-grid-layout/react-draggable/issues/771
    const nodeRef = useRef<any>(null);

    return (
        <Draggable
            nodeRef={nodeRef}
            axis="x"
            defaultClassName="handle"
            defaultClassNameDragging="handle-dragging"
            defaultClassNameDragged="handle-dragged"
            onStop={onStop}
        >
            <div ref={nodeRef} style={style}></div>
        </Draggable>
    );
}
