import { observer } from "mobx-react-lite";

import { EDITING_ID } from "@nextgisweb/webmap/constant";
import type { Display } from "@nextgisweb/webmap/display";

import ToolEditor from "./ToolEditor";

const LayerEditorMap = observer(({ display }: { display: Display }) => {
  if (display.isTinyMode || !display.config.webmapEditable) {
    return null;
  }

  return <ToolEditor order={100} position="top-left" groupId={EDITING_ID} />;
});

LayerEditorMap.displayName = "LayerEditorMap";

export default LayerEditorMap;
