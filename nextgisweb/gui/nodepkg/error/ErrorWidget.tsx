import { Suspense, lazy, useMemo } from "react";

import { Button, Collapse, Spin } from "@nextgisweb/gui/antd";
import type { ButtonProps } from "@nextgisweb/gui/antd";
import settings from "@nextgisweb/pyramid/client-settings";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { url } from "@nextgisweb/pyramid/nextgis";

import type { ErrorInfo } from "./extractError";

import FeedbackIcon from "@nextgisweb/icon/material/feedback";
import SupportIcon from "@nextgisweb/icon/material/support";

import "./ErrorWidget.less";

const CodeLazy = lazy(() => import("./CodeLazy"));

export interface ErrorWidgetProps {
  error: ErrorInfo;
  onOk?: () => void;
}

export function ErrorWidget({ error, onOk }: ErrorWidgetProps) {
  const jsonString = useMemo(() => {
    const { contact, status_code, ...copy } = error;
    return JSON.stringify(copy, null, 2);
  }, [error]);

  const contactProps = useMemo<ButtonProps | null>(() => {
    if (
      (!ngwConfig.isAdministrator || ngwConfig.isGuest) &&
      error.contact === "administrator" &&
      settings.contactAdministratorUrl
    ) {
      return {
        icon: <FeedbackIcon />,
        href: settings.contactAdministratorUrl,
        children: gettext("Contact Web GIS administrator"),
      };
    } else if (settings.support_url) {
      return {
        icon: <SupportIcon />,
        href: url(settings.support_url),
        children: gettext("Contact support"),
      };
    }
    return null;
  }, [error.contact]);

  const tinfoMinHeight = "148px";
  const tinfoMaxHeight = "210px";

  return (
    <div
      className="ngw-gui-error-widget"
      style={{
        ["--tinfo-min-height" as string]: tinfoMinHeight,
        ["--tinfo-max-height" as string]: tinfoMaxHeight,
      }}
    >
      <h1 style={{ marginBlockStart: 0, marginInlineEnd: 32 }}>
        {error.title}
      </h1>
      <p>{error.message}</p>
      {error.detail && <p>{error.detail}</p>}
      <Collapse
        size="small"
        styles={{ body: { padding: 0 } }}
        items={[
          {
            key: "tinfo",
            label: gettext("Technical information"),
            children: (
              <Suspense
                fallback={
                  <div className="tinfo-fallback">
                    <Spin size="large" delay={250} />
                  </div>
                }
              >
                <CodeLazy
                  autoHeight
                  minHeight={tinfoMinHeight}
                  maxHeight={tinfoMaxHeight}
                  value={jsonString}
                  readOnly
                  lang="json"
                  lineNumbers
                />
              </Suspense>
            ),
          },
        ]}
      />
      <div className="footer">
        {contactProps && <Button target="_blank" {...contactProps} />}
        {onOk ? (
          <Button type="primary" onClick={onOk}>
            {gettext("OK")}
          </Button>
        ) : (
          <Button type="primary" href={ngwConfig.applicationUrl}>
            {gettext("Back to home")}
          </Button>
        )}
      </div>
    </div>
  );
}
