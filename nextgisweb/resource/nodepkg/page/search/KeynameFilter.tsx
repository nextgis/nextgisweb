import { observer } from "mobx-react-lite";

import { Select } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { ResourceSearchStore } from "./ResourceSearchStore";

const msgTitle = gettext("Keynames");
const msgPlaceholder = gettext("Enter one or more keynames");

export const KeynameFilter = observer(function KeynameFilter({
  store,
}: {
  store: ResourceSearchStore;
}) {
  return (
    <div className="ngw-resource-search-keyname-filter">
      <div style={{ fontWeight: 500, marginBottom: 6 }}>{msgTitle}</div>
      <Select
        mode="tags"
        style={{ width: "100%" }}
        placeholder={msgPlaceholder}
        value={store.keynameIn}
        onChange={(values) => store.setKeynames(values as string[])}
        tokenSeparators={[",", " "]}
      />
    </div>
  );
});
