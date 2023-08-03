import { useCallback, useEffect, useMemo, useState } from "react";

import { Button, Empty, Input } from "@nextgisweb/gui/antd";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import { confirmDelete } from "@nextgisweb/gui/confirm";
import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import { routeURL } from "@nextgisweb/pyramid/api";
import { useResource } from "@nextgisweb/resource/hook/useResource";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import i18n from "@nextgisweb/pyramid/i18n";

import { ExportAction } from "./component/ExportAction";
import { deleteFeatures } from "./api/deleteFeatures";
import { KEY_FIELD_KEYNAME } from "./constant";
import FeatureTable from "./FeatureTable";

import DeleteIcon from "@material-icons/svg/delete";
import EditIcon from "@material-icons/svg/edit";
import OpenIcon from "@material-icons/svg/open_in_new";
import TuneIcon from "@material-icons/svg/tune";

import type { SizeType } from "@nextgisweb/gui/antd";
import type { ResourceItem } from "@nextgisweb/resource/type/Resource";
import type { ActionToolbarAction } from "@nextgisweb/gui/action-toolbar";

import type { FeatureLayerCount } from "../type/FeatureLayer";
import type { Selected } from "./type";

import "./FeatureGrid.less";

interface FeatureGridProps {
    id: number;
    selectedIds?: number[];
    size?: SizeType;
    query?: string;
    readonly?: boolean;
    cleanSelectedOnFilter?: boolean;
    actions?: ActionToolbarAction[];
    beforeDelete?: (featureIds: number[]) => void;
    deleteError?: (featureIds: number[]) => void;
    onDelete?: (featureIds: number[]) => void;
    onSelect?: (selected: Selected[], oldValue: Selected[]) => void;
}

const searchPlaceholderMsg = i18n.gettext("Search...");
const openTitleMsg = i18n.gettext("Open");
const deleteTitleMsg = i18n.gettext("Delete");
const editTitleMsg = i18n.gettext("Edit");

const loadingCol = () => "...";

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
}: FeatureGridProps) => {
    const { data: totalData, refresh: refreshTotal } =
        useRouteGet<FeatureLayerCount>("feature_layer.feature.count", {
            id,
        });
    const { data: resourceData } = useRouteGet<ResourceItem>("resource.item", {
        id,
    });
    const { isExportAllowed } = useResource({ id });

    const [query, setQuery] = useState("");
    const [selected, setSelected_] = useState<Selected[]>(() => []);
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
                const featureId = first[KEY_FIELD_KEYNAME] as string;
                window.open(routeURL(path, id, featureId));
            }
        },
        [id, selected]
    );

    const handleDelete = useCallback(async () => {
        const featureIds = selected.map(
            (s) => s[KEY_FIELD_KEYNAME]
        ) as number[];
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

    if (!totalData || !fields) {
        return <LoadingWrapper />;
    }

    const defActions: ActionToolbarAction[] = [
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
            ...[
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
                },
            ]
        );
    }

    const rightActions = [];
    if (isExportAllowed) {
        rightActions.push((props) => <ExportAction {...props} />);
    }

    return (
        <div className="ngw-feature-layer-feature-grid">
            <ActionToolbar
                size={size}
                actions={[...defActions, ...actions]}
                rightActions={rightActions}
                actionProps={{ selected, query, id }}
            >
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
            </ActionToolbar>

            <FeatureTable
                resourceId={id}
                total={totalData.total_count}
                fields={fields}
                empty={() => <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                {...{
                    query,
                    fields,
                    selected,
                    loadingCol,
                    setSelected,
                    settingsOpen,
                    setSettingsOpen,
                    cleanSelectedOnFilter,
                }}
            />
        </div>
    );
};
