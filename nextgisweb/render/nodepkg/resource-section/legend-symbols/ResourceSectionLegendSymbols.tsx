import { useRouteGet } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { ResourceSection } from "@nextgisweb/resource/resource-section";

import "./ResourceSectionLegendSymbols.less";

export const ResourceSectionLegendSymbols: ResourceSection = ({
    resourceId,
}) => {
    const { data: symbols } = useRouteGet({
        name: "render.legend_symbols",
        params: { id: resourceId },
    });

    if (!symbols) return <></>;

    return (
        <div className="ngw-render-resource-section-legend-symbols">
            {symbols.map((s, idx) => (
                <div key={idx} className="legend-symbol">
                    <img src={"data:image/png;base64," + s.icon.data} />
                    <div>{s.display_name}</div>
                </div>
            ))}
        </div>
    );
};

ResourceSectionLegendSymbols.displayName = "ResourceSectionLegendSymbols";
ResourceSectionLegendSymbols.title = gettext("Legend symbols");
