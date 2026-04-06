import { observer } from "mobx-react-lite";

import { FileUploader } from "@nextgisweb/file-upload/file-uploader";
import { CheckboxValue, Tooltip } from "@nextgisweb/gui/antd";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ResourceSelectRef } from "@nextgisweb/resource/component";
import type { EditorWidget as IEditorWidget } from "@nextgisweb/resource/type";

import settings from "../client-settings";

import type { EditorStore } from "./EditorStore";

import ExperimentalIcon from "@nextgisweb/icon/material/science";

/* prettier-ignore */ const
msgSelectDataset = gettext("Select a dataset"),
msgStorage = gettext("Raster layer storage"),
msgExperimental = gettext("External storage support is an experimental feature. Use it with caution!"),
msgCog = gettext("Cloud Optimized GeoTIFF (COG)");

export const EditorWidget: IEditorWidget<EditorStore> = observer(
  ({ store }) => {
    const isCreate = store.composite.operation === "create";
    return (
      <Area pad>
        <Lot label={false}>
          <FileUploader
            onChange={(value) => store.update({ source: value })}
            onUploading={(value) => store.update({ uploading: value })}
            multiple={false}
            uploadText={msgSelectDataset}
            helpText={settings.msgSupportedFormats}
          />
        </Lot>
        {(isCreate || store.storageInitial) && (
          <Lot
            label={
              <>
                {msgStorage}{" "}
                <Tooltip title={msgExperimental}>
                  <ExperimentalIcon />
                </Tooltip>
              </>
            }
          >
            <ResourceSelectRef
              value={store.storage}
              readOnly={!!store.storageInitial}
              allowClear
              pickerOptions={{
                requireClass: "raster_layer_storage",
                initParentId: store.composite.parent,
              }}
              onChange={(v) => store.update({ storage: v })}
            />
          </Lot>
        )}
        {!store.storage && (
          <Lot label={false}>
            <CheckboxValue
              value={store.cog}
              onChange={(v) => store.update({ cog: v })}
            >
              {msgCog}
            </CheckboxValue>
          </Lot>
        )}
      </Area>
    );
  }
);

EditorWidget.displayName = "EditorWidget";
EditorWidget.title = gettext("Raster layer");
EditorWidget.activateOn = { create: true };
EditorWidget.order = -50;
