import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";

import { Alert, Badge, Button, Input, Tooltip } from "@nextgisweb/gui/antd";
import { SearchIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { PageTitle } from "@nextgisweb/pyramid/layout";

import { FilterBar } from "./FilterBar";
import { KeynameFilter } from "./KeynameFilter";
import { MetadataFilter } from "./MetadataFilter";
import { ResourceSearchStore } from "./ResourceSearchStore";
import { ResultsTable } from "./ResultsTable";

import SettingsIcon from "@nextgisweb/icon/material/tune";

import "./ResourceSearchPage.less";

const msgSearch = gettext("Search");
const msgPlaceholder = gettext("Filter by display name");
const msgToggleSettings = gettext("Advanced filters");
const msgFound = gettext("Found");

const ResourceSearchPageBody = observer(function ResourceSearchPageBody({
  store,
}: {
  store: ResourceSearchStore;
}) {
  const submit = () => {
    if (store.hasMetaErrors()) return;
    void store.applyFilters();
  };

  return (
    <>
      <PageTitle pullRight>
        {store.totalCount > 0 && (
          <span style={{ marginRight: 8, color: "var(--text-secondary)" }}>
            {msgFound}:{" "}
            <Badge
              style={{ backgroundColor: "#076dbf" }}
              count={store.totalCount}
              overflowCount={99999}
            />
          </span>
        )}
      </PageTitle>
      <div className="ngw-resource-search-page">
        <FilterBar store={store} />

        {store.settingsVisible && (
          <div className="settings">
            <MetadataFilter store={store} />
            <KeynameFilter store={store} />
          </div>
        )}

        <div className="search-row">
          <Input
            value={store.q}
            onChange={(e) => store.setSearchText(e.target.value)}
            onPressEnter={submit}
            placeholder={msgPlaceholder}
            allowClear
          />
          <Button type="primary" icon={<SearchIcon />} onClick={submit}>
            {msgSearch}
          </Button>
          <Tooltip title={msgToggleSettings}>
            <Button
              type={store.settingsVisible ? "primary" : "default"}
              icon={<SettingsIcon />}
              onClick={store.toggleSettings}
            />
          </Tooltip>
        </div>

        {store.error && (
          <Alert type="error" title={store.error} showIcon closable />
        )}

        <ResultsTable store={store} />
      </div>
    </>
  );
});

function ResourceSearchPage() {
  const [store] = useState(() => new ResourceSearchStore());

  useEffect(() => {
    return () => {
      store.destroy();
    };
  }, [store]);

  return <ResourceSearchPageBody store={store} />;
}

ResourceSearchPage.targetElementId = "main";

export default ResourceSearchPage;
