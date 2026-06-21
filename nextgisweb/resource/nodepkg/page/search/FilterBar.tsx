import { sortBy } from "lodash-es";
import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useState } from "react";

import type { UserReadBrief } from "@nextgisweb/auth/type/api";
import { Select } from "@nextgisweb/gui/antd";
import type { SelectProps } from "@nextgisweb/gui/antd";
import { isAbortError } from "@nextgisweb/gui/error";
import { useAbortController } from "@nextgisweb/pyramid/hook/useAbortController";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { resources } from "@nextgisweb/resource/blueprint";
import { ResourceSelect } from "@nextgisweb/resource/component/resource-select";
import type { ResourceCls } from "@nextgisweb/resource/type/api";

import type { ResourceSearchStore } from "./ResourceSearchStore";

const msgTypes = gettext("All resource types");
const msgOwners = gettext("All owners");
const msgRoot = gettext("Root resource");

const clsSelectOptions = sortBy(
  Object.entries(resources)
    .filter(([cls]) => cls !== "resource")
    .map(([cls, info]) => ({
      value: cls,
      label: info.label,
      order: info.order,
    })),
  ["order", "label"]
) satisfies SelectProps["options"];

export const FilterBar = observer<{ store: ResourceSearchStore }>(
  ({ store }) => {
    const { makeSignal } = useAbortController();
    const [users, setUsers] = useState<UserReadBrief[] | null>(null);

    useEffect(() => {
      let cancelled = false;
      (async () => {
        try {
          const data = await store.loadUsers(makeSignal());
          if (!cancelled) setUsers(data);
        } catch (err) {
          if (!cancelled) {
            if (!isAbortError(err)) {
              console.warn("Failed to load owners filter:", err);
            }
            setUsers([]);
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [makeSignal, store]);

    const ownerOptions = useMemo(() => {
      if (!users) return [];
      return users
        .map((u) => ({ value: u.id, label: u.display_name }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }, [users]);

    return (
      <div className="ngw-resource-search-filter-bar">
        <Select
          style={{ minWidth: 200, flex: 1 }}
          mode="multiple"
          allowClear
          placeholder={msgTypes}
          options={clsSelectOptions}
          value={store.clsIn}
          maxTagCount="responsive"
          onChange={(values) => store.setTypes(values as ResourceCls[])}
        />
        <Select
          style={{ minWidth: 200, flex: 1 }}
          mode="multiple"
          allowClear
          placeholder={msgOwners}
          options={ownerOptions}
          value={store.ownerUserIn}
          maxTagCount="responsive"
          showSearch={false}
          loading={users === null}
          onChange={(values) => store.setOwners(values as number[])}
        />
        <div className="root">
          <ResourceSelect
            style={{ minWidth: 160 }}
            placeholder={msgRoot}
            value={store.root ?? undefined}
            allowClear
            hideGoto
            pickerOptions={{
              initParentId: store.root ?? 0,
              traverseClasses: ["resource_group"],
            }}
            onChange={(value) => {
              store.setRoot(typeof value === "number" ? value : null);
            }}
          />
        </div>
      </div>
    );
  }
);

FilterBar.displayName = "FilterBar";
