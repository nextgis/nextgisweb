import ArrowBack from "@material-icons/svg/arrow_back";
import CloseIcon from "@material-icons/svg/close";
import StartIcon from "@material-icons/svg/first_page";
import SearchIcon from "@material-icons/svg/search";
import SyncIcon from "@material-icons/svg/sync";
import { Button, Col, Input, Row, Tooltip } from "@nextgisweb/gui/antd";
import i18n from "@nextgisweb/pyramid/i18n!resource";
import { observer } from "mobx-react-lite";
import { PropTypes } from "prop-types";
import { useEffect, useState } from "react";
import { ResourceBreadcrumb } from "../resource-breadcrumb";
import ResourcesFilter from "../resources-filter";

const returnToInitialGroupTitle = i18n.gettext(
    "Return to initial group resource"
);
const refreshGroupTitle = i18n.gettext("Refresh this group resource");

export const ResourcePickerModalTitle = observer(
    ({ resourceStore, onClose }) => {
        const { initialParentId, parentId, allowMoveInside } = resourceStore;

        const [searchMode, setSearchMode] = useState(false);

        useEffect(() => {
            resourceStore.setAllowCreateResource(!searchMode);
        }, [searchMode]);

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
                                cls={resourceStore.enabledCls.join(",")}
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
                        <ResourceBreadcrumb resourceStore={resourceStore} />
                    </Col>

                    {parentId !== initialParentId && allowMoveInside && (
                        <Col style={{ width: "30px" }}>
                            <Tooltip title={returnToInitialGroupTitle}>
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
                        <Tooltip title={refreshGroupTitle}>
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
                <Col>
                    <a color="primary" onClick={onClose}>
                        <CloseIcon />
                    </a>
                </Col>
            </Row>
        );
    }
);

ResourcePickerModalTitle.propTypes = {
    resourceStore: PropTypes.object,
    onClose: PropTypes.func,
};
