import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";

import { Button, Col, Row, Space, Tooltip } from "@nextgisweb/gui/antd";
import { CloseIcon, SearchIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { ResourcesFilter } from "../../resources-filter/ResourcesFilter";

import { ResourcePickerBreadcrumb } from "./ResourcePickerBreadcrumb";
import type { ResourcePickerTitleProps } from "./type";

import ArrowBack from "@nextgisweb/icon/material/arrow_back";
import StartIcon from "@nextgisweb/icon/material/first_page";
import SyncIcon from "@nextgisweb/icon/material/sync";

const msgGotoInitialGroup = gettext("Go to initial group");
const msgRefresh = gettext("Refresh");

export const ResourcePickerTitle = observer(
    ({ resourceStore, onClose, showClose }: ResourcePickerTitleProps) => {
        const {
            initParentId: initialParentId,
            parentId,
            allowMoveInside,
        } = resourceStore;

        const [searchMode, setSearchMode] = useState(false);

        useEffect(() => {
            resourceStore.setAllowCreateResource(!searchMode);
        }, [searchMode, resourceStore]);

        function SearchPanel() {
            return (
                <Space.Compact>
                    <Button
                        icon={<ArrowBack />}
                        onClick={() => setSearchMode(false)}
                    />
                    <ResourcesFilter
                        cls={resourceStore.requireClass || undefined}
                        onChange={(v, opt) => {
                            resourceStore.changeParentTo(Number(opt.key));
                            setSearchMode(false);
                        }}
                    />
                </Space.Compact>
            );
        }

        function PathPanel() {
            return (
                <Row>
                    <Col style={{ width: "30px" }}>
                        <a onClick={() => setSearchMode(true)}>
                            <SearchIcon />
                        </a>
                    </Col>
                    <Col flex="auto" className="resource-breadcrumb">
                        <ResourcePickerBreadcrumb
                            resourceStore={resourceStore}
                        />
                    </Col>

                    {parentId !== initialParentId && allowMoveInside && (
                        <Col style={{ width: "30px" }}>
                            <Tooltip title={msgGotoInitialGroup}>
                                <a
                                    onClick={() =>
                                        resourceStore.returnToInitial()
                                    }
                                >
                                    <StartIcon />
                                </a>
                            </Tooltip>
                        </Col>
                    )}

                    <Col style={{ width: "30px" }}>
                        <Tooltip title={msgRefresh}>
                            <a onClick={() => resourceStore.refresh()}>
                                <SyncIcon />
                            </a>
                        </Tooltip>
                    </Col>
                </Row>
            );
        }

        return (
            <Row justify="space-between">
                <Col flex="auto">
                    {searchMode ? <SearchPanel /> : <PathPanel />}
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
