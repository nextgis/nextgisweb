/** @plugin */
import { routeURL } from "@nextgisweb/pyramid/api";
import {
  registerControlPanelGroup,
  registerControlPanelItem,
} from "@nextgisweb/pyramid/control-panel/registry";
import { gettext } from "@nextgisweb/pyramid/i18n";

declare module "@nextgisweb/pyramid/control-panel/registry" {
  interface ControlPanelGroupIdMap {
    spatial_ref_sys: true;
  }
}

function hasAnySRSPermissions() {
  return (
    ngwConfig.isAdministrator ||
    ngwConfig.extraPermissions.some(
      (p) => p === "spatial_ref_sys.view" || p === "spatial_ref_sys.manage"
    )
  );
}
function hasManagePermission() {
  return (
    ngwConfig.isAdministrator ||
    ngwConfig.extraPermissions.some((p) => p === "spatial_ref_sys.manage")
  );
}

registerControlPanelGroup({
  key: "spatial_ref_sys",
  order: 300,
  label: gettext("Spatial reference systems"),
});

registerControlPanelItem(COMP_ID, {
  type: "link",
  key: "browse",
  label: gettext("List"),
  menu: { order: 10, group: "spatial_ref_sys" },
  condition: hasAnySRSPermissions,
  href: routeURL("srs.browse"),
});

registerControlPanelItem(COMP_ID, {
  type: "link",
  key: "catalog/browse",
  label: gettext("Catalog"),
  menu: { order: 20, group: "spatial_ref_sys" },
  condition: hasManagePermission,
  href: routeURL("srs.catalog"),
});

registerControlPanelItem(COMP_ID, {
  type: "link",
  key: "create",
  label: gettext("Create"),
  menu: { order: 30, group: "spatial_ref_sys" },
  condition: hasManagePermission,
  href: routeURL("srs.create"),
});
