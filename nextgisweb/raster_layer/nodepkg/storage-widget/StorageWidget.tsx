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

/** Fake select component for storage type
 *
 * Just to let a user know that AWS S3 is the only supported storage type for
 * now, but more types may be added in the future.
 * */
function FakeTypeSelect() {
  return (
    <Select
      style={{ width: "100%" }}
      value="s3"
      options={[{ value: "s3", label: "AWS S3" }]}
    />
  );
}

export const StorageWidget: EditorWidget<StorageStore> = observer(
  ({ store }) => {
    return (
      <Area pad>
        <Lot label={gettext("Type")}>
          <FakeTypeSelect />
        </Lot>
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
          label={gettext("Public access")}
          value={store.no_sign_request}
          component={CheckboxValue}
        />
        <LotMV
          label={gettext("Access key")}
          value={store.access_key}
          component={InputValue}
          visible={!store.no_sign_request.value}
        />
        <LotMV
          label={gettext("Secret key")}
          value={store.secret_key}
          component={PasswordValue}
          props={{
            visibilityToggle: false,
            autoComplete: "new-password",
          }}
          visible={!store.no_sign_request.value}
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
