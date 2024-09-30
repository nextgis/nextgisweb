/** @testentry react */

import { useState } from "react";

import { InputNumber, Switch } from "@nextgisweb/gui/antd";
import { Area, Lot } from "@nextgisweb/gui/mayout";

import { MapComponent } from "../MapComponent";

function MapComponetTest() {
    const [zoom, setZoom] = useState(0);
    const [center, setCenter] = useState([0, 0]);
    const [osm, setOsm] = useState(true);

    return (
        <>
            <Area cols={["1fr", "1fr"]}>
                <Lot label="Set zoom">
                    <InputNumber
                        value={zoom}
                        onChange={(value: number | null) =>
                            setZoom(value as number)
                        }
                    />
                </Lot>

                <Lot label="Toggle OSM">
                    <Switch value={osm} onClick={() => setOsm(!osm)} />
                </Lot>
                <Lot label="Set X">
                    <InputNumber
                        value={center[0]}
                        defaultValue={0}
                        step="10000"
                        onChange={(value: number | null) =>
                            setCenter((center) => [value as number, center[1]])
                        }
                    />
                </Lot>
                <Lot label="Set Y">
                    <InputNumber
                        value={center[1]}
                        defaultValue={0}
                        step="10000"
                        onChange={(value: number | null) =>
                            setCenter((center) => [center[0], value as number])
                        }
                    />
                </Lot>
            </Area>
            <MapComponent
                zoom={zoom}
                center={center}
                basemap={osm}
                style={{ height: "50vh" }}
            ></MapComponent>
        </>
    );
}

export default MapComponetTest;
