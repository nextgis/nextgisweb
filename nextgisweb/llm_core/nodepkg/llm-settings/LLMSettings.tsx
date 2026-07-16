import { useCallback, useEffect, useState } from "react";

import { Form, Input, Space, Typography, message } from "@nextgisweb/gui/antd";
import { LoadingWrapper, SaveButton } from "@nextgisweb/gui/component";
import { errorModal } from "@nextgisweb/gui/error";
import { route } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import { gettext } from "@nextgisweb/pyramid/i18n";

/* prettier-ignore */ const
msgInfo = gettext("Configure the LLM provider for AI-powered features. Use any OpenAI-compatible API endpoint."),
msgBaseUrl = gettext("Provider URL"),
msgBaseUrlHelp = gettext("Base URL of the OpenAI-compatible API endpoint"),
msgModel = gettext("Model"),
msgModelHelp = gettext("Model name as recognized by the provider"),
msgApiKey = gettext("API Key"),
msgApiKeyHelp = gettext("API key for authentication");

interface LLMSettingsForm {
  base_url: string | null;
  model: string | null;
  api_key: string | null;
}

export function LLMSettings() {
  const [form] = Form.useForm<LLMSettingsForm>();
  const [saving, setSaving] = useState(false);
  const { makeSignal } = useAbortController();
  const [messageApi, contextHolder] = message.useMessage();

  const { data, isLoading } = useRouteGet({
    name: "pyramid.csettings",
    options: { query: { llm_core: ["base_url", "model", "api_key"] } },
  });

  useEffect(() => {
    if (!data) return;
    const llmSettings = data.llm_core;
    if (llmSettings) {
      form.setFieldsValue({
        base_url: llmSettings.base_url ?? null,
        model: llmSettings.model ?? null,
        api_key: llmSettings.api_key ?? null,
      });
    }
  }, [data, form]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const values = await form.validateFields();
      try {
        await route("pyramid.csettings").put({
          json: { llm_core: values },
          signal: makeSignal(),
        });
        messageApi.success(gettext("LLM settings saved."));
      } catch (err) {
        errorModal(err);
      }
    } catch {
      messageApi.error(gettext("Fix the form errors first"));
    } finally {
      setSaving(false);
    }
  }, [form, makeSignal, messageApi]);

  if (isLoading) {
    return <LoadingWrapper />;
  }

  return (
    <Space direction="vertical" size="middle" style={{ maxWidth: "40em" }}>
      {contextHolder}
      <Typography.Paragraph>{msgInfo}</Typography.Paragraph>
      <Form form={form} layout="vertical">
        <Form.Item name="base_url" label={msgBaseUrl} extra={msgBaseUrlHelp}>
          <Input placeholder="https://api.openai.com/v1" />
        </Form.Item>
        <Form.Item name="model" label={msgModel} extra={msgModelHelp}>
          <Input placeholder="gpt-4o-mini" />
        </Form.Item>
        <Form.Item name="api_key" label={msgApiKey} extra={msgApiKeyHelp}>
          <Input.Password placeholder="sk-..." />
        </Form.Item>
      </Form>
      <SaveButton onClick={save} loading={saving}>
        {gettext("Save")}
      </SaveButton>
    </Space>
  );
}
