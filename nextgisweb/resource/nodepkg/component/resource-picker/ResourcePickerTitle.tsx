import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";

import ArrowBack from "@material-icons/svg/arrow_back";
import CloseIcon from "@material-icons/svg/close";
import StartIcon from "@material-icons/svg/first_page";
import SearchIcon from "@material-icons/svg/search";
import SyncIcon from "@material-icons/svg/sync";

import { Button, Col, Input, Row, Tooltip } from "@nextgisweb/gui/antd";

import ResourcesFilter from "../../resources-filter";
import { ResourcePickerBreadcrumb } from "./ResourcePickerBreadcrumb";

import type { ResourcePickerTitleProps } from "./type";

import i18n from "@nextgisweb/pyramid/i18n";

const mGotoInitialGroup = i18n.gettext("Go to initial group");
const mRefresh = i18n.gettext("Refresh");

export const ResourcePickerTitle = observer(
    ({ resourceStore, onClose, showClose }: ResourcePickerTitleProps) => {
        const { initialParentId, parentId, allowMoveInside } = resourceStore;

        const [searchMode, setSearchMode] = useState(false);

        useEffect(() => {
            resourceStore.setAllowCreateResource(!searchMode);
        }, [searchMode, resourceStore]);

        function SearchPanel() {
            return (
                <Input.Group>
                    <Row>
                        <Col>
                            <Button
                                icon={<ArrowBack />}
                                onClick={() => setSearchMode(false)}
                            ></Button>
                        </Col>
                        <Col flex="auto">
                            <ResourcesFilter
                                cls={resourceStore.requireClass}
                                onChange={(v, opt) => {
                                    resourceStore.changeParentTo(
                                        Number(opt.key)
                                    );
                                    setSearchMode(false);
                                }}
                            />
                        </Col>
                    </Row>
                </Input.Group>
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
                            <Tooltip title={mGotoInitialGroup}>
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
                        <Tooltip title={mRefresh}>
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
