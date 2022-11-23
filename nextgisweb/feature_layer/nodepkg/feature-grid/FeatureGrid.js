import { PropTypes } from "prop-types";
import { useMemo, useState } from "react";

import { Input, Empty } from "@nextgisweb/gui/antd";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import i18n from "@nextgisweb/pyramid/i18n!feature_layer";

import FeatureTable from "./FeatureTable";
import "./FeatureGrid.less";

const searchPlaceholder = i18n.gettext("Search...");

export const FeatureGrid = ({ id }) => {
    const { data: totalData } = useRouteGet("feature_layer.feature.count", {
        id,
    });
    const { data: resourceData } = useRouteGet("resource.item", { id });

    const [query, setQuery] = useState("");

    const fields = useMemo(() => {
        if (resourceData) {
            return resourceData.feature_layer.fields;
        }
        return null;
    }, [resourceData]);

    if (!totalData || !fields) {
        return "loading...";
    }

    return (
        <div className="ngw-feature-layer-feature-grid">
            <div className="toolbar">
                <Input
                    placeholder={searchPlaceholder}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>

            <FeatureTable
                resourceId={id}
                total={totalData.total_count}
                fields={fields}
                query={query}
                empty={() => <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            />
        </div>
    );
};

FeatureGrid.propTypes = {
    id: PropTypes.number,
};
