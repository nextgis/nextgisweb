import type { FC, SVGProps } from "react";

export type IconComponent = FC<SVGProps<SVGSVGElement>> & { id: string };
