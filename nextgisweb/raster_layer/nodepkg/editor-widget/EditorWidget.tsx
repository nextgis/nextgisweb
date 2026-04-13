import { observer } from "mobx-react-lite";
import { useMemo } from "react";

import { FileUploader } from "@nextgisweb/file-upload/file-uploader";
import { CheckboxValue, Input, Select, Tooltip } from "@nextgisweb/gui/antd";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ResourceSelectRef } from "@nextgisweb/resource/component";
import type { EditorWidget as IEditorWidget } from "@nextgisweb/resource/type";

import settings from "../client-settings";

import type { EditorStore, Mode } from "./EditorStore";

import ExperimentalIcon from "@nextgisweb/icon/material/science";

/* prettier-ignore */ const
msgSelectDataset = gettext("Select a dataset"),
msgStorage = gettext("Raster layer storage"),
msgExperimental = gettext("External storage support is an experimental feature. Use it with caution!"),
msgStorageFilename = gettext("Storage filename"),
msgCog = gettext("Cloud Optimized GeoTIFF (COG)"),
msgUploadRaster = gettext("Upload raster"),
msgAttachFromStorage = gettext("Attach raster from storage"),
msgKeepExisting = gettext("Keep existing raster");

export const EditorWidget: IEditorWidget<EditorStore> = observer(
  ({ store }) => {
    const isCreate = store.composite.operation === "create";
    const { mode, storage, storageInitial } = store;

    const modeOpts = useMemo(() => {
      const opts: { value: Mode; label: string }[] = [];
      if (!isCreate) opts.push({ value: "keep", label: msgKeepExisting });
      opts.push({ value: "upload", label: msgUploadRaster });
      if (isCreate || storageInitial) {
        opts.push({ value: "storage", label: msgAttachFromStorage });
      }
      return opts;
    }, [isCreate, storageInitial]);

    const storageLabel = (
      <>
        {msgStorage}{" "}
        <Tooltip title={msgExperimental}>
          <ExperimentalIcon />
        </Tooltip>
      </>
    );

    const storageField = (readOnly: boolean, allowClear: boolean) => (
      <Lot label={storageLabel}>
        <ResourceSelectRef
          value={storage}
          readOnly={readOnly}
          allowClear={allowClear}
          pickerOptions={{
            requireClass: "raster_layer_storage",
            initParentId: store.composite.parent,
          }}
          onChange={(v) => store.update({ storage: v })}
        />
      </Lot>
    );

    return (
      <Area pad>
        {modeOpts.length > 1 && (
          <Lot label={false}>
            <Select
              options={modeOpts}
              value={mode}
              onChange={(v) => store.update({ mode: v })}
              style={{ width: "100%" }}
            />
          </Lot>
        )}

        {mode === "storage" && (
          <>
            {storageField(!isCreate, isCreate)}
            <Lot label={msgStorageFilename}>
              <Input
                value={store.storageFilename}
                placeholder={"path/to/file.tif"}
                onChange={(e) =>
                  store.update({ storageFilename: e.target.value })
                }
              />
            </Lot>
          </>
        )}

        {mode === "upload" && (
          <>
            <Lot label={false}>
              <FileUploader
                onChange={(value) => store.update({ source: value })}
                onUploading={(value) => store.update({ uploading: value })}
                multiple={false}
                uploadText={msgSelectDataset}
                helpText={settings.msgSupportedFormats}
              />
            </Lot>
            {(isCreate || storageInitial) &&
              storageField(!!storageInitial, !storageInitial)}
            {!storage && (
              <Lot label={false}>
                <CheckboxValue
                  value={store.cog}
                  onChange={(v) => store.update({ cog: v })}
                >
                  {msgCog}
                </CheckboxValue>
              </Lot>
            )}
          </>
        )}

        {mode === "keep" && (
          <>
            {storageInitial && storageField(true, false)}
            {!storageInitial && (
              <Lot label={false}>
                <CheckboxValue
                  value={store.cog}
                  onChange={(v) => store.update({ cog: v })}
                >
                  {msgCog}
                </CheckboxValue>
              </Lot>
            )}
          </>
        )}
      </Area>
    );
  }
);

EditorWidget.displayName = "EditorWidget";
EditorWidget.title = gettext("Raster layer");
EditorWidget.activateOn = { create: true };
EditorWidget.order = -50;
