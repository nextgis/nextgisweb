/** @testentry react */
import { useEffect, useState } from "react";

import { Button, Divider, Table, Tooltip } from "@nextgisweb/gui/antd";
import { ErrorIcon } from "@nextgisweb/gui/icon";

import { PanoramaModal } from "./PanoramaModal";
import settings from "./client-settings";
import { usePanoramaHandler } from "./hook/usePanoramaHandler";

const attributeRows = [
  { attr: "Название", value: "Красивая улица в Нижнем" },
  { attr: "Адрес", value: "Федоровская набережная" },
  { attr: "Тип", value: "Улица" },
];

const attributeColumns = [
  { dataIndex: "attr", key: "attr" },
  { dataIndex: "value", key: "value" },
];

export default function PanoramaTestentry() {
  const [position, setPosition] = useState({
    lat: 56.324808,
    lng: 43.98455,
  });
  const [pov, setPov] = useState({ heading: 0, pitch: 0 });
  const [checkStatus, setCheckStatus] = useState<
    "unavailable" | "error" | null
  >(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [checking, setChecking] = useState(false);

  const {
    iframeRef,
    setPosition: setPanoramaPosition,
    checkAvailability,
  } = usePanoramaHandler({
    onPositionChanged: (lat, lng) => {
      setPosition({ lat, lng });
      setCheckStatus(null);
    },
    onPovChanged: (heading, pitch) => setPov({ heading, pitch }),
    onUnavailable: () => setCheckStatus("unavailable"),
  });

  useEffect(() => {
    if (!modalOpen) return;
    setPanoramaPosition(position.lat, position.lng);
  }, [modalOpen, position.lat, position.lng, setPanoramaPosition]);

  const available = settings.isProviderConfigured;

  if (!available) {
    return <div>No active panorama provider configured</div>;
  }

  async function handleOpenClick() {
    setChecking(true);
    const status = await checkAvailability(position.lat, position.lng);
    setChecking(false);

    if (status !== "available") {
      setCheckStatus(status);
      return;
    }

    setCheckStatus(null);
    setModalOpen(true);
  }

  const statusMessage =
    checkStatus === "unavailable"
      ? "Координата недоступна в выбранном провайдере"
      : checkStatus === "error"
        ? "Сервис панорам недоступен, попробуйте позже"
        : null;

  return (
    <div style={{ display: "flex", alignItems: "stretch" }}>
      <div style={{ width: 320 }}>
        <h1>Идентификация</h1>

        <Table
          dataSource={attributeRows}
          columns={attributeColumns}
          rowKey="attr"
          bordered
          size="small"
          showHeader={false}
          pagination={false}
        />

        <div
          style={{
            marginTop: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Button type="primary" onClick={handleOpenClick} loading={checking}>
            Показать панораму
          </Button>
          {statusMessage && (
            <Tooltip title={statusMessage}>
              <ErrorIcon style={{ color: "var(--error)" }} />
            </Tooltip>
          )}
        </div>
      </div>

      <Divider orientation="vertical" style={{ height: "auto" }} />

      <div>
        <h1>Настройки</h1>

        <div>
          <label>
            Lat:{" "}
            <input
              type="number"
              value={position.lat}
              onChange={(e) =>
                setPosition((p) => ({ ...p, lat: Number(e.target.value) }))
              }
            />
          </label>{" "}
          <label>
            Lng:{" "}
            <input
              type="number"
              value={position.lng}
              onChange={(e) =>
                setPosition((p) => ({ ...p, lng: Number(e.target.value) }))
              }
            />
          </label>
        </div>
        <div>
          pov: heading {pov.heading}, pitch {pov.pitch}
        </div>
      </div>

      <PanoramaModal
        iframeRef={iframeRef}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
