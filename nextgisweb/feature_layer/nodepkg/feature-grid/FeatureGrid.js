import { PropTypes } from "prop-types";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button, Empty, Input } from "@nextgisweb/gui/antd";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import { confirmDelete } from "@nextgisweb/gui/confirm";
import { SvgIcon } from "@nextgisweb/gui/svg-icon";
import { routeURL } from "@nextgisweb/pyramid/api";
import { useResource } from "@nextgisweb/resource/hook/useResource";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import i18n from "@nextgisweb/pyramid/i18n!feature_layer";

import { ExportAction } from "./component/ExportAction";
import { deleteFeatures } from "./api/deleteFeatures";
import { KEY_FIELD_KEYNAME } from "./constant";
import FeatureTable from "./FeatureTable";

import DeleteIcon from "@material-icons/svg/delete";
import EditIcon from "@material-icons/svg/edit";
import OpenIcon from "@material-icons/svg/open_in_new";
import TuneIcon from "@material-icons/svg/tune";

import "./FeatureGrid.less";

const searchPlaceholderMsg = i18n.gettext("Search...");
const openTitleMsg = i18n.gettext("Open");
const deleteTitleMsg = i18n.gettext("Delete");
const editTitleMsg = i18n.gettext("Edit");

const LoadingCol = () => "...";

export const FeatureGrid = ({
    id,
    query: query_,
    onDelete,
    onSelect,
    deleteError,
    actions = [],
    selectedIds,
    beforeDelete,
    size = "middle",
    readonly = true,
    cleanSelectedOnFilter = true,
}) => {
    const { data: totalData, refresh: refreshTotal } = useRouteGet(
        "feature_layer.feature.count",
        {
            id,
        }
    );
    const { data: resourceData } = useRouteGet("resource.item", { id });
    const { isExportAllowed } = useResource({ id });

    const [query, setQuery] = useState("");
    const [selected, setSelected_] = useState(() => []);
    const [settingsOpen, setSettingsOpen] = useState(false);

    const setSelected = useCallback(
        (val) => {
            setSelected_((old) => {
                let newVal = val;
                if (typeof val === "function") {
                    newVal = val(old);
                }
                if (onSelect) {
                    onSelect(
                        newVal.map((s) => s[KEY_FIELD_KEYNAME]),
                        old
                    );
                }
                if (!old && !newVal) {
                    return old;
                }
                return newVal;
            });
        },
        [onSelect]
    );

    useEffect(() => {
        if (selectedIds) {
            setSelected(selectedIds.map((s) => ({ [KEY_FIELD_KEYNAME]: s })));
        }
    }, [selectedIds, setSelected]);

    useEffect(() => {
        if (query_ !== undefined) {
            setQuery(query_);
        }
    }, [query_]);

    const fields = useMemo(() => {
        if (resourceData) {
            return resourceData.feature_layer.fields;
        }
        return null;
    }, [resourceData]);

    const goTo = useCallback(
        (path) => {
            const first = selected[0];
            if (first) {
                window.open(routeURL(path, id, first[KEY_FIELD_KEYNAME]));
            }
        },
        [id, selected]
    );

    const handleDelete = useCallback(async () => {
        const featureIds = selected.map((s) => s[KEY_FIELD_KEYNAME]);
        if (beforeDelete) {
            beforeDelete(featureIds);
        }
        try {
            await deleteFeatures({
                resourceId: id,
                featureIds,
            });
            if (onDelete) {
                onDelete(featureIds);
            }
        } catch (er) {
            if (deleteError) {
                deleteError(featureIds);
            }
        }
        await refreshTotal();
        setSelected([]);
    }, [
        beforeDelete,
        refreshTotal,
        setSelected,
        deleteError,
        onDelete,
        selected,
        id,
    ]);

    const createButtonAction = useCallback(
        ({ action, icon, title, ...rest }) => {
            const btnAction = { size, ...rest };
            if (action) {
                const onClick = () => {
                    action({ selected });
                };
                btnAction.onClick = onClick;
            }
            if (typeof btnAction.disabled === "function") {
                btnAction.disabled = btnAction.disabled({ selected });
            }
            if (typeof icon === "string") {
                btnAction.icon = <SvgIcon icon={icon} fill="currentColor" />;
            }
            return <Button {...btnAction}>{title}</Button>;
        },
        [selected, size]
    );

    if (!totalData || !fields) {
        return <LoadingWrapper />;
    }

    const leftActions = [];
    const rightActions = [];

    const defActions = [
        {
            onClick: () => {
                goTo("feature_layer.feature.show");
            },
            icon: <OpenIcon />,
            title: openTitleMsg,
            disabled: !selected.length,
            size,
        },
    ];

    if (!readonly) {
        defActions.push(
            {
                onClick: () => {
                    goTo("feature_layer.feature.update");
                },
                icon: <EditIcon />,
                title: editTitleMsg,
                disabled: !selected.length,
                size,
            },
            {
                onClick: () => {
                    confirmDelete({ onOk: handleDelete });
                },
                icon: <DeleteIcon />,
                title: deleteTitleMsg,
                danger: true,
                disabled: !selected.length,
                size,
            }
        );
    }

    const getAction = (Action) => (
        <div key={i}>
            {typeof Action === "function" ? (
                <Action {...{ query, id, size }} />
            ) : (
                createButtonAction(Action)
            )}
        </div>
    );

    let i = 0;
    if (isExportAllowed) {
        rightActions.push(getAction((props) => <ExportAction {...props} />));
    }

    let addDirection = leftActions;
    for (const Action of [...defActions, ...actions]) {
        i++;
        if (typeof Action === "string") {
            addDirection = rightActions;
            continue;
        }
        addDirection.push(getAction(Action));
    }

    return (
        <div className="ngw-feature-layer-feature-grid">
            <div className="toolbar">
                {leftActions}

                <div className="spacer" />

                {rightActions}

                <div>
                    <Input
                        placeholder={searchPlaceholderMsg}
                        onChange={(e) => setQuery(e.target.value)}
                        allowClear
                        size={size}
                    />
                </div>
                <div>
                    <Button
                        type="text"
                        icon={<TuneIcon />}
                        onClick={() => setSettingsOpen(!settingsOpen)}
                        size={size}
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
                    cleanSelectedOnFilter,
                }}
            />
        </div>
    );
};

FeatureGrid.propTypes = {
    actions: PropTypes.arrayOf(
        PropTypes.oneOfType([
            PropTypes.object,
            PropTypes.string,
            PropTypes.func,
        ])
    ),
    selectedIds: PropTypes.arrayOf(PropTypes.number),
    cleanSelectedOnFilter: PropTypes.bool,
    beforeDelete: PropTypes.func,
    query: PropTypes.string,
    deleteError: PropTypes.func,
    id: PropTypes.number,
    onDelete: PropTypes.func,
    onSelect: PropTypes.func,
    readonly: PropTypes.bool,
    hasMap: PropTypes.bool,
    onZoomToFiltered: PropTypes.func,
    size: PropTypes.oneOf(["small", "middle", "large"]),
};
