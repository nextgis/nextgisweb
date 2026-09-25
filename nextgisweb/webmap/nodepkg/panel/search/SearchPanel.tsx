import { observer } from "mobx-react-lite";
import {
  createContext,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ChangeEvent, ReactNode } from "react";

import { Alert, Input, Spin } from "@nextgisweb/gui/antd";
import { useDebounce } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { AbortControllerHelper } from "@nextgisweb/pyramid/util/abort";

import { PanelContainer, PanelTitle } from "../component";
import type { PanelTitleProps } from "../component";
import type { PanelPluginWidgetProps } from "../registry";

import { SearchResultsTree } from "./component/SearchResultsTree";
import {
  DEFAULT_SEARCH_SETTINGS,
  SearchSettingsPopover,
} from "./component/SearchSettingsPopover";
import type { SearchResultGroup, SearchSettings } from "./type";
import { getSearchableLayers } from "./util/getSearchableLayers";
import { search } from "./util/search";

import BackspaceIcon from "@nextgisweb/icon/material/backspace";

import "./SearchPanel.less";

const SearchPanelContext = createContext<any>(null);
SearchPanelContext.displayName = "SearchPanelContext";

function SearchPanelTitle({ className, close }: PanelTitleProps) {
  const {
    searchText,
    searchChange,
    clearSearchText,
    searchSettings,
    changeSearchSettings,
    availableLayers,
  } = use(SearchPanelContext);
  return (
    <div className={className}>
      <Input
        className="content"
        variant="borderless"
        value={searchText}
        onChange={searchChange}
        placeholder={gettext("Enter at least 2 characters")}
      />

      {searchText && searchText.trim() && (
        <PanelTitle.Button
          icon={<BackspaceIcon />}
          onClick={() => clearSearchText()}
        />
      )}
      <SearchSettingsPopover
        value={searchSettings}
        onChange={changeSearchSettings}
        availableLayers={availableLayers}
      />
      <PanelTitle.ButtonClose close={close} />
    </div>
  );
}

const SearchPanel = observer<PanelPluginWidgetProps>(({ store, display }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<
    [SearchResultGroup[], boolean] | undefined
  >(undefined);
  const [searchText, setSearchText] = useState<string | undefined>(undefined);
  const [searchController, setSearchController] = useState<
    AbortControllerHelper | undefined
  >(undefined);
  const [searchSettings, setSearchSettings] = useState<SearchSettings>(
    DEFAULT_SEARCH_SETTINGS
  );
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set()
  );

  const clearResults = () => {
    if (searchController) {
      searchController.abort();
      setSearchController(undefined);
    }
    setSearchResults(undefined);
    setLoading(false);
  };

  const availableLayers = useMemo(
    () =>
      getSearchableLayers(display.treeStore).map((item) => ({
        id: item.layerId,
        label: item.label,
      })),
    [display]
  );

  const runSearch = async (text: string, settings: SearchSettings) => {
    clearResults();
    setLoading(true);
    const controller = new AbortControllerHelper();
    setSearchController(controller);
    const results = await search(text, controller, display, settings);
    setSearchResults(results);
    setLoading(false);
  };

  const _search = useDebounce(
    (text: string) => runSearch(text, searchSettings),
    1000
  );

  const latestSearchRef = useRef({
    searchText,
    searchSettings,
    runSearch,
    cancelSearch: _search.cancel,
  });
  latestSearchRef.current = {
    searchText,
    searchSettings,
    runSearch,
    cancelSearch: _search.cancel,
  };

  const isFirstTreeStamp = useRef(true);
  const treeStamp = display.treeStore.deepTreeStamp;

  useEffect(() => {
    if (isFirstTreeStamp.current) {
      isFirstTreeStamp.current = false;
      return;
    }
    const { searchText, searchSettings, runSearch, cancelSearch } =
      latestSearchRef.current;
    if (searchText && searchText.trim().length > 1) {
      cancelSearch();
      runSearch(searchText, searchSettings);
    }
  }, [treeStamp]);

  const changeSearchSettings = (next: SearchSettings) => {
    const affectsResults =
      next.usedLayers !== searchSettings.usedLayers ||
      next.sources.geocoder !== searchSettings.sources.geocoder ||
      next.sources.coordinates !== searchSettings.sources.coordinates;
    setSearchSettings(next);
    if (affectsResults && searchText && searchText.trim().length > 1) {
      _search.cancel();
      runSearch(searchText, next);
    }
  };

  const searchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchText(value);
    if (value && value.trim() && value.trim().length > 1) {
      _search(value);
    } else {
      _search.cancel();
      clearResults();
    }
  };

  let results: ReactNode = null;
  let info: ReactNode = null;
  if (searchResults && !loading) {
    const [groups, isExceeded] = searchResults;
    results = (
      <SearchResultsTree
        groups={groups}
        display={display}
        navigationMode={searchSettings.navigationMode}
        collapsedGroups={collapsedGroups}
        onCollapsedGroupsChange={setCollapsedGroups}
      />
    );
    if (groups.length === 0) {
      info = <Alert title={gettext("Not found")} type="info" showIcon />;
    } else if (isExceeded) {
      info = (
        <Alert
          title={gettext(
            "Refine search criterion. Displayed first 100 search results."
          )}
          type="warning"
          showIcon
        />
      );
    }
  } else if (loading) {
    results = (
      <div className="loading-wrapper">
        <Spin className="loading" style={{ fontSize: 30 }} />
      </div>
    );
  }

  const clearSearchText = () => {
    setSearchText(undefined);
    clearResults();
  };

  return (
    <SearchPanelContext
      value={{
        searchText,
        searchChange,
        clearSearchText,
        searchSettings,
        changeSearchSettings,
        availableLayers,
      }}
    >
      <PanelContainer
        className="ngw-webmap-panel-search"
        close={store.close}
        prolog={info}
        components={{
          title: SearchPanelTitle,
          prolog: PanelContainer.Unpadded,
          content: PanelContainer.Unpadded,
        }}
      >
        <div className="results">{results}</div>
      </PanelContainer>
    </SearchPanelContext>
  );
});

SearchPanel.displayName = "SearchPanel";
export default SearchPanel;
