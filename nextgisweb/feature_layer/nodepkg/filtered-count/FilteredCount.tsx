import { observer } from "mobx-react-lite";
import { useMemo, useState } from "react";

import { Button, Tooltip } from "@nextgisweb/gui/antd";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import { gettext, gettextf } from "@nextgisweb/pyramid/i18n";

import type { FeatureGridStore } from "../feature-grid/FeatureGridStore";

import TagIcon from "@nextgisweb/icon/material/tag";

const buildCountQuery = (
    queryParams: FeatureGridStore["queryParams"],
    filterExpression?: FeatureGridStore["filterExpression"]
) => {
    const query: {
        filter?: string;
        like?: string;
        ilike?: string;
        intersects?: string;
    } = {};

    if (filterExpression) {
        query.filter = filterExpression;
    }

    if (queryParams) {
        if (queryParams.like) query.like = queryParams.like;
        if (queryParams.ilike) query.ilike = queryParams.ilike;
        if (queryParams.intersects) query.intersects = queryParams.intersects;
        if (queryParams.filter) query.filter = queryParams.filter;
    }

    return Object.keys(query).length > 0 ? query : undefined;
};

interface FilteredCountExpandedProps {
    store: FeatureGridStore;
    handleToggle: () => void;
}

const FilteredCountExpanded = observer(
    ({ store, handleToggle }: FilteredCountExpandedProps) => {
        const { id, queryParams, size, version } = store;

        const countQuery = useMemo(() => {
            return buildCountQuery(queryParams);
        }, [queryParams]);

        const options = useMemo(() => {
            return countQuery ? { query: countQuery, version } : { version };
        }, [countQuery, version]);

        const { data: countData } = useRouteGet(
            "feature_layer.feature.count",
            { id },
            options,
            false
        );

        let displayText = undefined;
        if (countData) {
            const { total_count, filtered_count } = countData;
            displayText =
                filtered_count !== undefined
                    ? gettextf("{filtered_count} of {total_count}")({
                          filtered_count,
                          total_count,
                      })
                    : `${total_count}`;
        }
        const tooltipText = displayText || gettext("Feature count");

        return (
            <Tooltip title={tooltipText}>
                <Button
                    type="default"
                    size={size}
                    icon={<TagIcon />}
                    onClick={handleToggle}
                >
                    {displayText}
                </Button>
            </Tooltip>
        );
    }
);

FilteredCountExpanded.displayName = "FilteredCountExpanded";

interface FilteredCountProps {
    store: FeatureGridStore;
}

const FilteredCount = observer(({ store }: FilteredCountProps) => {
    const { size } = store;
    const [expanded, setExpanded] = useState(false);

    const handleToggle = () => setExpanded(!expanded);

    if (!expanded) {
        return (
            <Tooltip title={gettext("Feature count")}>
                <Button
                    type="default"
                    size={size}
                    icon={<TagIcon />}
                    onClick={handleToggle}
                />
            </Tooltip>
        );
    }

    return <FilteredCountExpanded store={store} handleToggle={handleToggle} />;
});

FilteredCount.displayName = "FilteredCount";

export default FilteredCount;
