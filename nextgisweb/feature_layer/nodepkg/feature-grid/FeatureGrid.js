import { PropTypes } from "prop-types";

import DeleteIcon from "@material-icons/svg/delete";
import EditIcon from "@material-icons/svg/edit";
import OpenIcon from "@material-icons/svg/open_in_new";
import TuneIcon from "@material-icons/svg/tune";
import { useMemo, useState } from "react";

import { Button, Empty, Input } from "@nextgisweb/gui/antd";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import { confirmDelete } from "@nextgisweb/gui/confirm";
import { routeURL } from "@nextgisweb/pyramid/api";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import i18n from "@nextgisweb/pyramid/i18n!feature_layer";

import { deleteFeatures } from "./api/deleteFeatures";
import { KEY_FIELD_KEYNAME } from "./constant";
import FeatureTable from "./FeatureTable";

import "./FeatureGrid.less";

const searchPlaceholderMsg = i18n.gettext("Search...");
const openTitleMsg = i18n.gettext("Open");
const deleteTitleMsg = i18n.gettext("Delete");
const editTitleMsg = i18n.gettext("Edit");

const LoadingCol = () => "...";

export const FeatureGrid = ({ id, readonly }) => {
    const { data: totalData, refresh: refreshTotal } = useRouteGet(
        "feature_layer.feature.count",
        {
            id,
        }
    );
    const { data: resourceData } = useRouteGet("resource.item", { id });

    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState([]);
    const [settingsOpen, setSettingsOpen] = useState(false);

    const fields = useMemo(() => {
        if (resourceData) {
            return resourceData.feature_layer.fields;
        }
        return null;
    }, [resourceData]);

    if (!totalData || !fields) {
        return <LoadingWrapper />;
    }

    const goTo = (path) => {
        const first = selected[0];
        if (first) {
            window.open(routeURL(path, id, first[KEY_FIELD_KEYNAME]));
        }
    };

    const handleDelete = async () => {
        const featureIds = selected.map((s) => s[KEY_FIELD_KEYNAME]);
        await deleteFeatures({
            resourceId: id,
            featureIds,
        });
        await refreshTotal();
        setSelected([]);
    };

    const selectedAction = [
        {
            onClick: () => {
                goTo("feature_layer.feature.show");
            },
            icon: <OpenIcon />,
            title: openTitleMsg,
        },
    ];

    if (!readonly) {
        selectedAction.push(
            {
                onClick: () => {
                    goTo("feature_layer.feature.update");
                },
                icon: <EditIcon />,
                title: editTitleMsg,
            },
            {
                onClick: () => {
                    confirmDelete({ onOk: handleDelete });
                },
                icon: <DeleteIcon />,
                title: deleteTitleMsg,
                danger: true,
            }
        );
    }

    return (
        <div className="ngw-feature-layer-feature-grid">
            <div className="toolbar">
                {selected.length
                    ? selectedAction.map(({ title, ...s }, i) => (
                        <div key={i}>
                            <Button {...s}>{title}</Button>
                        </div>
                    ))
                    : null}
                <div className="spacer" />
                <div>
                    <Button
                        type="text"
                        icon={<TuneIcon />}
                        onClick={() => setSettingsOpen(!settingsOpen)}
                    />
                </div>
                <div>
                    <Input
                        placeholder={searchPlaceholderMsg}
                        onChange={(e) => setQuery(e.target.value)}
                        allowClear
                    />
                </div>
            </div>

            <FeatureTable
                resourceId={id}
                total={totalData.total_count}
                fields={fields}
                empty={() => <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                {...{
                    query,
                    fields,
                    selected,
                    LoadingCol,
                    setSelected,
                    settingsOpen,
                    setSettingsOpen,
                }}
            />
        </div>
    );
};

FeatureGrid.propTypes = {
    id: PropTypes.number,
    readonly: PropTypes.bool,
};
