/* Released under the BSD 2-Clause License
 *
 * Copyright © 2018-present, terrestris GmbH & Co. KG and GeoStyler contributors
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice,
 *   this list of conditions and the following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

import OlStyleParser from "geostyler-openlayers-parser";
import type { Style, Symbolizer, SymbolizerKind } from "geostyler-style";
import _get from "lodash-es/get";
import _uniqueId from "lodash-es/uniqueId";
import OlFeature from "ol/Feature";
import OlMap from "ol/Map";
import OlView from "ol/View";
import OlGeomLineString from "ol/geom/LineString";
import OlGeomPoint from "ol/geom/Point";
import OlGeomPolygon from "ol/geom/Polygon";
import OlLayerVector from "ol/layer/Vector";
import OlSourceVector from "ol/source/Vector";
import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";

import "ol/ol.css";
import "./OlRenderer.less";

export interface OlRendererProps {
    symbolizers: Symbolizer[];
    symbolizerKind?: SymbolizerKind;
    onClick?: (symbolizers: Symbolizer[], event: unknown) => void;
}

/**
 * Symbolizer Renderer UI.
 */
export const OlRenderer: React.FC<OlRendererProps> = ({
    onClick,
    symbolizerKind,
    symbolizers,
}) => {
    /** reference to the underlying OpenLayers map */
    const map = useRef<OlMap>();
    const layer = useRef<OlLayerVector<OlSourceVector>>();
    const [mapId] = useState(_uniqueId("map_"));

    const getSampleGeomFromSymbolizer = useCallback(() => {
        const kind: SymbolizerKind | undefined =
            symbolizerKind || _get(symbolizers, "[0].kind");
        switch (kind) {
            case "Mark":
            case "Icon":
            case "Text":
                return new OlGeomPoint([0, 0]);
            case "Fill":
                return new OlGeomPolygon([
                    [
                        [0, 0],
                        [0, 1],
                        [1, 1],
                        [1, 0],
                        [0, 0],
                    ],
                ]);
            case "Line":
                return new OlGeomLineString([
                    [0, 0],
                    [1, 0],
                ]);
            default:
                return new OlGeomPoint([0, 0]);
        }
    }, [symbolizerKind, symbolizers]);

    const updateFeature = useCallback(() => {
        const source = layer.current && layer.current.getSource();
        if (source) {
            source.clear();
            const sampleFeature = new OlFeature({
                geometry: getSampleGeomFromSymbolizer(),
                Name: "Sample Feature",
            });
            source.addFeature(sampleFeature);
            // zoom to feature extent
            const extent = source.getExtent();
            if (map.current) {
                map.current.getView().fit(extent, {
                    maxZoom: 20,
                });
            }
        }
    }, [getSampleGeomFromSymbolizer]);

    useEffect(() => {
        layer.current = new OlLayerVector({
            source: new OlSourceVector(),
        });
        map.current = new OlMap({
            layers: [layer.current],
            controls: [],
            interactions: [],
            target: mapId,
            view: new OlView({
                projection: "EPSG:4326",
            }),
        });
    }, [mapId]);

    useEffect(() => {
        updateFeature();
    }, [updateFeature]);

    /**
     * Transforms the incoming symbolizers to an OpenLayers style object the
     * GeoStyler parser and applies it to the vector features on the map.
     *
     * @param {Symbolizer[]} newSymbolizers The symbolizers holding the style to apply
     */
    const applySymbolizers = async (newSymbolizers: Symbolizer[]) => {
        if (!newSymbolizers) {
            return undefined;
        }
        const styleParser = new OlStyleParser();

        // we have to wrap the symbolizer in a Style object since the writeStyle
        // only accepts a Style object
        const style: Style = {
            name: "WrapperStyle4Symbolizer",
            rules: [
                {
                    name: "WrapperRule4Symbolizer",
                    symbolizers: structuredClone(newSymbolizers),
                },
            ],
        };
        // parser style to OL style
        const { output: olStyles, errors = [] } = await styleParser.writeStyle(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            style as any
        );
        if (errors.length > 0) {
            return undefined;
        } else if (layer.current) {
            // apply new OL style to vector layer
            layer.current.setStyle(olStyles);
            return olStyles;
        }
    };

    useEffect(() => {
        applySymbolizers(symbolizers);
    }, [symbolizers]);

    return (
        <div
            onClick={(event) => {
                if (onClick) {
                    onClick(symbolizers, event);
                }
            }}
            className="gs-symbolizer-olrenderer"
            role="presentation"
            id={mapId}
        />
    );
};
