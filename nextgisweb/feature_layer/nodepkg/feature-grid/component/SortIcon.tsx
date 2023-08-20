import type { ColOrder } from "../type";

import StraightIcon from "@nextgisweb/icon/material/straight";

interface SortIconParams {
    dir: ColOrder;
}

export default function SortIcon({ dir }: SortIconParams) {
    if (dir === "desc") {
        return (
            <span className="desc">
                <StraightIcon />
            </span>
        );
    } else if (dir === "asc") {
        return (
            <span className="asc">
                <StraightIcon />
            </span>
        );
    } else {
        return <></>;
    }
}
