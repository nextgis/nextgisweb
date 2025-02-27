declare module "@nextgisweb/webmap/icon/*.svg" {
    import type { FC, SVGProps } from "react";

    const value: FC<SVGProps<SVGSVGElement>> & { id: string };
    export = value;
}
