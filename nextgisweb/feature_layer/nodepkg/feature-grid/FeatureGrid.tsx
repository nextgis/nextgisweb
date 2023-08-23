import { useCallback, useEffect, useMemo, useState } from "react";

import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import { Button, Empty, Input } from "@nextgisweb/gui/antd";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import { confirmDelete } from "@nextgisweb/gui/confirm";
import showModal from "@nextgisweb/gui/showModal";
import { routeURL } from "@nextgisweb/pyramid/api";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { useResource } from "@nextgisweb/resource/hook/useResource";

import { FeatureEditorModal } from "../feature-editor-modal";

import FeatureTable from "./FeatureTable";
import { deleteFeatures } from "./api/deleteFeatures";
import { ExportAction } from "./component/ExportAction";
import { KEY_FIELD_KEYNAME } from "./constant";

import type { ActionToolbarAction } from "@nextgisweb/gui/action-toolbar";
import type { SizeType } from "@nextgisweb/gui/antd";
import type { ResourceItem } from "@nextgisweb/resource/type/Resource";

import type { FeatureLayerCount } from "../type/FeatureLayer";
import type { FeatureAttrs } from "./type";

import DeleteIcon from "@nextgisweb/icon/material/delete";
import EditIcon from "@nextgisweb/icon/material/edit";
import OpenIcon from "@nextgisweb/icon/material/open_in_new";
import TuneIcon from "@nextgisweb/icon/material/tune";

import "./FeatureGrid.less";

interface ActionProps {
    id: number;
    query: string;
    size?: SizeType;
    selected?: FeatureAttrs[];
}

interface FeatureGridProps {
    id: number;
    selectedIds?: number[];
    size?: SizeType;
    query?: string;
    version?: number;
    readonly?: boolean;
    editOnNewPage?: boolean;
    cleanSelectedOnFilter?: boolean;
    actions?: ActionToolbarAction[];
    beforeDelete?: (featureIds: number[]) => void;
    deleteError?: (featureIds: number[]) => void;
    onDelete?: (featureIds: number[]) => void;
    onSave?: (value: ResourceItem | undefined) => void;
    onSelect?: (selected: number[]) => void;
}

const searchPlaceholderMsg = gettext("Search...");
const openTitleMsg = gettext("Open");
const deleteTitleMsg = gettext("Delete");
const editTitleMsg = gettext("Edit");

const loadingCol = () => "...";

export const FeatureGrid = ({
    id,
    query: query_,
    onSave,
    version: version_,
    onDelete,
    onSelect,
    deleteError,
    actions = [],
    selectedIds,
    beforeDelete,
    editOnNewPage,
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
    const [version, setVersion] = useState(version_ || 0);
    const [selected, setSelected] = useState<FeatureAttrs[]>(() => []);
    const [settingsOpen, setSettingsOpen] = useState(false);

    useEffect(() => {
        if (version_ !== undefined) {
            setVersion(version + version_);
        }
    }, [version_]);
    useEffect(() => {
        if (selectedIds) {
            setSelected(selectedIds.map((s) => ({ [KEY_FIELD_KEYNAME]: s })));
        }
    }, [selectedIds, setSelected, onSelect]);

    useEffect(() => {
        if (onSelect) {
            const selectedIds_ = selected.map((s) =>
                Number(s[KEY_FIELD_KEYNAME])
            );
            onSelect(selectedIds_ || []);
        }
    }, [onSelect, selected]);

    useEffect(() => {
        if (query_ !== undefined) {
            setQuery(query_);
        }
    }, [query_]);

    const fields = useMemo(() => {
        if (resourceData) {
            return resourceData.feature_layer?.fields;
        }
        return undefined;
    }, [resourceData]);

    const goTo = useCallback(
        (
            path: "feature_layer.feature.update" | "feature_layer.feature.show"
        ) => {
            const first = selected[0];
            if (first) {
                const featureId = first[KEY_FIELD_KEYNAME] as number;
                window.open(routeURL(path, { id, feature_id: featureId }));
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

    const defActions: ActionToolbarAction<ActionProps>[] = [
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
                        if (editOnNewPage) {
                            goTo("feature_layer.feature.update");
                        } else {
                            const first = selected[0];
                            if (first) {
                                const featureId = first[
                                    KEY_FIELD_KEYNAME
                                ] as number;
                                showModal(FeatureEditorModal, {
                                    editorOptions: {
                                        featureId,
                                        resourceId: id,
                                        onSave: (e) => {
                                            if (onSave) {
                                                onSave(e);
                                            }
                                            setVersion((old) => old + 1);
                                        },
                                    },
                                });
                            }
                        }
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

    const rightActions: ActionToolbarAction<ActionProps>[] = [];
    if (isExportAllowed) {
        rightActions.push((props) => <ExportAction {...props} />);
    }

    const actionProps: ActionProps = { selected, query, id };

    return (
        <div className="ngw-feature-layer-feature-grid">
            <ActionToolbar
                size={size}
                actions={[...defActions, ...actions]}
                rightActions={rightActions}
                actionProps={actionProps}
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
                version={version}
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
