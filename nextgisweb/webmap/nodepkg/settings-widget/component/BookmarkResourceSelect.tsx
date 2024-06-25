import { useCallback, useState } from "react";

import { useAbortController } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ResourceSelectRef } from "@nextgisweb/resource/component";
import type { ResourcePickerStoreOptions } from "@nextgisweb/resource/component/resource-picker/type";
import type { ResourceRef } from "@nextgisweb/resource/type/api";

import type { BookmarkResource } from "../../type/WebmapResource";
import { getBookmarkResource } from "../util/getBookmarkResource";

interface BookmarkResourceSelect {
    value: BookmarkResource | null | undefined;
    onChange: (val: { bookmarkResource: BookmarkResource | null }) => void;
    pickerOptions?: ResourcePickerStoreOptions;
}

export function BookmarkResourceSelect({
    value,
    onChange,
    pickerOptions,
}: BookmarkResourceSelect) {
    const { makeSignal } = useAbortController();
    const [loading, setLoading] = useState(false);

    const onResourceChange = useCallback(
        async (resourceRef?: ResourceRef | null) => {
            if (resourceRef) {
                setLoading(true);
                try {
                    const bookmarkResource = await getBookmarkResource({
                        resourceId: resourceRef.id,
                        signal: makeSignal(),
                    });
                    if (bookmarkResource) {
                        onChange({ bookmarkResource });
                    }
                } finally {
                    setLoading(false);
                }
            } else {
                onChange({ bookmarkResource: null });
            }
        },
        [makeSignal, onChange]
    );

    return (
        <ResourceSelectRef
            loading={loading}
            value={value as ResourceRef}
            allowClear
            pickerOptions={{
                requireInterface: "IFeatureLayer",
                ...pickerOptions,
            }}
            placeholder={gettext("Select resource")}
            onChange={onResourceChange}
            style={{ width: "100%" }}
        />
    );
}
