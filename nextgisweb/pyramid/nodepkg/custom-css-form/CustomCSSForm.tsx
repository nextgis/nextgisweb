import { useEffect, useState } from "react";

import { Col, Row, Space, Typography, message } from "@nextgisweb/gui/antd";
import { LoadingWrapper, SaveButton } from "@nextgisweb/gui/component";
import { Code } from "@nextgisweb/gui/component/code";
import { errorModal } from "@nextgisweb/gui/error";
import { route } from "@nextgisweb/pyramid/api";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import { gettext } from "@nextgisweb/pyramid/i18n";

/* prettier-ignore */ const
msgSave = gettext("Custom styles saved. Reload the page to get them applied."),
msgDesc = gettext("Enter custom CSS rules here. They will be used to redefine styles, design for all pages of your Web GIS.");

export function CustomCSSForm() {
  const [saving, setSaving] = useState(false);
  const [initial, setInitial] = useState<string>();
  const [data, setData] = useState<string>();

  const [messageApi, contextHolder] = message.useMessage();

  const { data: initialData, isLoading } = useRouteGet({
    name: "pyramid.csettings",
    options: { query: { pyramid: ["custom_css"] } },
  });

  useEffect(() => {
    const value = initialData?.pyramid?.custom_css;
    if (value !== undefined) {
      setInitial(value);
      setData(value);
    }
  }, [initialData]);

  const save = async () => {
    setSaving(true);

    try {
      await route("pyramid.csettings").put({
        json: { pyramid: { custom_css: data } },
      });
    } catch (err) {
      errorModal(err);
    } finally {
      messageApi.success(msgSave);
      setSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingWrapper />;
  }

  return (
    <Space orientation="vertical" style={{ width: "100%" }}>
      {contextHolder}

      <Typography.Paragraph type="secondary">{msgDesc}</Typography.Paragraph>

      <Row>
        <Col
          span={24}
          style={{
            height: "clamp(480px, 70vh, 900px)",
          }}
        >
          <Code value={initial} onChange={setData} lang="css" lineNumbers />
        </Col>
      </Row>

      <Row>
        <SaveButton onClick={save} loading={saving} />
      </Row>
    </Space>
  );
}
