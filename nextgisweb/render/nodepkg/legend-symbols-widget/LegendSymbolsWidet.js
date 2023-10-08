import { useEffect, useState } from "react";

import { LoadingWrapper } from "@nextgisweb/gui/component";
import { route } from "@nextgisweb/pyramid/api";
import "./LegendSymbolsWidet.less";

export function LegendSymbolsWidget({ resourceId }) {
    const [data, setData] = useState(null);

    useEffect(async () => {
        setData(await route("render.legend_symbols", resourceId).get());
    }, []);

    return (
        <div className="ngw-render-legend-symbols-widget">
            {data === null ? (
                <LoadingWrapper />
            ) : (
                data.map((s, idx) => (
                    <div key={idx} className="legend-symbol">
                        <img src={"data:image/png;base64," + s.icon.data} />
                        <div>{s.display_name}</div>
                    </div>
                ))
            )}
        </div>
    );
}
