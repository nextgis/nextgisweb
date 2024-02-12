import { Fragment, Suspense, lazy, useEffect, useState } from "react";

import { isFileImage } from "@nextgisweb/feature-attachment/attachment-editor/AttachmentEditor";
import { isFeatureAttachment } from "@nextgisweb/feature-attachment/image-thumbnail/ImageThumbnail";
import { getFileImage } from "@nextgisweb/feature-attachment/image-thumbnail/util/getFileImage";
import { Carousel, FloatButton, Image, Spin } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type {
    DataSource,
    FileMetaToUpload,
} from "../../attachment-editor/type";
import type { FeatureAttachment } from "../../type";
import { getFeatureImage } from "../util/getFeatureImage";

import { LoadingOutlined } from "@ant-design/icons";
import ArrowBack from "@nextgisweb/icon/material/arrow_back_ios_new";
import ArrowForward from "@nextgisweb/icon/material/arrow_forward_ios";
import PhotosphereIcon from "@nextgisweb/icon/material/panorama_photosphere";

import "./CarouselRender.less";

const msgTogglePanorama = gettext("Toggle panorama viewer");

const PhotospherePreview = lazy(() => import("./PhotospherePreview"));

// based on https://github.com/akiran/react-slick/issues/1195#issuecomment-1746192879
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

interface CarouselRenderProps {
    attachment: DataSource;
    data: DataSource[];
    resourceId: number;
    featureId: number;
}

interface urlPanorama {
    url: string;
    isPanorama: boolean;
}

export function CarouselRender({
    data,
    attachment,
    resourceId,
    featureId,
}: CarouselRenderProps) {
    const [togglePanorama, setTogglePanorama] = useState(true);
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
                        return { url: url_, isPanorama: false };
                    }
                })
            );
            setImageUrlIsPanorama(imageUrlIsPanorama_);
            setVisibility(imageUrlIsPanorama_[start].isPanorama);
        }
        getUrl();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <Fragment>
            {visibility ? (
                <FloatButton
                    type={togglePanorama ? "primary" : "default"}
                    tooltip={msgTogglePanorama}
                    icon={<PhotosphereIcon />}
                    onClick={() => {
                        setTogglePanorama(!togglePanorama);
                    }}
                />
            ) : null}

            <Carousel
                rootClassName="ngw-feature-attachment-carousel-render"
                initialSlide={start}
                beforeChange={(_, currentSlide) => {
                    setVisibility(
                        imageUrlIsPanorama
                            ? imageUrlIsPanorama[currentSlide].isPanorama
                            : false
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
