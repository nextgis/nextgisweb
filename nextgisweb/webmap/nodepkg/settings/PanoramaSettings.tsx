import { useState } from "react";

import {
  Button,
  Card,
  Col,
  Dropdown,
  Form,
  InputValue,
  Row,
  Space,
  Switch,
  Tabs,
} from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { WebMapCSettingsRead } from "@nextgisweb/webmap/type/api";

import "./PanoramaSettings.less";

type PanoramaKey = "google_api_panorama_key" | "yandex_api_panorama_key";

export type PanoramaSettingsValue = Required<
  Pick<WebMapCSettingsRead, PanoramaKey>
>;

export interface PanoramaSettingsProps {
  value: PanoramaSettingsValue;
  onChange: (value: PanoramaSettingsValue) => void;
  validate: boolean;
}

const PROVIDERS: { key: PanoramaKey; label: string; required: boolean }[] = [
  { key: "google_api_panorama_key", label: "Google", required: false },
  { key: "yandex_api_panorama_key", label: "Yandex", required: true },
];

/* prettier-ignore */ const
msgAdd = gettext("Add"),
msgEnable = gettext("Enable"),
msgApiKey = gettext("API key"),
msgApiKeyRequired = gettext("API key is required"),
msgInfo = gettext("Add one or more panorama providers to your Web GIS.");

export function isPanoramaSettingsValid(value: PanoramaSettingsValue) {
  return PROVIDERS.every((p) => !p.required || value[p.key] !== "");
}

export function PanoramaSettings({
  value,
  onChange,
  validate,
}: PanoramaSettingsProps) {
  const [activeKey, setActiveKey] = useState<string>();

  const added = PROVIDERS.filter((p) => value[p.key] !== null);
  const available = PROVIDERS.filter((p) => value[p.key] === null);

  const set = (key: PanoramaKey, next: string | null) =>
    onChange({ ...value, [key]: next });

  return (
    <div className="ngw-webmap-panorama-settings">
      <Space orientation="horizontal">
        <Form.Item noStyle name="panorama_enabled" valuePropName="checked">
          <Switch />
        </Form.Item>
        {msgEnable}
      </Space>

      <div>
        <Dropdown
          menu={{
            items: available.map(({ key, label }) => ({ key, label })),
            onClick: ({ key }) => {
              set(key as PanoramaKey, "");
              setActiveKey(key);
            },
          }}
          trigger={["click"]}
          disabled={available.length === 0}
        >
          <Button type="primary" disabled={available.length === 0} ghost>
            {msgAdd}
          </Button>
        </Dropdown>
      </div>

      {added.length === 0 ? (
        <Card size="small">{msgInfo}</Card>
      ) : (
        <Tabs
          type="editable-card"
          hideAdd
          activeKey={activeKey ?? added[0].key}
          onChange={setActiveKey}
          onEdit={(key, action) => {
            if (action === "remove") {
              set(key as PanoramaKey, null);
              setActiveKey(undefined);
            }
          }}
          items={added.map((p) => {
            const error = validate && p.required && !value[p.key];
            return {
              key: p.key,
              label: p.label,
              children: (
                <Row gutter={[16, 16]}>
                  <Col span={16}>
                    <Form.Item
                      label={msgApiKey}
                      required={p.required}
                      validateStatus={error ? "error" : undefined}
                      help={error ? msgApiKeyRequired : undefined}
                    >
                      <InputValue
                        value={value[p.key] ?? ""}
                        onChange={(next) => set(p.key, next)}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              ),
            };
          })}
        />
      )}
    </div>
  );
}
