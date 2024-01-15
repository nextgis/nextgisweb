import { observer } from "mobx-react-lite";
import { useCallback, useMemo } from "react";

import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import type {
    ActionToolbarAction,
    CreateButtonActionProps,
} from "@nextgisweb/gui/action-toolbar";
import { Button, Input, Space, Tooltip } from "@nextgisweb/gui/antd";
import { confirmDelete } from "@nextgisweb/gui/confirm";
import showModal from "@nextgisweb/gui/showModal";
import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { useResource } from "@nextgisweb/resource/hook/useResource";

import { FeatureEditorModal } from "../feature-editor-modal";

import type { FeatureGridStore } from "./FeatureGridStore";
import { deleteFeatures } from "./api/deleteFeatures";
import { ExportAction } from "./component/ExportAction";
import type { ActionProps } from "./type";

import DeleteIcon from "@nextgisweb/icon/material/delete";
import EditIcon from "@nextgisweb/icon/material/edit";
import EditInNewpageIcon from "@nextgisweb/icon/material/launch";
import OpenIcon from "@nextgisweb/icon/material/open_in_new";

const msgOpenTitle = gettext("Open");
const msgDeleteTitle = gettext("Delete");
const msgEditTitle = gettext("Edit");
const msgEditOnNewPage = gettext("Edit on a new page");

const msgSearchPlaceholder = gettext("Search...");

export const FeatureGridActions = observer(
    ({
        store,
        children,
    }: {
        store: FeatureGridStore;
        children?: React.ReactNode;
    }) => {
        const {
            id,
            size,
            actions: propActions,
            selectedIds,
            readonly,
            queryParams,
            editOnNewPage,
            beforeDelete,
            deleteError,
            onDelete,
            onSave,
        } = store;

        const { isExportAllowed } = useResource({ id });

        const goTo = useCallback(
            (
                path:
                    | "feature_layer.feature.update"
                    | "feature_layer.feature.show"
            ) => {
                if (selectedIds.length) {
                    window.open(
                        routeURL(path, { id, feature_id: selectedIds[0] })
                    );
                }
            },
            [id, selectedIds]
        );

        const handleDelete = useCallback(async () => {
            const featureIds = [...selectedIds];
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
            store.setSelectedIds([]);
            store.bumpVersion();
        }, [selectedIds, beforeDelete, store, id, onDelete, deleteError]);

        const defActions: ActionToolbarAction<ActionProps>[] = [
            {
                onClick: () => {
                    goTo("feature_layer.feature.show");
                },
                icon: <OpenIcon />,
                title: msgOpenTitle,
                disabled: !selectedIds.length,
                size,
            },
        ];

        if (!readonly) {
            defActions.push(
                ...[
                    (props: CreateButtonActionProps) => (
                        <Space.Compact key="feature-item-edit">
                            <Tooltip title={!props.isFit && msgEditTitle}>
                                <Button
                                    disabled={!selectedIds.length}
                                    size={size}
                                    icon={<EditIcon />}
                                    onClick={() => {
                                        if (selectedIds.length) {
                                            const featureId = selectedIds[0];
                                            showModal(FeatureEditorModal, {
                                                editorOptions: {
                                                    featureId,
                                                    resourceId: id,
                                                    onSave: (e) => {
                                                        if (onSave) {
                                                            onSave(e);
                                                        }
                                                        store.bumpVersion();
                                                    },
                                                },
                                            });
                                        }
                                    }}
                                >
                                    {props.isFit && msgEditTitle}
                                </Button>
                            </Tooltip>
                            {editOnNewPage && (
                                <Tooltip
                                    title={msgEditOnNewPage}
                                    key="leftButton"
                                >
                                    <Button
                                        disabled={!selectedIds.length}
                                        size={size}
                                        onClick={() => {
                                            goTo(
                                                "feature_layer.feature.update"
                                            );
                                        }}
                                        icon={<EditInNewpageIcon />}
                                    ></Button>
                                </Tooltip>
                            )}
                        </Space.Compact>
                    ),
                    {
                        onClick: () => {
                            confirmDelete({ onOk: handleDelete });
                        },
                        icon: <DeleteIcon />,
                        title: msgDeleteTitle,
                        danger: true,
                        disabled: !selectedIds.length,
                        size,
                    },
                ]
            );
        }

        const rightActions: ActionToolbarAction<ActionProps>[] = [];
        if (isExportAllowed) {
            rightActions.push((props) => (
                <ExportAction queryParams={queryParams} {...props} />
            ));
        }

        const actionProps: ActionProps = useMemo(
            () => ({
                selectedIds,
                id,
            }),
            [selectedIds, id]
        );

        return (
            <ActionToolbar
                size={size}
                actions={[...defActions, ...propActions]}
                rightActions={rightActions}
                actionProps={actionProps}
            >
                <div>
                    <Input
                        value={queryParams?.ilike}
                        placeholder={msgSearchPlaceholder}
                        onChange={(e) =>
                            store.setQueryParams({
                                ...store.queryParams,
                                ilike: e.target.value,
                            })
                        }
                        allowClear
                        size={size}
                    />
                </div>
                {children}
            </ActionToolbar>
        );
    }
);
