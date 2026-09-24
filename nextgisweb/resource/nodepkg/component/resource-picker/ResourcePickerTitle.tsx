import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";

import { Button, Flex, Space } from "@nextgisweb/gui/antd";
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
      <Button
        icon={<ArrowBack />}
        title={gettext("Back")}
        onClick={onCancelSearch}
      />
      <ResourcesFilter
        autoFocus
        showAdvancedSearch={false}
        popupMatchSelectWidth
        cls={store.requireClass}
        onChange={(_, opt) => {
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
    const { initParentId, parentId, allowMoveInside } = store;
    return (
      <>
        <Button
          type="text"
          size="small"
          icon={<SearchIcon />}
          title={gettext("Search")}
          aria-label={gettext("Search")}
          onClick={onEnterSearchMode}
        />
        <ResourcePickerBreadcrumb store={store} />
        {parentId !== initParentId && allowMoveInside && (
          <Button
            type="text"
            size="small"
            icon={<StartIcon />}
            title={msgGotoInitialGroup}
            aria-label={msgGotoInitialGroup}
            onClick={() => store.returnToInitial()}
          />
        )}
        <Button
          type="text"
          size="small"
          icon={<SyncIcon />}
          title={msgRefresh}
          aria-label={msgRefresh}
          onClick={() => store.refresh()}
        />
      </>
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
        {searchMode ? (
          <SearchPanel store={store} onCancelSearch={stopSearch} />
        ) : (
          <PathPanel store={store} onEnterSearchMode={startSearch} />
        )}
        {showClose && (
          <Button
            type="text"
            size="small"
            icon={<CloseIcon />}
            title={gettext("Close")}
            aria-label={gettext("Close")}
            onClick={onClose}
          />
        )}
      </Flex>
    );
  }
);

ResourcePickerTitle.displayName = "ResourcePickerTitle";
