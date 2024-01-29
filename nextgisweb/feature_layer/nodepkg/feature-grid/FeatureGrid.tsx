import isEqual from "lodash-es/isEqual";
import { observer } from "mobx-react-lite";
import { useEffect, useRef, useState } from "react";

import { Button, Empty, Tooltip } from "@nextgisweb/gui/antd";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { ResourceItem } from "@nextgisweb/resource/type/Resource";

import type { FeatureLayerCount } from "../type/FeatureLayer";

import { FeatureGridActions } from "./FeatureGridActions";
import { FeatureGridStore } from "./FeatureGridStore";
import FeatureTable from "./FeatureTable";
import TableConfigModal from "./component/TableConfigModal";
import { KEY_FIELD_ID } from "./constant";
import type { FeatureGridProps } from "./type";

import RefreshIcon from "@nextgisweb/icon/material/refresh";
import TuneIcon from "@nextgisweb/icon/material/tune";

import "./FeatureGrid.less";

const msgSettingsTitle = gettext("Open table settings");
const msgRefreshTitle = gettext("Refresh table");

const loadingCol = () => "...";

export const FeatureGrid = observer(
    ({
        store: storeProp,
        ...restProps
    }: {
        store?: FeatureGridStore;
    } & FeatureGridProps) => {
        const [store] = useState(
            () => storeProp || new FeatureGridStore(restProps)
        );

        const {
            id,
            size,
            fields,
            version,
            queryParams,
            selectedIds,
            visibleFields,
            cleanSelectedOnFilter,
            bumpVersion,
            onSelect,
        } = store;

        const { data: totalData, refresh: refreshTotal } =
            useRouteGet<FeatureLayerCount>("feature_layer.feature.count", {
                id,
            });
        const { data: resourceData, isLoading } = useRouteGet<ResourceItem>(
            "resource.item",
            {
                id,
            }
        );

        useEffect(() => {
            // Do not refresh on init version
            if (version) {
                refreshTotal();
            }
        }, [refreshTotal, version]);

        useEffect(() => {
            if (resourceData) {
                const fields = resourceData.feature_layer?.fields;
                if (fields) {
                    store.setFields(fields);
                    store.setVisibleFields([
                        KEY_FIELD_ID,
                        ...fields
                            .filter((f) => f.grid_visibility)
                            .map((f) => f.id),
                    ]);
                }
            }
        }, [resourceData, store]);

        const prevSelectedIds = useRef(selectedIds);
        useEffect(() => {
            if (onSelect) {
                if (!isEqual(selectedIds, prevSelectedIds.current)) {
                    prevSelectedIds.current = [...selectedIds];
                    onSelect(selectedIds || []);
                }
            }
        }, [onSelect, selectedIds]);

        if (!totalData || isLoading) {
            return <LoadingWrapper />;
        }

        return (
            <div className="ngw-feature-layer-feature-grid">
                <FeatureGridActions store={store}>
                    <Tooltip title={msgRefreshTitle}>
                        <Button
                            type="text"
                            icon={<RefreshIcon />}
                            onClick={bumpVersion}
                            size={size}
                        />
                    </Tooltip>
                    <Tooltip title={msgSettingsTitle}>
                        <Button
                            type="text"
                            icon={<TuneIcon />}
                            onClick={() => {
                                store.setSettingsOpen(!store.settingsOpen);
                            }}
                            size={size}
                        />
                    </Tooltip>
                </FeatureGridActions>

                <FeatureTable
                    empty={() => <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                    total={totalData.total_count}
                    fields={fields}
                    version={version}
                    selectedIds={selectedIds}
                    loadingCol={loadingCol}
                    resourceId={id}
                    setSelectedIds={store.setSelectedIds}
                    queryParams={queryParams || undefined}
                    visibleFields={visibleFields}
                    cleanSelectedOnFilter={cleanSelectedOnFilter}
                />
                <TableConfigModal store={store} />
            </div>
        );
    }
);
