import { ScaleLine } from "ol/control";
import type { Options as ScaleLineOptions } from "ol/control/ScaleLine";
import { useCallback } from "react";

import OlControl from "./OlControl";
import type { OlControlProps } from "./OlControl";

export type ScaleLineControlProps = Omit<OlControlProps<ScaleLine>, "ctor"> & {
    changeOnClick?: boolean;
    scaleOptions?: ScaleLineOptions;
};

export default function ScaleLineControl({
    scaleOptions,
    ...props
}: ScaleLineControlProps) {
    const ctor = useCallback(() => {
        return new ScaleLine(scaleOptions);
    }, [scaleOptions]);

    return <OlControl ctor={ctor} {...props} />;
}
