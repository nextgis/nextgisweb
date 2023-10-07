import { useState } from "react";

import { Image } from "@nextgisweb/gui/antd";

export function FileReaderImage({ file }) {
    const [src, setSrc] = useState();
    const fr = new FileReader();
    fr.onload = function () {
        setSrc(fr.result);
    };
    fr.readAsDataURL(file);
    return (
        <Image
            width={80}
            src={src}
            preview={{
                src,
            }}
        />
    );
}
