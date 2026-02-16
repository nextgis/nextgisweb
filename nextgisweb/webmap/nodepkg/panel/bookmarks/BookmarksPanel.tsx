import { useVirtualizer } from "@tanstack/react-virtual";
import classNames from "classnames";
import { sortBy } from "lodash-es";
import { observer } from "mobx-react-lite";
import { useEffect, useRef, useState, useTransition } from "react";

import { Spin } from "@nextgisweb/gui/antd";
import { route } from "@nextgisweb/pyramid/api";
import { useAbortController, useRouteGet } from "@nextgisweb/pyramid/hook";

import { PanelContainer } from "../component";
import type { PanelPluginWidgetProps } from "../registry";

import "./BookmarksPanel.less";

interface Bookmark {
    key: number;
    label: string;
}

type BookmarkRowProps = {
    start: number;
    bookmark: Bookmark;
    selectedKey?: number;
    onSelect: (b: Bookmark) => void;
};

function BookmarkRow({
    start,
    bookmark,
    selectedKey,
    onSelect,
}: BookmarkRowProps) {
    const isSelected = selectedKey === bookmark.key;

    return (
        <div
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${start}px)`,
            }}
        >
            <div
                className={classNames("bookmark", isSelected && "selected")}
                onClick={() => !isSelected && onSelect(bookmark)}
            >
                <span>{bookmark.label}</span>
            </div>
        </div>
    );
}

const BookmarksPanel = observer<PanelPluginWidgetProps>(
    ({ store, display }) => {
        const bookmarkLayerId = display.config.bookmarkLayerId;

        const { makeSignal, abort } = useAbortController();

        const [bookmarkSelected, setBookmarkSelected] = useState<Bookmark>();
        const selectedKey = bookmarkSelected?.key;

        const { data, isLoading } = useRouteGet({
            name: "feature_layer.feature.collection",
            params: { id: bookmarkLayerId },
            options: {
                query: {
                    geom: false,
                    label: true,
                    dt_format: "iso",
                    fields: [],
                    extensions: [],
                },
            },
        });

        const [isPending, startTransition] = useTransition();
        const [bookmarks, setBookmarks] = useState<Bookmark[] | null>(null);

        useEffect(() => {
            if (!data) {
                setBookmarks(null);
                return;
            }

            startTransition(() => {
                const prepared = sortBy(
                    // @ts-expect-error wait for server-side type definition
                    data.map((f) => ({ key: f.id, label: f.label })),
                    ["label", "key"]
                ) as Bookmark[];

                setBookmarks(prepared);
            });
        }, [data]);

        const selectBookmark = async (bookmark: Bookmark) => {
            abort();
            const result = await route(
                "feature_layer.feature.item_extent",
                bookmarkLayerId,
                bookmark.key
            ).get({ signal: makeSignal() });

            display.map.zoomToNgwExtent(
                // @ts-expect-error Extent may be null for features without geometries
                result.extent,
                {
                    displayProjection: display.displayProjection,
                }
            );

            setBookmarkSelected(bookmark);
        };

        const parentRef = useRef<HTMLDivElement | null>(null);

        const rowVirtualizer = useVirtualizer({
            count: bookmarks?.length ?? 0,
            getScrollElement: () => parentRef.current,
            estimateSize: () => 34,
            overscan: 8,
        });

        const shouldShowSpinner = isLoading || isPending || !bookmarks;

        const content = shouldShowSpinner ? (
            <Spin
                className="loading"
                styles={{ indicator: { fontSize: 30 } }}
            />
        ) : (
            <div ref={parentRef} className="bookmarks-list">
                <div
                    style={{
                        height: rowVirtualizer.getTotalSize(),
                        position: "relative",
                    }}
                >
                    {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                        const item = bookmarks[virtualItem.index];
                        return (
                            <BookmarkRow
                                key={item.key}
                                bookmark={item}
                                start={virtualItem.start}
                                selectedKey={selectedKey}
                                onSelect={selectBookmark}
                            />
                        );
                    })}
                </div>
            </div>
        );

        return (
            <PanelContainer
                className="ngw-webmap-panel-bookmarks"
                title={store.title}
                close={store.close}
                components={{ content: PanelContainer.Unpadded }}
            >
                {content}
            </PanelContainer>
        );
    }
);

BookmarksPanel.displayName = "BookmarksPanel";
export default BookmarksPanel;
