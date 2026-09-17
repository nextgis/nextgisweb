import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";

import { Button, Col, Flex, Row, Space, Tooltip } from "@nextgisweb/gui/antd";
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
    <Space.Compact block>
      <Button icon={<ArrowBack />} onClick={onCancelSearch} />
      <ResourcesFilter
        autoFocus
        showAdvancedSearch={false}
        popupMatchSelectWidth
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
    const { initParentId: initialParentId, parentId, allowMoveInside } = store;
    return (
      <Row align="middle" wrap={false}>
        <Col flex="30px">
          <a onClick={onEnterSearchMode}>
            <SearchIcon />
          </a>
        </Col>
        <Col
          flex="auto"
          className="resource-breadcrumb"
          style={{ minWidth: 0 }}
        >
          <ResourcePickerBreadcrumb store={store} />
        </Col>
        {parentId !== initialParentId && allowMoveInside && (
          <Col flex="30px">
            <Tooltip title={msgGotoInitialGroup}>
              <a onClick={() => store.returnToInitial()}>
                <StartIcon />
              </a>
            </Tooltip>
          </Col>
        )}
        <Col flex="30px">
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
      <Flex align="center" gap="small">
        <Flex flex={1} style={{ minWidth: 0 }}>
          {searchMode ? (
            <SearchPanel store={store} onCancelSearch={stopSearch} />
          ) : (
            <PathPanel store={store} onEnterSearchMode={startSearch} />
          )}
        </Flex>
        {showClose && (
          <Button
            type="text"
            size="small"
            icon={<CloseIcon />}
            aria-label={gettext("Close")}
            onClick={onClose}
          />
        )}
      </Flex>
    );
  }
);

ResourcePickerTitle.displayName = "ResourcePickerTitle";
