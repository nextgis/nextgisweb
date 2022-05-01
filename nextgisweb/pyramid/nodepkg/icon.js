/** @entrypoint */
import "@material-icons/svg/add_box";
import "@material-icons/svg/add";
import "@material-icons/svg/arrow_upward";
import "@material-icons/svg/close";
import "@material-icons/svg/compare";
import "@material-icons/svg/content_copy";
import "@material-icons/svg/data_object";
import "@material-icons/svg/delete_forever";
import "@material-icons/svg/edit";
import "@material-icons/svg/help_outline";
import "@material-icons/svg/home";
import "@material-icons/svg/info";
import "@material-icons/svg/layers";
import "@material-icons/svg/lock";
import "@material-icons/svg/message";
import "@material-icons/svg/my_location";
import "@material-icons/svg/open_in_new";
import "@material-icons/svg/preview";
import "@material-icons/svg/print";
import "@material-icons/svg/remove";
import "@material-icons/svg/save_alt";
import "@material-icons/svg/search";
import "@material-icons/svg/share";
import "@material-icons/svg/table_view";
import "@material-icons/svg/wifi";
import "@material-icons/svg/zoom_in";
import "@material-icons/svg/zoom_out";

// PLACEHOLDER: Webpack will replace it with generated module
import "@nextgisweb/jsrealm/shared-icon";

export function html({ collection, glyph, variant }) {
    const id =
        `icon-${collection || "material"}-${glyph}` +
        (variant && variant !== "baseline" ? `-${variant}` : "");
    return `<svg class="icon" fill="currentColor"><use xlink:href="#${id}"/></svg>`;
}
