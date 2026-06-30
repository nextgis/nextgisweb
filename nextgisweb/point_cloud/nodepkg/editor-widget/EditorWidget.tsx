import { observer } from "mobx-react-lite";
import { useCallback, useMemo } from "react";

import { FileUploader } from "@nextgisweb/file-upload/file-uploader";
import type { FileMeta } from "@nextgisweb/file-upload/file-uploader/type";
import { Alert, Button, Input, Select } from "@nextgisweb/gui/antd";
import { errorModal, isAbortError } from "@nextgisweb/gui/error";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { EditorWidget as IEditorWidget } from "@nextgisweb/resource/type";
import { SrsSelect } from "@nextgisweb/spatial-ref-sys/srs-select/SrsSelect";

import type { EditorStore, Mode, ValidationState } from "./EditorStore";

// prettier-ignore
const [
  msgSelectDataset,
  msgUpload,
  msgExternalUrl,
  msgKeep,
  msgSourceUrl,
  msgValidateUrl,
  msgManualSrs,
  msgManualSrsHint,
  msgCorsWarning,
  msgValidationFailed,
  msgValidationOk,
] = [
  gettext("Select a dataset"),
  gettext("Upload point cloud"),
  gettext("External URL"),
  gettext("Keep existing source"),
  gettext("Source URL"),
  gettext("Validate URL"),
  gettext("Spatial reference system"),
  gettext("Optional by default. Required if the point cloud source has no detectable CRS."),
  gettext("The remote server did not confirm CORS/range support for browser access. Validation on the server succeeded, but client-side streaming may still fail until CORS headers are fixed."),
  gettext("Validation failed"),
  gettext("Validation succeeded"),
];

const uploadHelpText = ".copc.laz";

async function checkCors(
  url: string,
  signal?: AbortSignal
): Promise<string | null> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
      signal,
    });
    const exposed =
      response.headers.get("Access-Control-Expose-Headers")?.toLowerCase() ??
      "";
    return exposed.includes("content-range") ? null : msgCorsWarning;
  } catch {
    return msgCorsWarning;
  }
}

function validationDescription(validation: ValidationState) {
  const parts = [];
  if (validation.point_count !== undefined && validation.point_count !== null) {
    parts.push(`${gettext("Points")}: ${validation.point_count}`);
  }
  if (
    validation.point_format_id !== undefined &&
    validation.point_format_id !== null
  ) {
    parts.push(`${gettext("PDRF")}: ${validation.point_format_id}`);
  }
  if (validation.epsg !== undefined && validation.epsg !== null) {
    parts.push(`EPSG: ${validation.epsg}`);
  }
  if (validation.srs_required) {
    parts.push(gettext("Manual SRS is required."));
  }
  return parts.join(" | ");
}

export const EditorWidget: IEditorWidget<EditorStore> = observer(
  ({ store }) => {
    const isCreate = store.composite.operation === "create";

    const modeOptions = useMemo(() => {
      const options: { value: Mode; label: string }[] = [];
      if (!isCreate) {
        options.push({ value: "keep", label: msgKeep });
      }
      options.push(
        { value: "upload", label: msgUpload },
        { value: "external_url", label: msgExternalUrl }
      );
      return options;
    }, [isCreate]);

    const validateUpload = useCallback(
      async (value: FileMeta[], { signal }: { signal: AbortSignal }) => {
        const fileMeta = value[0];
        if (!fileMeta) {
          return;
        }

        store.setValidating(true);
        try {
          const response = await route("point_cloud.validate").post({
            json: {
              source_type: "upload",
              file_upload: { id: fileMeta.id },
              ...(store.srsId !== null ? { srs: { id: store.srsId } } : {}),
            },
            signal,
          });
          store.setValidation(response);
        } catch (err) {
          store.setValidation(null);
          if (!isAbortError(err)) {
            errorModal(err);
          }
          throw err;
        } finally {
          store.setValidating(false);
        }
      },
      [store]
    );

    const validateUrl = useCallback(async () => {
      if (!store.externalUrl.trim()) return;

      store.setValidating(true);
      try {
        store.setCorsWarning(await checkCors(store.externalUrl));
        const response = await route("point_cloud.validate").post({
          json: {
            source_type: "external_url",
            url: store.externalUrl,
            ...(store.srsId !== null ? { srs: { id: store.srsId } } : {}),
          },
        });
        store.setValidation(response);
      } catch (err) {
        store.setValidation(null);
        errorModal(err);
      } finally {
        store.setValidating(false);
      }
    }, [store]);

    return (
      <Area pad>
        <Lot label={false}>
          <Select
            options={modeOptions}
            value={store.mode}
            onChange={(value) => store.setMode(value)}
            style={{ width: "100%" }}
          />
        </Lot>

        {store.mode === "upload" && (
          <Lot label={false}>
            <FileUploader
              fileMeta={store.source ?? undefined}
              onChange={(meta) => store.setSource(meta ?? null)}
              onUploading={store.setUploading}
              multiple={false}
              afterUpload={[
                {
                  message: gettext("Validate point cloud"),
                  loader: validateUpload,
                },
              ]}
              uploadText={msgSelectDataset}
              helpText={uploadHelpText}
            />
          </Lot>
        )}

        {store.mode === "external_url" && (
          <>
            <Lot label={msgSourceUrl}>
              <Input
                value={store.externalUrl}
                onChange={(e) => store.setExternalUrl(e.target.value)}
                placeholder="https://example.com/data.copc.laz"
              />
            </Lot>
            <Lot label={false}>
              <Button
                type="default"
                onClick={validateUrl}
                loading={store.validating}
                disabled={!store.externalUrl.trim()}
              >
                {msgValidateUrl}
              </Button>
            </Lot>
          </>
        )}

        <Lot label={msgManualSrs}>
          <SrsSelect
            allowClear
            value={store.srsId ?? undefined}
            onChange={(value) => store.setSrsId(value ?? null)}
            style={{ width: "100%" }}
          />
        </Lot>

        <Lot label={false}>
          <Alert
            type={store.validation?.srs_required ? "warning" : "info"}
            message={msgManualSrsHint}
            showIcon
          />
        </Lot>

        {store.corsWarning && (
          <Lot label={false}>
            <Alert type="warning" message={store.corsWarning} showIcon />
          </Lot>
        )}

        {store.validation && (
          <Lot label={false}>
            <Alert
              type={store.validation.is_valid ? "success" : "error"}
              message={
                store.validation.is_valid
                  ? msgValidationOk
                  : msgValidationFailed
              }
              description={
                store.validation.is_valid
                  ? validationDescription(store.validation)
                  : store.validation.reason
              }
              showIcon
            />
          </Lot>
        )}
      </Area>
    );
  }
);

EditorWidget.displayName = "EditorWidget";
EditorWidget.title = gettext("Point cloud");
EditorWidget.activateOn = { create: true };
EditorWidget.order = -50;
