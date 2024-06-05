import { LoadingWrapper } from "@nextgisweb/gui/component";
import { useRouteGet } from "@nextgisweb/pyramid/hook";
import "./LegendSymbolsWidet.less";

export function LegendSymbolsWidget({ resourceId }: { resourceId: number }) {
    const { data } = useRouteGet({
        name: "render.legend_symbols",
        params: { id: resourceId },
    });

    return (
        <div className="ngw-render-legend-symbols-widget">
            {data === undefined ? (
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
