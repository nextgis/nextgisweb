/** @plugin */

import settings from "@nextgisweb/pyramid/client-settings";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { registry } from "@nextgisweb/webmap/panel/registry";

import FeedbackIcon from "@nextgisweb/icon/material/feedback";

registry.register(COMP_ID, {
  type: "link",
  href: settings.contactAdministratorUrl ?? "",
  target: "_blank",
  name: "contact-webmap-admin",
  isEnabled: () => {
    return (
      (!ngwConfig.isAdministrator || ngwConfig.isGuest) &&
      !!settings.contactAdministratorUrl
    );
  },
  title: gettext("Contact Web GIS administrator"),
  icon: <FeedbackIcon />,
  order: 50,
  placement: "end",
});
