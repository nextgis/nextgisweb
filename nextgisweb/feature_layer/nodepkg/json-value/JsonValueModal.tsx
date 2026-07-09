import { Suspense, lazy } from "react";

import { Alert, Spin } from "@nextgisweb/gui/antd";
import { EditorModal } from "@nextgisweb/gui/editor-modal/EditorModal";
import type { ModalProps } from "@nextgisweb/gui/editor-modal/EditorModal";
import { gettext } from "@nextgisweb/pyramid/i18n";

const msgInvalidJson = gettext("Invalid JSON");
const msgApply = gettext("Apply");

const CodeLazy = lazy(() => import("@nextgisweb/gui/component/code/CodeLazy"));

interface JsonValueModalProps extends Omit<ModalProps, "children"> {
  value: string;
  error?: string | null;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}

export function JsonValueModal({
  value,
  error,
  okText = msgApply,
  readOnly,
  className,
  onChange,
  ...modalProps
}: JsonValueModalProps) {
  return (
    <EditorModal
      {...modalProps}
      okText={okText}
      className="ngw-feature-layer-json-value-modal"
    >
      <div className="ngw-feature-layer-json-value-content">
        {error && (
          <Alert type="error" title={msgInvalidJson} description={error} />
        )}

        <div className="ngw-feature-layer-json-value-code">
          <Suspense
            fallback={<Spin styles={{ indicator: { fontSize: 24 } }} />}
          >
            <CodeLazy
              value={value}
              onChange={readOnly ? undefined : onChange}
              readOnly={readOnly}
              lang="json"
              lineNumbers
              fold
            />
          </Suspense>
        </div>
      </div>
    </EditorModal>
  );
}
