import Feature from "ol/Feature";
import { Point } from "ol/geom";
import type { Type as OlGeometryType } from "ol/geom/Geometry";
import type { Draw } from "ol/interaction";
import VectorLayer from "ol/layer/Vector";
import { fromLonLat } from "ol/proj";
import VectorSource from "ol/source/Vector";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button, Popover } from "@nextgisweb/gui/antd";
import { AutoCompleteInput } from "@nextgisweb/gui/component";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { lonLatToDM } from "@nextgisweb/webmap/coordinates/formatter";
import { parse } from "@nextgisweb/webmap/coordinates/parser";
import type { Coordinate } from "@nextgisweb/webmap/coordinates/parser";
import { ButtonControl } from "@nextgisweb/webmap/map-component";

import { useEditorContext } from "../../context/useEditorContext";

import KeyboardIcon from "@nextgisweb/icon/material/keyboard";

export interface CoordInputProps {
  draw: Draw;
  geomType: OlGeometryType;
  open: boolean;
  setOpen: (next: boolean) => void;
  onFilledChange: (filled: boolean) => void;
}

export function CoordInput({
  draw,
  geomType,
  open,
  setOpen,
  onFilledChange,
}: CoordInputProps) {
  const [value, setValue] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [chosen, setChosen] = useState<Coordinate | null>(null);
  const listOpenRef = useRef(false);

  useEffect(() => {
    onFilledChange(value !== "");
  }, [value, onFilledChange]);

  const parsed = useMemo<Coordinate[]>(
    () =>
      parse(value).filter(
        (c, i, all) =>
          all.findIndex((o) => o.lon === c.lon && o.lat === c.lat) === i
      ),
    [value]
  );
  const valid = parsed.length > 0 || (value === "" && !attempted);
  const selected = chosen ?? parsed[0];
  const options = useMemo(
    () => parsed.map((c) => ({ value: lonLatToDM([c.lon, c.lat]) })),
    [parsed]
  );

  const { olMap, selectStyle } = useEditorContext();

  const previewSource = useMemo(() => new VectorSource(), []);

  useEffect(() => {
    const layer = new VectorLayer({
      source: previewSource,
      style: selectStyle,
      map: olMap,
    });
    return () => {
      layer.setMap(null);
      previewSource.clear();
    };
  }, [olMap, previewSource, selectStyle]);

  const toMapCoordinate = useCallback(
    ({ lon, lat }: { lon: number; lat: number }) =>
      fromLonLat([lon, lat], olMap.getView().getProjection()),
    [olMap]
  );

  useEffect(() => {
    previewSource.clear();
    if (!chosen) return;
    previewSource.addFeature(new Feature(new Point(toMapCoordinate(chosen))));
  }, [chosen, previewSource, toMapCoordinate]);

  const clearPreviewSource = useCallback(
    () => previewSource.clear(),
    [previewSource]
  );

  useEffect(() => {
    if (!open) {
      clearPreviewSource();
      setValue("");
      setChosen(null);
      setAttempted(false);
    }
  }, [clearPreviewSource, open]);

  const resetInput = useCallback(() => {
    setValue("");
    setChosen(null);
    setAttempted(false);
    clearPreviewSource();
  }, [clearPreviewSource]);

  const submitCoord = useCallback(() => {
    if (!selected) {
      setAttempted(true);
      return;
    }
    previewSource.clear();
    draw.appendCoordinates([toMapCoordinate(selected)]);
    if (geomType.includes("Point")) draw.finishDrawing();
    setValue("");
    setChosen(null);
  }, [draw, geomType, previewSource, toMapCoordinate, selected]);

  const enterCoordinates = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        width: "180px",
      }}
    >
      <div
        onKeyDownCapture={(e) => {
          if (e.key !== "Enter" || !selected || listOpenRef.current) return;
          e.preventDefault();
          e.stopPropagation();
          submitCoord();
        }}
      >
        <AutoCompleteInput
          style={{ width: "100%" }}
          onOpenChange={(next) => {
            listOpenRef.current = next;
          }}
          autoFocus
          placeholder={"37.6173, 55.7558"}
          status={valid ? undefined : "error"}
          value={value}
          options={options}
          defaultActiveFirstOption
          showSearch={{ filterOption: false }}
          onSelect={(text) => {
            const option = parsed.find(
              (c) => lonLatToDM([c.lon, c.lat]) === text
            );
            if (!option) return;
            setValue(text);
            setChosen(option);
            setAttempted(false);
            olMap.getView().setCenter(toMapCoordinate(option));
          }}
          onChange={(v) => {
            setValue(v);
            setAttempted(false);
            if (options.some((o) => o.value === v)) return;
            setChosen(null);
            clearPreviewSource();
          }}
        />
      </div>
      <div style={{ display: "flex", gap: "4px" }}>
        <Button
          style={{ width: "50%", visibility: chosen ? "visible" : "hidden" }}
          onClick={resetInput}
        >
          {gettext("Cancel")}
        </Button>
        <Button type="primary" style={{ width: "50%" }} onClick={submitCoord}>
          {gettext("OK")}
        </Button>
      </div>
    </div>
  );

  return (
    <ButtonControl order={1} title={gettext("Enter coordinates")}>
      <Popover
        title={gettext("Enter coordinates")}
        open={open}
        trigger="click"
        placement="bottomLeft"
        content={enterCoordinates}
        onOpenChange={setOpen}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
          }}
        >
          <KeyboardIcon />
        </span>
      </Popover>
    </ButtonControl>
  );
}
