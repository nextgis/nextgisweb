import { Card } from "antd";
import type { Symbolizer as GSSymbolizer } from "geostyler-style";

import { OlRenderer } from "./OlRenderer";

import "./SymbolizerCard.less";

export interface SymbolizerCardProps {
  /** The callback when the symbolizer was clicked. */
  onSymbolizerClick?: (symbolizer: GSSymbolizer[]) => void;
  /** A GeoStyler-Style object. */
  symbolizer: GSSymbolizer[];
}

export function SymbolizerCard({
  symbolizer,
  onSymbolizerClick = () => {},
}: SymbolizerCardProps) {
  const onCardClick = () => {
    onSymbolizerClick(symbolizer);
  };

  return (
    <Card className="gs-symbolizer-card" hoverable={true} onClick={onCardClick}>
      <OlRenderer symbolizers={symbolizer} />
    </Card>
  );
}
