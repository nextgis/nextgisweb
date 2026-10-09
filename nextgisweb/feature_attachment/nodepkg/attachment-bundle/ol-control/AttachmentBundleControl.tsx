import { lazy, useCallback } from "react";

import { useDisplayContext } from "@nextgisweb/webmap/display/context/useDisplayContext";
import { ButtonControl } from "@nextgisweb/webmap/map-component";
import type { ButtonControlProps } from "@nextgisweb/webmap/map-component";

import AttachFileIcon from "@nextgisweb/icon/material/attach_file";

const attachmentTabLazy = lazy(
  () => import("@nextgisweb/feature-attachment/attachment-bundle/tab")
);

export default function AttachmentBundleControl(props: ButtonControlProps) {
  const { display } = useDisplayContext();

  const onClick = useCallback(() => {
    if (!display) return;

    const label = props.title;

    display.tabsManager.addTab({
      key: "attachments",
      label,
      component: attachmentTabLazy,
      props: {
        display,
      },
    });
  }, [display, props.title]);

  return (
    <ButtonControl {...props} onClick={onClick}>
      <AttachFileIcon />
    </ButtonControl>
  );
}
