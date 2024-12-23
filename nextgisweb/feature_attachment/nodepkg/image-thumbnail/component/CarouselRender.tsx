import type { CarouselRef } from "antd/es/carousel";
import {
    Fragment,
    useEffect,
    useMemo,
    useReducer,
    useRef,
    useState,
} from "react";

import { isFileImage } from "@nextgisweb/feature-attachment/attachment-editor/util/isFileImage";
import { Button, Carousel, Tooltip } from "@nextgisweb/gui/antd";
import { useKeydownListener } from "@nextgisweb/gui/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type {
    DataSource,
    FileMetaToUpload,
} from "../../attachment-editor/type";
import type { FeatureAttachment } from "../../type";
import { isFeatureAttachment } from "../ImageThumbnail";
import { getFeatureImage } from "../util/getFeatureImage";
import { getFileImage } from "../util/getFileImage";

import { CarouselSlide } from "./CarouselSlide";

import ArrowForward from "@nextgisweb/icon/material/arrow_forward_ios";
import PhotosphereIcon from "@nextgisweb/icon/material/panorama_photosphere";

import "./CarouselRender.less";

const msgTogglePanorama = gettext("Toggle panorama viewer");

// Based on https://github.com/akiran/react-slick/issues/1195#issuecomment-1746192879
const SlickButtonFix = (
    props: {
        children: JSX.Element;
        currentSlide?: number;
        slideCount?: number;
    } & object
) => {
    const { children, ...otherProps } = props;
    delete otherProps.currentSlide;
    delete otherProps.slideCount;
    return <div {...otherProps}>{children}</div>;
};

// The 'arrow_back_ios' has invalid alignment (see ), the fixed version
// ('arrow_back_ios_new') is missing in SVG icons package. See:
// * https://github.com/google/material-design-icons/issues/1744
// * https://github.com/marella/material-symbols/issues/40
const ArrowBack = () => (
    <ArrowForward style={{ transform: "rotate(180deg)" }} />
);

interface CarouselRenderProps {
    attachment: DataSource;
    data: DataSource[];
    resourceId: number;
    featureId: number | null;
}

interface Attachment {
    url: string;
    isPanorama: boolean;
    fileName: string;
    description?: string;
}

function TogglePanoramaButton(props: { value: boolean; onClick: () => void }) {
    return (
        <Tooltip title={msgTogglePanorama}>
            <Button
                shape="circle"
                type="text"
                className={props.value ? "toggle-on" : undefined}
                icon={<PhotosphereIcon />}
                onClick={props.onClick}
            />
        </Tooltip>
    );
}

export function CarouselRender({
    data,
    attachment,
    resourceId,
    featureId,
}: CarouselRenderProps) {
    const carouselRef = useRef<CarouselRef>(null);

    const [panoramaMode, togglePanoramaMode] = useReducer(
        (state) => !state,
        true
    );
    const [attachments, setAttachments] = useState<Attachment[]>([]);

    const imageList = useMemo(
        () =>
            data.filter((d) => {
                if (isFeatureAttachment(d)) {
                    if ("is_image" in d) {
                        return d.is_image;
                    }
                    return false;
                } else if ("_file" in d && d._file instanceof File) {
                    return isFileImage(d._file);
                }
            }),
        [data]
    );
    const [start] = useState(() =>
        imageList.findIndex((d) => {
            if (isFeatureAttachment(attachment)) {
                const image = d as FeatureAttachment;
                return image.id === attachment.id;
            } else {
                const fileImage = d as FileMetaToUpload;
                return fileImage._file === attachment._file;
            }
        })
    );
    const [activeSlide, setActiveSlide] = useState(start);

    const { isPanorama, description, fileName } = useMemo(() => {
        return attachments[activeSlide] ?? {};
    }, [attachments, activeSlide]);

    useEffect(() => {
        async function getUrl() {
            const attachments = await Promise.all(
                imageList.map(async (d) => {
                    if (
                        isFeatureAttachment(d) &&
                        typeof featureId === "number"
                    ) {
                        const a = d as FeatureAttachment;
                        return {
                            ...getFeatureImage({
                                attachment: a,
                                resourceId,
                                featureId,
                            }),
                        };
                    } else {
                        const fileImage = d as FileMetaToUpload;
                        const url_ = await getFileImage(
                            fileImage._file as File
                        );
                        return {
                            url: url_,
                            isPanorama: false,
                            fileName: fileImage.name,
                            description: fileImage.description,
                        };
                    }
                })
            );
            setAttachments(attachments);
        }
        getUrl();
    }, [featureId, imageList, resourceId, start]);

    useKeydownListener("ArrowLeft", () => {
        carouselRef.current?.prev();
    });
    useKeydownListener("ArrowRight", () => {
        carouselRef.current?.next();
    });

    return (
        <>
            <div className="ngw-feature-attachment-carousel-render-toolbar">
                {(description || fileName) && (
                    <div className="title">
                        {description || (
                            <span className="filename">{fileName}</span>
                        )}
                    </div>
                )}
                {isPanorama && (
                    <TogglePanoramaButton
                        value={panoramaMode}
                        onClick={togglePanoramaMode}
                    />
                )}
            </div>
            <Carousel
                ref={carouselRef}
                rootClassName="ngw-feature-attachment-carousel-render"
                initialSlide={start}
                beforeChange={(_, currentSlide) => setActiveSlide(currentSlide)}
                arrows={true}
                prevArrow={
                    <SlickButtonFix>
                        <ArrowBack />
                    </SlickButtonFix>
                }
                nextArrow={
                    <SlickButtonFix>
                        <ArrowForward />
                    </SlickButtonFix>
                }
                // Use this prop to prevent slides double render
                // https://github.com/ant-design/ant-design/issues/25289#issuecomment-1065005918
                infinite={false}
            >
                {attachments.map(({ url, isPanorama }, index) => {
                    return (
                        <Fragment key={index}>
                            {index === activeSlide ? (
                                <CarouselSlide
                                    url={url}
                                    showPanorama={isPanorama && panoramaMode}
                                />
                            ) : (
                                <></>
                            )}
                        </Fragment>
                    );
                })}
            </Carousel>
        </>
    );
}
