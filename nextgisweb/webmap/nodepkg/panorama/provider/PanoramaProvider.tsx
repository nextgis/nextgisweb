import classNames from "classnames";
import { useEffect, useEffectEvent, useRef } from "react";
import type { CSSProperties } from "react";

import type {
  AvailabilityStatus,
  PanoramaPlayer,
  PanoramaPlayerFactory,
  PanoramaProviderProps,
} from "../type";

import "./PanoramaProvider.less";

interface Props extends PanoramaProviderProps {
  style?: CSSProperties;
  className?: string;
  createPlayer: PanoramaPlayerFactory;
}

export function PanoramaProvider({
  style,
  apiKey,
  position,
  pov,
  className,
  onPositionChanged,
  onStatusChanged,
  onPovChanged,
  createPlayer,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<PanoramaPlayer | null>(null);
  const positionChanged = useEffectEvent(onPositionChanged);
  const povChanged = useEffectEvent(onPovChanged);

  useEffect(() => {
    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [apiKey, createPlayer]);

  useEffect(() => {
    let cancelled = false;

    async function show() {
      let status: AvailabilityStatus = "error";
      try {
        const container = containerRef.current;
        if (container) {
          if (!playerRef.current) {
            playerRef.current = createPlayer(container, apiKey, {
              onPositionChanged: positionChanged,
              onPovChanged: povChanged,
            });
          }
          status = await playerRef.current.show(position, pov);
        }
      } catch {
        status = "error";
      }
      if (!cancelled) onStatusChanged(status);
    }

    show();
    return () => {
      cancelled = true;
    };
  }, [apiKey, createPlayer, position, pov, onStatusChanged]);

  return (
    <div
      ref={containerRef}
      className={classNames("ngw-panorama-provider-container", className)}
      style={style}
    />
  );
}
