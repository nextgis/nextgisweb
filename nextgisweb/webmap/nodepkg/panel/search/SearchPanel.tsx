import { observer } from "mobx-react-lite";
import { createContext, use, useState } from "react";
import type { ChangeEvent, MouseEvent, ReactNode } from "react";

import { Alert, Input, Spin } from "@nextgisweb/gui/antd";
import { useDebounce } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { AbortControllerHelper } from "@nextgisweb/pyramid/util/abort";

import { PanelContainer, PanelTitle } from "../component";
import type { PanelTitleProps } from "../component";
import type { PanelPluginWidgetProps } from "../registry";

import type { SearchResult } from "./type";
import { search } from "./util/search";

import IdentifyIcon from "@nextgisweb/icon/material/arrow_selector_tool";
import BackspaceIcon from "@nextgisweb/icon/material/backspace";
import LayersIcon from "@nextgisweb/icon/material/layers";
import LocationOnIcon from "@nextgisweb/icon/material/location_on";
import PublicIcon from "@nextgisweb/icon/material/public";

import "./SearchPanel.less";

const SearchPanelContext = createContext<any>(null);
SearchPanelContext.displayName = "SearchPanelContext";

function SearchPanelTitle({ className, close }: PanelTitleProps) {
  const { searchText, searchChange, clearSearchText } = use(SearchPanelContext);
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
      <PanelTitle.ButtonClose close={close} />
    </div>
  );
}

const SearchPanel = observer<PanelPluginWidgetProps>(({ store, display }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<
    [SearchResult[], boolean] | undefined
  >(undefined);
  const [resultSelected, setResultSelected] = useState<
    SearchResult | undefined
  >(undefined);
  const [searchText, setSearchText] = useState<string | undefined>(undefined);
  const [searchController, setSearchController] = useState<
    AbortControllerHelper | undefined
  >(undefined);

  const clearResults = () => {
    if (searchController) {
      searchController.abort();
      setSearchController(undefined);
    }
    setSearchResults(undefined);
    setLoading(false);
  };

  const _search = useDebounce(async (searchText: string) => {
    clearResults();
    setLoading(true);
    const controller = new AbortControllerHelper();
    setSearchController(controller);
    const results = await search(searchText, controller, display);
    setSearchResults(results);
    setLoading(false);
  }, 1000);

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

  const selectResult = (resultInfo: SearchResult) => {
    setResultSelected(resultInfo);

    display.map.zoomToGeom(resultInfo.geometry);

    display.highlighter.highlight({ geom: resultInfo.geometry });
  };

  const onIdentifyIconClick = (
    e: MouseEvent<HTMLElement>,
    resultInfo: SearchResult
  ) => {
    e.stopPropagation();
    const { resourceId, featureId } = resultInfo;
    if (resourceId !== undefined && featureId !== undefined) {
      display.identify.identifyFeatureByAttrValue(resourceId, "id", featureId);
    }
  };

  const makeResult = (resultInfo: SearchResult) => {
    const isSelected = resultSelected && resultSelected.key === resultInfo.key;

    let resultSourceIcon = <PublicIcon />;
    if (resultInfo.type === "public") {
      resultSourceIcon = <PublicIcon />;
    } else if (resultInfo.type === "place") {
      resultSourceIcon = <LocationOnIcon />;
    } else if (resultInfo.type === "layers") {
      resultSourceIcon = <LayersIcon />;
    }

    return (
      <div
        className={`result ${isSelected ? "selected" : ""}`}
        key={resultInfo.key}
        onClick={() => selectResult(resultInfo)}
      >
        <span>
          {resultInfo.label}
          {resultInfo.identifiable ? (
            <span
              className="identify-icon"
              title={gettext("Identify object")}
              onClick={(e) => onIdentifyIconClick(e, resultInfo)}
            >
              <span className="identify-icon-default">{resultSourceIcon}</span>
              <span className="identify-icon-hover">
                <IdentifyIcon />
              </span>
            </span>
          ) : (
            resultSourceIcon
          )}
        </span>
      </div>
    );
  };

  let results: ReactNode = null;
  let info: ReactNode = null;
  if (searchResults && !loading) {
    const [resultsInfo, isExceeded] = searchResults;
    results = resultsInfo.map((r) => makeResult(r));
    if (resultsInfo.length === 0) {
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
    results = <Spin className="loading" style={{ fontSize: 30 }} />;
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
