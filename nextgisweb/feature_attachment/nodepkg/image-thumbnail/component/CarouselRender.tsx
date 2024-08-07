import { Fragment, Suspense, lazy, useEffect, useState } from "react";

import { Button, Carousel, Image, Spin, Tooltip } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { isFileImage } from "../../attachment-editor/AttachmentEditor";
import type {
    DataSource,
    FileMetaToUpload,
} from "../../attachment-editor/type";
import type { FeatureAttachment } from "../../type";
import { isFeatureAttachment } from "../ImageThumbnail";
import { getFeatureImage } from "../util/getFeatureImage";
import { getFileImage } from "../util/getFileImage";

import { LoadingOutlined } from "@ant-design/icons";
import ArrowForward from "@nextgisweb/icon/material/arrow_forward_ios";
import PhotosphereIcon from "@nextgisweb/icon/material/panorama_photosphere";

import "./CarouselRender.less";

const msgTogglePanorama = gettext("Toggle panorama viewer");

const PhotospherePreview = lazy(() => import("./PhotospherePreview"));

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
    featureId: number;
}

interface urlPanorama {
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
    const [togglePanorama, setTogglePanorama] = useState(true);
    const [fileName, setFileName] = useState<string>();
    const [description, setDescription] = useState<string>();
    const [imageUrlIsPanorama, setImageUrlIsPanorama] =
        useState<urlPanorama[]>();

    const imageList = data.filter((d) => {
        if (isFeatureAttachment(d)) {
            if ("is_image" in d) {
                return d.is_image;
            }
            return false;
        } else if ("_file" in d && d._file instanceof File) {
            return isFileImage(d._file);
        }
    });
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
    const [visibility, setVisibility] = useState<boolean>();
    useEffect(() => {
        async function getUrl() {
            const imageUrlIsPanorama_ = await Promise.all(
                imageList.map(async (d) => {
                    if (isFeatureAttachment(d)) {
                        const a = d as FeatureAttachment;
                        return getFeatureImage({
                            attachment: a,
                            resourceId,
                            featureId,
                        });
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
            setImageUrlIsPanorama(imageUrlIsPanorama_);
            setVisibility(imageUrlIsPanorama_[start].isPanorama);
            setDescription(imageUrlIsPanorama_[start].description);
            setFileName(imageUrlIsPanorama_[start].fileName);
        }
        getUrl();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <Fragment>
            <div className="ngw-feature-attachment-carousel-render-toolbar">
                {(description || fileName) && (
                    <div className="title">
                        {description || (
                            <span className="filename">{fileName}</span>
                        )}
                    </div>
                )}
                {visibility && (
                    <TogglePanoramaButton
                        value={togglePanorama}
                        onClick={() => {
                            setTogglePanorama(!togglePanorama);
                        }}
                    />
                )}
            </div>

            <Carousel
                rootClassName="ngw-feature-attachment-carousel-render"
                initialSlide={start}
                beforeChange={(_, currentSlide) => {
                    setVisibility(
                        imageUrlIsPanorama
                            ? imageUrlIsPanorama[currentSlide].isPanorama
                            : false
                    );
                    setDescription(
                        imageUrlIsPanorama
                            ? imageUrlIsPanorama[currentSlide].description
                            : ""
                    );
                    1;
                    setFileName(
                        imageUrlIsPanorama
                            ? imageUrlIsPanorama[currentSlide].fileName
                            : ""
                    );
                }}
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
            >
                {imageUrlIsPanorama
                    ? imageUrlIsPanorama.map(({ url, isPanorama }, index) => {
                          return togglePanorama && isPanorama ? (
                              <Suspense
                                  key={index}
                                  fallback={
                                      <Spin
                                          indicator={
                                              <LoadingOutlined
                                                  style={{
                                                      fontSize: 24,
                                                      color: "white",
                                                  }}
                                                  spin={true}
                                              />
                                          }
                                      />
                                  }
                              >
                                  <PhotospherePreview url={url} />
                              </Suspense>
                          ) : (
                              <Fragment key={index}>
                                  <Image src={url} preview={false} />
                              </Fragment>
                          );
                      })
                    : null}
            </Carousel>
        </Fragment>
    );
}
