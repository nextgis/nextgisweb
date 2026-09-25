import { useState } from "react";
import type { ReactNode } from "react";

import type { FeatureItem } from "@nextgisweb/feature-layer/type";
import { Popover } from "@nextgisweb/gui/antd";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import { route } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { FeatureInfoSection } from "../../identify/component/FeatureInfoSection";

import "./SearchResultPopover.less";

const msgError = gettext("Failed to load matched fields");

export interface SearchResultPopoverProps {
  resourceId: number;
  featureId: number;
  searchContext: number[];
  children: ReactNode;
}

export function SearchResultPopover({
  resourceId,
  featureId,
  searchContext,
  children,
}: SearchResultPopoverProps) {
  const [featureItem, setFeatureItem] = useState<FeatureItem | undefined>();
  const [error, setError] = useState(false);
  const { makeSignal, abort } = useAbortController();

  const onOpenChange = async (open: boolean) => {
    if (!open) {
      abort();
      return;
    }

    setError(false);

    const signal = makeSignal();

    const feature = await route(
      "feature_layer.feature.item",
      resourceId,
      featureId
    ).get({
      query: {
        geom: false,
        dt_format: "iso",
      },
      cache: true,
      signal,
    });

    setFeatureItem(feature);
  };

  let popoverContent: ReactNode;
  if (error) {
    popoverContent = <div>{msgError}</div>;
  } else {
    popoverContent = (
      <LoadingWrapper
        loading={!featureItem}
        rows={searchContext.length}
        title={false}
        style={{ width: 300 }}
      >
        {featureItem && (
          <FeatureInfoSection
            resourceId={resourceId}
            featureItem={featureItem}
            showGeometryInfo={false}
            showAttributes
          />
        )}
      </LoadingWrapper>
    );
  }
  const POPUP_GAP = 8;
  return (
    <Popover
      placement="right"
      autoAdjustOverflow
      arrow={false}
      mouseEnterDelay={0.5}
      styles={{
        root: {
          width: 300,

          paddingBlock: POPUP_GAP,
        },

        container: {
          maxHeight: `calc(70dvh - ${POPUP_GAP * 2}px)`,
          overflowY: "auto",
          overscrollBehavior: "contain",
        },
      }}
      onOpenChange={onOpenChange}
      content={
        <div onClick={(event) => event.stopPropagation()}>{popoverContent}</div>
      }
    >
      {children}
    </Popover>
  );
}

SearchResultPopover.displayName = "SearchResultPopover";
