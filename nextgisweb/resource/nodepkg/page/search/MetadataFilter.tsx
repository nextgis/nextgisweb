import { observer } from "mobx-react-lite";

import { Button, Input, Tooltip } from "@nextgisweb/gui/antd";
import { AddIcon, RemoveIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { ResourceSearchStore } from "./ResourceSearchStore";

import "./MetadataFilter.less";

const msgTitle = gettext("Metadata");
const msgKey = gettext("Key");
const msgValue = gettext("Value");
const msgAdd = gettext("Add metadata filter");
const msgRemove = gettext("Remove");
const msgDuplicate = gettext("Duplicate key");

export const MetadataFilter = observer(function MetadataFilter({
  store,
}: {
  store: ResourceSearchStore;
}) {
  const dupes = store.duplicateMetaKeys();
  return (
    <div className="ngw-resource-search-metadata-filter">
      <div className="head">
        <span className="label">{msgTitle}</span>
        <Tooltip title={msgAdd}>
          <Button
            size="small"
            type="text"
            icon={<AddIcon />}
            onClick={store.addMetaFilter}
          />
        </Tooltip>
      </div>
      {store.metaFilters.length > 0 && (
        <div className="entries">
          {store.metaFilters.map((entry, i) => {
            const dupe = !!entry.key.trim() && dupes.has(entry.key.trim());
            return (
              <div className="entry" key={i}>
                <Input
                  placeholder={msgKey}
                  value={entry.key}
                  status={dupe ? "error" : undefined}
                  onChange={(e) =>
                    store.updateMetaFilter(i, { key: e.target.value })
                  }
                  title={dupe ? msgDuplicate : undefined}
                />
                <Input
                  placeholder={msgValue}
                  value={entry.value}
                  onChange={(e) =>
                    store.updateMetaFilter(i, { value: e.target.value })
                  }
                />
                <Button
                  type="text"
                  icon={<RemoveIcon />}
                  title={msgRemove}
                  onClick={() => store.removeMetaFilter(i)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
