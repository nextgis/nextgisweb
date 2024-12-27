import { gettext, ngettextf } from "@nextgisweb/pyramid/i18n";
import type { ResourceDeleteSummary } from "@nextgisweb/resource/type/api";

export const msgDeleteButton = (resources: number) => {
    return ngettextf(
        "Delete {} resource",
        "Delete {} resources",
        resources
    )(resources);
};

export const msgResourcesCount = (count: number) =>
    ngettextf("resource", "resources", count)(count);

export const msgMultiple = (
    affected: ResourceDeleteSummary,
    unaffected: ResourceDeleteSummary
) => {
    if (affected.count === 0) {
        return gettext(
            "The selected resource cannot be deleted. You may not have sufficient permissions, or this resource is being referenced by other resources."
        );
    } else if (affected.count === 1 && unaffected.count === 0) {
        return gettext(
            "Please confirm the deletion of the selected resource. This action is irreversible, and the resource will be permanently deleted."
        );
    } else if (affected.count > 1 && unaffected.count === 0) {
        return (
            gettext(
                "Please confirm the deletion of the selected resource and all its child resources."
            ) +
            " " +
            ngettextf(
                "{} resource will be permanently deleted.",
                "{} resources will be permanently deleted.",
                affected.count
            )(affected.count)
        );
    } else {
        return (
            ngettextf(
                "{} resource cannot be deleted.",
                "{} resources cannot be deleted.",
                unaffected.count
            )(unaffected.count) +
            " " +
            ngettextf(
                "Please confirm the permanent deletion of {} resource.",
                "Please confirm the permanent deletion of {} resources.",
                affected.count
            )(affected.count)
        );
    }
};
