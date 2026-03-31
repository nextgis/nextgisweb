import { observer } from "mobx-react-lite";

import { InputValue, PasswordValue } from "@nextgisweb/gui/antd";
import { LotMV } from "@nextgisweb/gui/arm";
import { Area } from "@nextgisweb/gui/mayout";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { EditorWidget } from "@nextgisweb/resource/type";

import type { StorageStore } from "./StorageStore";

export const StorageWidget: EditorWidget<StorageStore> = observer(
  ({ store }) => {
    return (
      <Area pad>
        <LotMV
          label={gettext("Endpoint")}
          value={store.endpoint}
          component={InputValue}
        />
        <LotMV
          label={gettext("Bucket")}
          value={store.bucket}
          component={InputValue}
        />
        <LotMV
          label={gettext("Access key")}
          value={store.access_key}
          component={InputValue}
        />
        <LotMV
          label={gettext("Secret key")}
          value={store.secret_key}
          component={PasswordValue}
          props={{
            visibilityToggle: false,
            autoComplete: "new-password",
          }}
        />
        <LotMV
          label={gettext("Prefix")}
          value={store.prefix}
          component={InputValue}
        />
      </Area>
    );
  }
);

StorageWidget.displayName = "StorageWidget";
StorageWidget.title = gettext("Raster layer storage");
StorageWidget.activateOn = { create: true };
StorageWidget.order = -50;
