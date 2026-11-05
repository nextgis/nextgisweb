import { observer } from "mobx-react-lite";

import {
  CheckboxValue,
  InputValue,
  PasswordValue,
  Select,
} from "@nextgisweb/gui/antd";
import { LotMV } from "@nextgisweb/gui/arm";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { EditorWidget } from "@nextgisweb/resource/type";

import type { StorageStore } from "./StorageStore";

export const StorageWidget: EditorWidget<StorageStore> = observer(
  ({ store }) => {
    const isCreate = store.composite.operation === "create";

    return (
      <Area pad>
        <Lot label={gettext("Type")}>
          <Select
            style={{ width: "100%" }}
            value={store.kind.value}
            options={[
              { value: "s3", label: "AWS S3" },
              { value: "gcp", label: "Google Cloud Storage" },
              { value: "http", label: "HTTP" },
            ]}
            disabled={!isCreate}
            onChange={(v) => store.kind.load(v)}
          />
        </Lot>
        <LotMV
          label={gettext("Endpoint")}
          value={store.endpoint}
          component={InputValue}
          visible={store.kind.value !== "gcp"}
        />
        <LotMV
          label={gettext("Bucket")}
          value={store.bucket}
          component={InputValue}
          visible={store.kind.value !== "http"}
        />
        <LotMV
          label={gettext("Public access")}
          value={store.no_sign_request}
          component={CheckboxValue}
          visible={store.kind.value !== "http"}
        />
        <LotMV
          label={gettext("Access key")}
          value={store.access_key}
          component={InputValue}
          visible={store.kind.value !== "http" && !store.no_sign_request.value}
        />
        <LotMV
          label={gettext("Secret key")}
          value={store.secret_key}
          component={PasswordValue}
          props={{
            visibilityToggle: false,
            autoComplete: "new-password",
          }}
          visible={store.kind.value !== "http" && !store.no_sign_request.value}
        />
        <LotMV
          label={gettext("Prefix")}
          value={store.prefix}
          component={InputValue}
          visible={store.kind.value !== "http"}
        />
      </Area>
    );
  }
);

StorageWidget.displayName = "StorageWidget";
StorageWidget.title = gettext("Raster layer storage");
StorageWidget.activateOn = { create: true, update: true };
StorageWidget.order = -50;
