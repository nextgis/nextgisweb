import { lazy, useCallback, useMemo } from "react";

import { useShowModal } from "@nextgisweb/gui";
import { Button, Select, Typography } from "@nextgisweb/gui/antd";
import type { OptionType, SelectProps } from "@nextgisweb/gui/antd";
import { errorModal, isAbortError } from "@nextgisweb/gui/error";
import { gettext } from "@nextgisweb/pyramid/i18n";

const SrsCatalogModalLazy = lazy(() => import("../srs-catalog-modal"));

export interface SrsSelectItem {
  id?: number;
  label: string;
  code?: string;
}

export interface SrsSelectExpandableProps extends Omit<
  SelectProps<number>,
  "options"
> {
  items: SrsSelectItem[] | undefined;
  refresh?: () => Promise<unknown>;
}

const msgAddToWebGIS = gettext("Add to Web GIS");
const msgNoPermission = gettext(
  "Insufficient permissions to add a coordinate system"
);
const msgAddSrs = gettext("Choose or add coordinate system");

const canAdd = ngwConfig.isAdministrator;

function itemToOption(
  { id, label, code }: SrsSelectItem,
  onAdd: (code: string) => void
): OptionType {
  if (id !== undefined) {
    return { value: id, label };
  }
  return {
    value: undefined,
    disabled: true,
    label: (
      <span>
        {label}{" "}
        {code &&
          (canAdd ? (
            <Button
              type="link"
              size="small"
              style={{ padding: 0, height: "auto" }}
              onClick={(e) => {
                e.stopPropagation();
                onAdd(code);
              }}
            >
              {msgAddToWebGIS}
            </Button>
          ) : (
            <Typography.Text type="danger">{msgNoPermission}</Typography.Text>
          ))}
      </span>
    ),
  };
}

export function SrsSelectExpandable({
  items,
  refresh,
  onChange,
  ...rest
}: SrsSelectExpandableProps) {
  const { showModal, modalHolder } = useShowModal();

  const onAdd = useCallback(
    (code: string) => {
      showModal(SrsCatalogModalLazy, {
        initialSearch: code,
        destroyOnHidden: true,
        onImported: async ({ id }) => {
          try {
            await refresh?.();
          } catch (err) {
            if (!isAbortError(err)) errorModal(err);
            return;
          }
          onChange?.(id);
        },
      });
    },
    [refresh, onChange, showModal]
  );

  const options = useMemo(
    () => items?.map((item) => itemToOption(item, onAdd)),
    [items, onAdd]
  );

  return (
    <>
      {modalHolder}
      <Select<number>
        placeholder={items ? msgAddSrs : undefined}
        options={options}
        onChange={onChange}
        {...rest}
      />
    </>
  );
}
