/** @testentry react */
import { useState } from "react";

import { Checkbox, Input, Select } from "@nextgisweb/gui/antd";

import { Area } from "./Area";
import type { LabelPosition } from "./Area";
import { Lot } from "./Lot";

export default function Testentry() {
    const [layout, setLayout] = useState<LabelPosition>("left");

    return (
        <Area labelPosition={layout} cols={["4fr", "2fr", "minmax(6em, 1fr)"]}>
            <Lot label="Label position">
                <Select<LabelPosition>
                    value={layout}
                    onChange={setLayout}
                    style={{ width: "10em" }}
                    options={[
                        { value: "left", label: "Left" },
                        { value: "top", label: "Top" },
                    ]}
                />
            </Lot>

            <Lot label="First name" start={1}>
                <Input />
            </Lot>
            <Lot label="Last name" span={2}>
                <Input />
            </Lot>
            <Lot label="Hostname" span={2} error="Error message">
                <Input />
            </Lot>
            <Lot label="Port" help="Some help text goes here">
                <Input />
            </Lot>
            <Lot row>
                <Checkbox>
                    You can&apos;t parse the interface without connecting the
                    optical DRAM array!
                </Checkbox>
            </Lot>
        </Area>
    );
}
