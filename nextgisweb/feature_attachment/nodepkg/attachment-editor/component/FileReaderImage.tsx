import { useState } from "react";

import { Image } from "@nextgisweb/gui/antd";
import { assert } from "@nextgisweb/jsrealm/error";

interface FileReaderImageProps {
    file: File;
    width?: number;
}

export function FileReaderImage({ file, width = 80 }: FileReaderImageProps) {
    const [src, setSrc] = useState<string | null>();
    const fr = new FileReader();
    fr.onload = function () {
        assert(typeof fr.result === "string");
        setSrc(fr.result);
    };
    fr.readAsDataURL(file);

    if (!src) {
        return <></>;
    }

    return (
        <Image
            width={width}
            src={src}
            preview={{
                src,
            }}
        />
    );
}
