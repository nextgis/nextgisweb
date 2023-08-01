import StraightIcon from "@material-icons/svg/straight";

import type { ColOrder } from "../type";

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
