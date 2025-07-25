/* Released under the BSD 2-Clause License
 *
 * Copyright © 2021-present, terrestris GmbH & Co. KG and GeoStyler contributors
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

import { Card } from "antd";
import type { Symbolizer as GSSymbolizer } from "geostyler-style";

import type { Symbolizer } from "../type/Style";
import { convertToGeostyler } from "../util/convertToGeostyler";

import { OlRenderer } from "./OlRenderer";

import "./SymbolizerCard.less";

export interface SymbolizerCardProps {
    /** The callback when the symbolizer was clicked. */
    onSymbolizerClick?: (symbolizer: Symbolizer) => void;
    /** A GeoStyler-Style object. */
    symbolizer: Symbolizer;
}

export const SymbolizerCard = ({
    symbolizer,
    onSymbolizerClick = () => {},
}: SymbolizerCardProps) => {
    const onCardClick = () => {
        onSymbolizerClick(symbolizer);
    };

    const gsSymbolizer: GSSymbolizer | null = convertToGeostyler(symbolizer);

    return (
        <Card
            className="gs-symbolizer-card"
            hoverable={true}
            onClick={onCardClick}
        >
            <OlRenderer symbolizers={gsSymbolizer ? [gsSymbolizer] : []} />
        </Card>
    );
};
