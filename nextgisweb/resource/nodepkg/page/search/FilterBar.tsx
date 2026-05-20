import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useState } from "react";

import type { UserReadBrief } from "@nextgisweb/auth/type/api";
import { Select } from "@nextgisweb/gui/antd";
import { isAbortError } from "@nextgisweb/gui/error";
import { useAbortController } from "@nextgisweb/pyramid/hook/useAbortController";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { resources } from "@nextgisweb/resource/blueprint";
import { ResourceSelect } from "@nextgisweb/resource/component/resource-select";
import type {
  BlueprintResource,
  ResourceCls,
} from "@nextgisweb/resource/type/api";

import type { ResourceSearchStore } from "./ResourceSearchStore";

const msgTypes = gettext("All resource types");
const msgOwners = gettext("All owners");
const msgRoot = gettext("Root resource");

export const FilterBar = observer(function FilterBar({
  store,
}: {
  store: ResourceSearchStore;
}) {
  const { makeSignal } = useAbortController();
  const [users, setUsers] = useState<UserReadBrief[] | null>(null);

  const typeOptions = useMemo(
    () =>
      Object.entries(resources as Record<ResourceCls, BlueprintResource>)
        .map(([cls, info]) => ({
          value: cls as ResourceCls,
          label: info.label,
          order: info.order ?? 0,
        }))
        .sort((a, b) =>
          a.order !== b.order
            ? a.order - b.order
            : a.label.localeCompare(b.label)
        ),
    []
  );

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
        mode="multiple"
        allowClear
        style={{ minWidth: 200, flex: 1 }}
        placeholder={msgTypes}
        options={typeOptions}
        value={store.clsIn}
        onChange={(values) => store.setTypes(values as ResourceCls[])}
        maxTagCount="responsive"
        showSearch={false}
      />
      <Select
        mode="multiple"
        allowClear
        style={{ minWidth: 200, flex: 1 }}
        placeholder={msgOwners}
        options={ownerOptions}
        value={store.ownerUserIn}
        onChange={(values) => store.setOwners(values as number[])}
        maxTagCount="responsive"
        showSearch={false}
        loading={users === null}
      />
      <div className="root">
        <ResourceSelect
          placeholder={msgRoot}
          value={store.root ?? undefined}
          onChange={(value) => {
            store.setRoot(typeof value === "number" ? value : null);
          }}
          style={{ minWidth: 160 }}
          allowClear
          hideGoto
          pickerOptions={{
            initParentId: store.root ?? 0,
            traverseClasses: ["resource_group"],
          }}
        />
      </div>
    </div>
  );
});

FilterBar.displayName = "FilterBar";
