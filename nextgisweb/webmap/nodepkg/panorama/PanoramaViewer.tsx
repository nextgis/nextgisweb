import classNames from "classnames";
import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { CentralLoading } from "@nextgisweb/gui/component";
import { ErrorIcon } from "@nextgisweb/gui/icon";
import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { PanoramaStore } from "./PanoramaStore";
import { usePanoramaHandler } from "./hook/usePanoramaHandler";
import type { PanoramaPosition, PanoramaStatus } from "./type";

import PanoramaIcon from "@nextgisweb/icon/material/panorama_photosphere";

import "./PanoramaViewer.less";

export interface PanoramaViewerProps {
  store: PanoramaStore;
  className?: string;
  style?: CSSProperties;
}

const placeholders = {
  unavailable: {
    Icon: PanoramaIcon,
    message: gettext("No panorama available at this location"),
  },
  error: {
    Icon: ErrorIcon,
    message: gettext(
      "The panorama service is currently unavailable. Please try again at a later time or contact Web GIS administrator."
    ),
  },
};

export const PanoramaViewer = observer(
  ({ store, className, style }: PanoramaViewerProps) => {
    const { provider, position } = store;
    const status = store.status ?? "loading";
    const [displayed, setDisplayed] = useState(false);
    const providerRef = useRef(provider);
    const reportedRef = useRef<PanoramaPosition | null>(null);

    const {
      iframeRef,
      ready,
      setPosition,
      setProvider: setHostProvider,
    } = usePanoramaHandler({
      onPositionChanged: (lat, lng) => {
        reportedRef.current = { lat, lng };
        store.setPosition(lat, lng);
      },
      onPovChanged: store.setPov,
    });

    const updateStatus = useCallback(
      (next: PanoramaStatus) => {
        store.setStatus(next);
        if (next !== "loading") setDisplayed(next === "available");
      },
      [store]
    );

    const lat = position?.lat;
    const lng = position?.lng;

    useEffect(() => {
      if (!ready || lat === undefined || lng === undefined || !provider) {
        return;
      }

      const providerChanged = providerRef.current !== provider;
      if (providerChanged) {
        providerRef.current = provider;
        setDisplayed(false);
      } else {
        const reported = reportedRef.current;
        if (reported && reported.lat === lat && reported.lng === lng) return;
      }

      updateStatus("loading");
      setHostProvider(provider)
        .catch(() => {})
        .then(() => setPosition(lat, lng))
        .then(updateStatus);
    }, [ready, lat, lng, provider, setHostProvider, setPosition, updateStatus]);

    const placeholder =
      status === "unavailable" || status === "error"
        ? placeholders[status]
        : undefined;

    return (
      <div
        className={classNames("ngw-webmap-panorama-viewer", className)}
        style={style}
      >
        <div className="frame">
          <iframe
            ref={iframeRef}
            src={routeURL("webmap.panorama")}
            className={classNames({ hidden: !displayed })}
          />
          {status === "loading" && !displayed && (
            <div className="loading">
              <CentralLoading />
            </div>
          )}
          {placeholder && (
            <div className="placeholder">
              <placeholder.Icon />
              <span>{placeholder.message}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
);

PanoramaViewer.displayName = "PanoramaViewer";
