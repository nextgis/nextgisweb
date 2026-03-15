import { observer } from "mobx-react-lite";

import { FileUploader } from "@nextgisweb/file-upload/file-uploader";
import { CheckboxValue } from "@nextgisweb/gui/antd";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ResourceSelectRef } from "@nextgisweb/resource/component";
import type { EditorWidget as IEditorWidget } from "@nextgisweb/resource/type";

import type { EditorStore } from "./EditorStore";

/* prettier-ignore */ const
msgSelectDataset = gettext("Select a dataset"),
msgSupportedFormats = gettext("Supported formats: GeoTIFF, JPEG, and PNG with GDAL PAM metadata (.aux.xml files). Multi-file datasets should be uploaded as ZIP archives."),
msgStorage = gettext("Storage"),
msgCog = gettext("Cloud Optimized GeoTIFF (COG)");

export const EditorWidget: IEditorWidget<EditorStore> = observer(
  ({ store }) => {
    const isCreate = store.composite.operation === "create";
    return (
      <Area pad>
        {isCreate && (
          <Lot label={msgStorage}>
            <ResourceSelectRef
              value={store.storage}
              onChange={(v) => store.update({ storage: v })}
              pickerOptions={{
                requireClass: "raster_layer_storage",
                initParentId: store.composite.parent,
              }}
              style={{ width: "100%" }}
              allowClear
            />
          </Lot>
        )}
        <Lot label={false}>
          <FileUploader
            onChange={(value) => store.update({ source: value })}
            onUploading={(value) => store.update({ uploading: value })}
            multiple={false}
            uploadText={msgSelectDataset}
            helpText={msgSupportedFormats}
            showMaxSize
          />
        </Lot>
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
