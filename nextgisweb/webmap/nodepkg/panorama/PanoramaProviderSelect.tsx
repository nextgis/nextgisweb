import { observer } from "mobx-react-lite";

import { Select } from "@nextgisweb/gui/antd";
import type { SelectProps } from "@nextgisweb/gui/antd";

import type { PanoramaStore } from "./PanoramaStore";
import { configuredProviders as providers } from "./client-settings";
import type { PanoramaProviderIdentity } from "./type";

interface PanoramaProviderSelectProps extends Omit<
  SelectProps<PanoramaProviderIdentity>,
  "value" | "onChange" | "options"
> {
  store: PanoramaStore;
}

export const PanoramaProviderSelect = observer(
  ({ store, ...props }: PanoramaProviderSelectProps) => {
    if (providers.length < 2) return providers[0]?.title ?? null;

    return (
      <Select<PanoramaProviderIdentity>
        value={store.provider}
        onChange={store.setProvider}
        options={providers.map((p) => ({
          value: p.identity,
          label: p.title,
        }))}
        popupMatchSelectWidth={false}
        {...props}
      />
    );
  }
);

PanoramaProviderSelect.displayName = "PanoramaProviderSelect";
