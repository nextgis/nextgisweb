import { observer } from "mobx-react-lite";
import { useCallback, useRef, useState } from "react";

import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import { Button, Modal, Select, Space } from "@nextgisweb/gui/antd";
import { CsvImporterModal } from "@nextgisweb/gui/csv-importer";
import {
  EdiTable,
  EdiTableKeyInput,
  EdiTableValueInput,
} from "@nextgisweb/gui/edi-table";
import type { EdiTableColumn } from "@nextgisweb/gui/edi-table";
import { ClearIcon, ExportIcon, ImportIcon } from "@nextgisweb/gui/icon";
import type { LookupTableRead } from "@nextgisweb/lookup-table/type/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { EditorWidget as IEditorWidget } from "@nextgisweb/resource/type";

import type { EditorStore } from "./EditorStore";
import { exportToCsv, recordsToLookup } from "./util";

import SortIcon from "@nextgisweb/icon/material/swap_vert";
import ReorderIcon from "@nextgisweb/icon/material/sync";

import "./EditorWidget.less";

/* prettier-ignore */ const
msgExport = gettext("Export"),
msgImport = gettext("Import"),
msgSort = gettext("Sort order"),
msgResort = gettext("Resort rows"),
msgClear = gettext("Clear"),
msgConfirmNewImport = gettext("All existing records will be deleted after import. Are you sure you want to proceed?"),
msgConfirmCancelImport = gettext("All progress will be lost. Are you sure you want to cancel import?");

type RowType = EditorStore["items"][number];

const columns: EdiTableColumn<RowType>[] = [
  {
    key: "key",
    title: gettext("Key"),
    width: "25%",
    component: EdiTableKeyInput,
  },
  {
    key: "value",
    title: gettext("Value"),
    width: "75%",
    component: EdiTableValueInput,
  },
];

const sortSelectOptions: {
  value: LookupTableRead["sort"];
  label: string;
}[] = [
  { value: "KEY_ASC", label: gettext("Key, ascending") },
  { value: "KEY_DESC", label: gettext("Key, descending") },
  { value: "VALUE_ASC", label: gettext("Value, ascending") },
  { value: "VALUE_DESC", label: gettext("Value, descending") },
  { value: "CUSTOM", label: gettext("Custom") },
];

const importerTargetColumns = [
  { key: "key", label: gettext("Key"), aliases: ["key", "k"] },
  { key: "value", label: gettext("Value"), aliases: ["value", "val"] },
];

export const EditorWidget: IEditorWidget<EditorStore> = observer(
  ({ store }) => {
    const [modal, contextHolder] = Modal.useModal();
    const [isImpModalOpen, setIsImpModalOpen] = useState(false);
    const [impResetActionCount, setImpResetActionCount] = useState(0);

    const importDone = useRef(false);
    const importStarted = useRef(false);

    const exportLookup = useCallback(() => {
      exportToCsv([{ key: "Key", value: "Value" }, ...store.items]);
    }, [store.items]);

    const handleImportClick = useCallback(async () => {
      if (store.items.length && !importStarted.current) {
        const confirmed = await modal.confirm({ content: msgConfirmNewImport });
        if (!confirmed) return;
      }
      importDone.current = false;
      importStarted.current = true;
      setIsImpModalOpen(true);
    }, [modal, store.items.length]);

    const handleImpModalOnCancel = useCallback(() => {
      setIsImpModalOpen(false);
    }, []);

    const handleImport = useCallback(
      (rows: Record<string, string>[]) => {
        store.load({
          items: recordsToLookup(
            rows.map((r) => ({ key: r.key || "", value: r.value || "" }))
          ),
          order: [],
          sort: "CUSTOM",
        });
        importDone.current = true;
        importStarted.current = false;
        store.setDirty(true);
        setImpResetActionCount(impResetActionCount + 1);
      },
      [store, impResetActionCount]
    );

    const handleImpClose = useCallback(async () => {
      if (!importDone.current) {
        const confirmed = await modal.confirm({
          content: msgConfirmCancelImport,
        });
        if (!confirmed) return;
      }

      importStarted.current = false;
      setIsImpModalOpen(false);
      setImpResetActionCount(impResetActionCount + 1);
    }, [modal, impResetActionCount]);

    const { sort, setSort, isSorted } = store;

    return (
      <div className="ngw-lookup-table-editor">
        {contextHolder}
        <ActionToolbar
          pad
          borderBlockEnd
          actions={[
            () => (
              <Button icon={<ImportIcon />} onClick={handleImportClick}>
                {msgImport}
              </Button>
            ),
            {
              icon: <ExportIcon />,
              title: msgExport,
              onClick: exportLookup,
            },
            () => (
              <Space.Compact>
                <Select
                  prefix={<SortIcon />}
                  title={msgSort}
                  options={sortSelectOptions}
                  popupMatchSelectWidth={false}
                  value={sort}
                  onChange={setSort}
                />
                {!isSorted && (
                  <Button
                    icon={<ReorderIcon />}
                    title={msgResort}
                    onClick={() => setSort()}
                  />
                )}
              </Space.Compact>
            ),
          ]}
          rightActions={[
            {
              title: msgClear,
              icon: <ClearIcon />,
              danger: true,
              disabled: !store.items.length,
              onClick: store.clear,
            },
          ]}
        />
        <EdiTable store={store} columns={columns} rowKey="id" parentHeight />
        <CsvImporterModal
          key={impResetActionCount}
          open={isImpModalOpen}
          targetColumns={importerTargetColumns}
          onSubmit={handleImport}
          close={handleImpClose}
          onCancel={handleImpModalOnCancel}
        />
      </div>
    );
  }
);

EditorWidget.displayName = "EditorWidget";
EditorWidget.title = gettext("Lookup table");
EditorWidget.activateOn = { update: true };
EditorWidget.order = -50;
