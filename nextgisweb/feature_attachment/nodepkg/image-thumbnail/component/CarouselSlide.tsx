import { Suspense, lazy, useEffect, useState } from "react";

import { Image, Spin } from "@nextgisweb/gui/antd";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { LoadingOutlined } from "@ant-design/icons";

const PhotospherePreview = lazy(() => import("./PhotospherePreview"));

interface CarouselSlideProps {
    url: string;
    showPanorama: boolean;
}

function CentralLoading() {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
                width: "100%",
            }}
        >
            <Spin
                indicator={
                    <LoadingOutlined
                        style={{ fontSize: 24, color: "white" }}
                        spin={true}
                    />
                }
            />
        </div>
    );
}

export function CarouselSlide({ url, showPanorama }: CarouselSlideProps) {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const { makeSignal } = useAbortController();
    useEffect(() => {
        setLoading(true);
        let objectURL: string | undefined = undefined;
        fetch(url, { cache: "force-cache", signal: makeSignal() })
            .then((resp) => {
                return resp.blob();
            })
            .then((blob) => {
                objectURL = URL.createObjectURL(blob);
                setImageSrc(objectURL);
            })
            .finally(() => {
                setLoading(false);
            });

        return () => {
            if (objectURL) {
                URL.revokeObjectURL(objectURL);
            }
        };
    }, [makeSignal, url]);

    if (loading) {
        return <CentralLoading />;
    }

    if (!imageSrc) {
        return gettext("Failed to upload image");
    }

    return showPanorama ? (
        <Suspense fallback={<CentralLoading />}>
            <PhotospherePreview url={imageSrc} />
        </Suspense>
    ) : (
        <Image src={imageSrc} preview={false} />
    );
}
