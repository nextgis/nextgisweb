import { Checkbox, Popover, Radio, Select } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import settings from "@nextgisweb/webmap/client-settings";

import { PanelTitle } from "../../component";
import type { SearchSettings } from "../type";

import SettingsIcon from "@nextgisweb/icon/material/tune";

import "./SearchResultPopover.less";

export const DEFAULT_SEARCH_SETTINGS: SearchSettings = {
  usedLayers: "visible",
  sources: {
    geocoder: true,
    coordinates: true,
  },
  navigationMode: "zoom",
};

export interface SearchSettingsPopoverProps {
  value: SearchSettings;
  onChange: (value: SearchSettings) => void;
  availableLayers: { id: number; label: string }[];
}

const msgSettings = gettext("Search settings");
const msgLayers = gettext("Search in layers");
const msgVisible = gettext("In visible");
const msgAll = gettext("In all");
const msgSelected = gettext("In selected");
const msgSelectLayer = gettext("Select layer");
const msgSources = gettext("Search sources");
const msgGeocoder = gettext("Search by address");
const msgCoordinates = gettext("Search by coordinates");
const msgNavigation = gettext("Navigation mode");
const msgZoom = gettext("Zoom");
const msgPan = gettext("Pan");

export function SearchSettingsPopover({
  value,
  onChange,
  availableLayers,
}: SearchSettingsPopoverProps) {
  const update = <K extends keyof SearchSettings>(
    key: K,
    val: SearchSettings[K]
  ) => onChange({ ...value, [key]: val });

  const updateSource = (key: keyof SearchSettings["sources"], val: boolean) =>
    update("sources", { ...value.sources, [key]: val });

  const layerOptions = availableLayers.map(({ id, label }) => ({
    value: id,
    label,
  }));

  const layersMode =
    typeof value.usedLayers === "number" ? "selected" : value.usedLayers;

  const onLayersModeChange = (mode: "all" | "visible" | "selected") => {
    if (mode === "selected") {
      if (availableLayers.length > 0) {
        update("usedLayers", availableLayers[0].id);
      }
    } else {
      update("usedLayers", mode);
    }
  };

  const content = (
    <div className="ngw-search-settings" onClick={(e) => e.stopPropagation()}>
      {availableLayers.length > 0 && (
        <div className="source-layer-block">
          <span>{msgLayers}</span>
          <Radio.Group
            value={layersMode}
            onChange={(e) => onLayersModeChange(e.target.value)}
            className="source-layer-radio"
          >
            <Radio value="visible">{msgVisible}</Radio>
            <Radio value="all">{msgAll}</Radio>
            <Radio value="selected">{msgSelected}</Radio>
          </Radio.Group>
          <Select
            value={
              typeof value.usedLayers === "number"
                ? value.usedLayers
                : undefined
            }
            options={layerOptions}
            onChange={(v) => update("usedLayers", v)}
            disabled={layersMode !== "selected"}
            placeholder={msgSelectLayer}
            showSearch={{ optionFilterProp: "label" }}
          />
        </div>
      )}
      <div className="sources-block">
        <span>{msgSources}</span>
        {settings.address_search_enabled && (
          <Checkbox
            checked={value.sources.geocoder}
            onChange={(e) => updateSource("geocoder", e.target.checked)}
          >
            {msgGeocoder}
          </Checkbox>
        )}
        <Checkbox
          checked={value.sources.coordinates}
          onChange={(e) => updateSource("coordinates", e.target.checked)}
        >
          {msgCoordinates}
        </Checkbox>
      </div>
      <div className="navigation-mode-block">
        <span>{msgNavigation}</span>
        <Radio.Group
          value={value.navigationMode}
          onChange={(e) => update("navigationMode", e.target.value)}
        >
          <Radio value="zoom">{msgZoom}</Radio>
          <Radio value="pan">{msgPan}</Radio>
        </Radio.Group>
      </div>
    </div>
  );

  return (
    <Popover trigger="click" placement="bottomLeft" content={content}>
      <PanelTitle.Button icon={<SettingsIcon />} title={msgSettings} />
    </Popover>
  );
}
