import { EDITING_ID } from "@nextgisweb/webmap/constant";

import ToolEditor from "./ToolEditor";

const LayerEditorMap = () => {
  return <ToolEditor order={100} position="top-left" groupId={EDITING_ID} />;
};

LayerEditorMap.displayName = "LayerEditorMap";

export default LayerEditorMap;
