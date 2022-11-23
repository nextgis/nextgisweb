import { PropTypes } from "prop-types";
import { useMemo, useState } from "react";
import TuneIcon from "@material-icons/svg/tune";
import { Input, Button, Empty } from "@nextgisweb/gui/antd";
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
    const [settingsOpen, setSettingsOpen] = useState(false);

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
                <div className="spacer"/>
                <div>
                    <Button
                        type="text"
                        icon={<TuneIcon />}
                        onClick={() => setSettingsOpen(!settingsOpen)}
                    />
                </div>
                <div>
                    <Input
                        placeholder={searchPlaceholder}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
            </div>

            <FeatureTable
                resourceId={id}
                total={totalData.total_count}
                fields={fields}
                empty={() => <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                {...{ fields, query, settingsOpen, setSettingsOpen }}
            />
        </div>
    );
};

FeatureGrid.propTypes = {
    id: PropTypes.number,
};
