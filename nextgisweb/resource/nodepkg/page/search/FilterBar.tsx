import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useState } from "react";

import type { UserReadBrief } from "@nextgisweb/auth/type/api";
import { Button, Input, Select, Tooltip } from "@nextgisweb/gui/antd";
import { route } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook/useAbortController";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { resources } from "@nextgisweb/resource/blueprint";
import { useResourcePicker } from "@nextgisweb/resource/component/resource-picker";
import type { ResourceCls } from "@nextgisweb/resource/type/api";

import type { ResourceSearchStore } from "./ResourceSearchStore";

const msgTypes = gettext("All resource types");
const msgOwners = gettext("All owners");
const msgRoot = gettext("Root resource");
const msgPickRoot = gettext("Choose root");
const msgClearRoot = gettext("Clear");

export const FilterBar = observer(function FilterBar({
  store,
}: {
  store: ResourceSearchStore;
}) {
  const { makeSignal } = useAbortController();
  const [users, setUsers] = useState<UserReadBrief[] | null>(null);
  const [rootName, setRootName] = useState<string>("");

  const typeOptions = useMemo(
    () =>
      Object.entries(resources)
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
      } catch {
        if (!cancelled) setUsers([]);
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

  useEffect(() => {
    let cancelled = false;
    if (store.root === null) {
      setRootName("");
      return;
    }
    (async () => {
      try {
        const item = await route("resource.item", store.root!).get({
          signal: makeSignal(),
        });
        if (!cancelled) {
          setRootName(item.resource?.display_name ?? String(store.root));
        }
      } catch {
        if (!cancelled) setRootName(String(store.root));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [store.root, makeSignal]);

  const { showResourcePicker } = useResourcePicker();

  const pickRoot = () => {
    showResourcePicker({
      pickerOptions: {
        initParentId: store.root ?? 0,
        traverseClasses: ["resource_group"],
      },
      onSelect: (id: number | number[]) => {
        store.setRoot(typeof id === "number" ? id : (id[0] ?? null));
      },
    });
  };

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
        <Input
          readOnly
          placeholder={msgRoot}
          value={rootName}
          onClick={pickRoot}
          style={{ cursor: "pointer", minWidth: 160 }}
          allowClear
          onChange={(e) => {
            if (e.target.value === "") store.setRoot(null);
          }}
        />
        <Tooltip title={msgPickRoot}>
          <Button onClick={pickRoot}>…</Button>
        </Tooltip>
        {store.root !== null && (
          <Tooltip title={msgClearRoot}>
            <Button onClick={() => store.setRoot(null)}>×</Button>
          </Tooltip>
        )}
      </div>
    </div>
  );
});
