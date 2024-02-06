import { useState } from "react";

import { Image } from "@nextgisweb/gui/antd";

interface FileReaderImageProps {
    file: File;
    width?: number;
}

export function FileReaderImage({ file, width = 80 }: FileReaderImageProps) {
    const [src, setSrc] = useState<string | null>();
    const fr = new FileReader();
    fr.onload = function () {
        if (typeof fr.result === "string") {
            setSrc(fr.result);
        } else {
            throw new Error("unreachable");
        }
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
