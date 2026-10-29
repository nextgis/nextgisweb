import { useState } from "react";

import {
  Button,
  Card,
  CheckboxValue,
  Col,
  Dropdown,
  Form,
  InputValue,
  Row,
  Space,
  Switch,
  Tabs,
} from "@nextgisweb/gui/antd";
import { TabsLabelBadge } from "@nextgisweb/gui/component";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { registry } from "@nextgisweb/webmap/panorama/provider/registry";
import type { PanoramaProviderIdentity } from "@nextgisweb/webmap/type/api";

import "./PanoramaSettings.less";

const providers = registry.queryAll();

export interface PanoramaSettingsProps {
  value: PanoramaProviderIdentity[];
  onChange: (value: PanoramaProviderIdentity[]) => void;
}

/* prettier-ignore */ const
msgAdd = gettext("Add"),
msgEnable = gettext("Enable"),
msgApiKey = gettext("API key"),
msgApiKeyRequired = gettext("API key is required"),
msgDefault = gettext("Default provider"),
msgInfo = gettext("Add one or more panorama providers to your Web GIS.");

export function PanoramaSettings({ value, onChange }: PanoramaSettingsProps) {
  const [activeKey, setActiveKey] = useState<string>();

  const added = providers.filter((p) => value.includes(p.identity));
  const addable = providers.filter((p) => !value.includes(p.identity));
  const identities = added.map((p) => p.identity);

  return (
    <div className="ngw-webmap-panorama-settings">
      <Space orientation="horizontal">
        <Form.Item
          noStyle
          name={["panorama", "enabled"]}
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        {msgEnable}
      </Space>

      <Row gutter={[16, 16]} align="bottom">
        <Col>
          <Dropdown
            menu={{
              items: addable.map((p) => ({ key: p.identity, label: p.title })),
              onClick: ({ key }) => {
                onChange([...value, key as PanoramaProviderIdentity]);
                setActiveKey(key);
              },
            }}
            trigger={["click"]}
          >
            <Button type="primary" disabled={addable.length === 0} ghost>
              {msgAdd}
            </Button>
          </Dropdown>
        </Col>
      </Row>

      {added.length === 0 ? (
        <Card size="small">{msgInfo}</Card>
      ) : (
        <Row>
          <Col span={16}>
            <Tabs
              type="editable-card"
              hideAdd
              activeKey={activeKey ?? added[0].identity}
              onChange={setActiveKey}
              onEdit={(key, action) => {
                if (action === "remove") {
                  onChange(value.filter((k) => k !== key));
                  setActiveKey(undefined);
                }
              }}
              items={added.map((p) => ({
                key: p.identity,
                label: (
                  <Form.Item noStyle shouldUpdate>
                    {({ getFieldError }) => (
                      <TabsLabelBadge
                        error={
                          getFieldError(["panorama", "keys", p.identity])
                            .length > 0
                        }
                      >
                        {p.title}
                      </TabsLabelBadge>
                    )}
                  </Form.Item>
                ),
                forceRender: true,
                children: (
                  <>
                    <Form.Item
                      name={["panorama", "keys", p.identity]}
                      label={msgApiKey}
                      rules={
                        p.requiresKey
                          ? [{ required: true, message: msgApiKeyRequired }]
                          : undefined
                      }
                    >
                      <InputValue />
                    </Form.Item>
                    {added.length > 1 && (
                      <Form.Item
                        name={["panorama", "provider"]}
                        getValueProps={(v) => ({
                          value:
                            (identities.includes(v) ? v : identities[0]) ===
                            p.identity,
                        })}
                        getValueFromEvent={(checked: boolean) =>
                          checked ? p.identity : undefined
                        }
                        normalize={(v, prev) => v ?? prev}
                      >
                        <CheckboxValue>{msgDefault}</CheckboxValue>
                      </Form.Item>
                    )}
                  </>
                ),
              }))}
            />
          </Col>
        </Row>
      )}
    </div>
  );
}
