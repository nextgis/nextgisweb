import { Rnd } from "react-rnd";

import type { RndCompProps } from "../type";

export const RndComp = ({
    coords,
    onChange,
    className,
    children,
    displayed,
    movable = true,
}: RndCompProps) => {
    return (
        <Rnd
            position={{ x: coords.x, y: coords.y }}
            size={{ width: coords.width, height: coords.height }}
            onResizeStop={(e, direction, ref, delta, position) => {
                onChange({
                    width: ref.offsetWidth,
                    height: ref.offsetHeight,
                    ...position,
                    displayed,
                });
            }}
            onDragStop={(e, d) => {
                onChange({
                    width: d.node.offsetWidth,
                    height: d.node.offsetHeight,
                    x: d.x,
                    y: d.y,
                    displayed,
                });
            }}
            className={className}
            disableDragging={!movable}
            bounds="parent"
        >
            {children}
        </Rnd>
    );
};
