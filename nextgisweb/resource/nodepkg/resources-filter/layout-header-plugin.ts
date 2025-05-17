/** @plugin */
import { headerRegistry } from "@nextgisweb/pyramid/layout/header/registry";

headerRegistry(COMP_ID, {
    component: () => import("@nextgisweb/resource/resources-filter"),
    props: {
        onChange: (_value, option) => {
            window.location.href = option.url;
        },
    },
    order: -100,
    menuItem: false,
    isEnabled: ({ hideResourceFilter }) => {
        return !hideResourceFilter;
    },
});
