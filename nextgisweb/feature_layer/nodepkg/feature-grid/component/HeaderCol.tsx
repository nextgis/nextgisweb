import SortIcon from "../component/SortIcon";
import { $FID, KEY_FIELD_ID } from "../constant";
import type { ColOrder, FeatureLayerFieldCol, OrderBy } from "../type";

interface HeaderColProps {
    ref: React.Ref<HTMLDivElement>;
    column: FeatureLayerFieldCol;
    orderBy?: OrderBy;
    userDefinedWidths: Record<number, number>;
    toggleSorting: (field: string | typeof $FID, curOrder?: ColOrder) => void;
}

export function HeaderCol({
    ref,
    column,
    orderBy,
    userDefinedWidths,
    toggleSorting,
}: HeaderColProps) {
    const { keyname, id, display_name: label, flex } = column;

    const colSort = orderBy && orderBy[0] === keyname && orderBy[1];

    const style = userDefinedWidths[id]
        ? { flex: `0 0 ${userDefinedWidths[id]}px` }
        : { flex };

    const onClick =
        id === KEY_FIELD_ID
            ? () => toggleSorting($FID)
            : keyname
              ? () => toggleSorting(keyname)
              : undefined;

    return (
        <div ref={ref} className="th" style={style} onClick={onClick}>
            <div className="label">{label}</div>
            {colSort && (
                <div className="suffix">
                    <SortIcon dir={colSort} />
                </div>
            )}
        </div>
    );
}
