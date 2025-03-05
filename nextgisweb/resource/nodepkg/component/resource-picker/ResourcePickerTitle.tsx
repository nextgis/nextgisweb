import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";

import { Button, Col, Row, Space, Tooltip } from "@nextgisweb/gui/antd";
import { CloseIcon, SearchIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { ResourcesFilter } from "../../resources-filter/ResourcesFilter";

import { ResourcePickerBreadcrumb } from "./ResourcePickerBreadcrumb";
import type { ResourcePickerStore } from "./store/ResourcePickerStore";
import type { ResourcePickerTitleProps } from "./type";

import ArrowBack from "@nextgisweb/icon/material/arrow_back";
import StartIcon from "@nextgisweb/icon/material/first_page";
import SyncIcon from "@nextgisweb/icon/material/sync";

const msgGotoInitialGroup = gettext("Go to initial group");
const msgRefresh = gettext("Refresh");

interface SearchPanelProps {
    store: ResourcePickerStore;
    onCancelSearch: () => void;
}

const SearchPanel = observer(({ store, onCancelSearch }: SearchPanelProps) => {
    return (
        <Space.Compact>
            <Button icon={<ArrowBack />} onClick={onCancelSearch} />
            <ResourcesFilter
                cls={store.requireClass || undefined}
                onChange={(v, opt) => {
                    store.changeParentTo(Number(opt.key));
                    onCancelSearch();
                }}
            />
        </Space.Compact>
    );
});

SearchPanel.displayName = "SearchPanel";

interface PathPanelProps {
    store: ResourcePickerStore;
    onEnterSearchMode: () => void;
}

export const PathPanel = observer(
    ({ store, onEnterSearchMode }: PathPanelProps) => {
        const {
            initParentId: initialParentId,
            parentId,
            allowMoveInside,
        } = store;
        return (
            <Row>
                <Col style={{ width: "30px" }}>
                    <a onClick={onEnterSearchMode}>
                        <SearchIcon />
                    </a>
                </Col>
                <Col flex="auto" className="resource-breadcrumb">
                    <ResourcePickerBreadcrumb store={store} />
                </Col>
                {parentId !== initialParentId && allowMoveInside && (
                    <Col style={{ width: "30px" }}>
                        <Tooltip title={msgGotoInitialGroup}>
                            <a onClick={() => store.returnToInitial()}>
                                <StartIcon />
                            </a>
                        </Tooltip>
                    </Col>
                )}
                <Col style={{ width: "30px" }}>
                    <Tooltip title={msgRefresh}>
                        <a onClick={() => store.refresh()}>
                            <SyncIcon />
                        </a>
                    </Tooltip>
                </Col>
            </Row>
        );
    }
);

PathPanel.displayName = "PathPanel";

export const ResourcePickerTitle = observer(
    ({ store, onClose, showClose }: ResourcePickerTitleProps) => {
        const [searchMode, setSearchMode] = useState(false);

        const stopSearch = () => {
            setSearchMode(false);
        };
        const startSearch = () => {
            setSearchMode(true);
        };

        useEffect(() => {
            store.setAllowCreateResource(!searchMode);
        }, [searchMode, store]);

        return (
            <Row justify="space-between">
                <Col flex="auto">
                    {searchMode ? (
                        <SearchPanel
                            store={store}
                            onCancelSearch={stopSearch}
                        />
                    ) : (
                        <PathPanel
                            store={store}
                            onEnterSearchMode={startSearch}
                        />
                    )}
                </Col>
                {showClose && (
                    <Col>
                        <a color="primary" onClick={onClose}>
                            <CloseIcon />
                        </a>
                    </Col>
                )}
            </Row>
        );
    }
);

ResourcePickerTitle.displayName = "ResourcePickerTitle";
