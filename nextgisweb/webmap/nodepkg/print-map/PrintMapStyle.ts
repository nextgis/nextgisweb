export interface PrintStyleParams {
    widthPage: number;
    heightPage: number;
    widthMap: number;
    heightMap: number;
    margin: number;
}

export const buildPrintStyle = (params: PrintStyleParams): string => {
    return `
    .print-map-page {
      width: ${params.widthPage}px;
      height: ${params.heightPage}px;
      padding: 0;
      background-color: white;
      box-shadow: 0 0 6px 0 rgb(23, 68, 107);
    }

    .print-map-export-wrapper {
      width: ${params.widthPage}px;
      height: ${params.heightPage}px;
      padding: 0;
    }

    .print-map-page .print-map div.ol-viewport {
        width: ${params.widthMap}px !important;
        height: ${params.heightMap}px !important;
    }

    .print-map-page .print-map img.map-logo {
        position: absolute;
        z-index: 9999999;
        top: 2px;
        right: 2px;
    }

    .print-map {
        width: ${params.widthMap}px !important;
        height: ${params.heightMap}px !important;
        padding: 0 !important;
        overflow: hidden !important;
        margin: ${params.margin}px;
        top: 0;
        left: 0;
    }

    @page {
        size: ${params.widthPage}px ${params.heightPage}px;
        margin: ${params.margin}px;
    }

    @media print {
        html, body {
            width: ${params.widthPage}px !important;
            height: ${params.heightPage}px !important;
            padding: 0 !important;
            margin: 0 !important;
            min-width: ${params.widthPage}px !important;
            max-width: ${params.widthPage}px !important;
        }

        body > * {
            display: none !important;
        }

        body .print-map-pane  {
          display: block !important;
          width: ${params.widthPage}px !important;
          height: ${params.heightPage}px !important;
          overflow: hidden !important;
          left: 0 !important;
          top: 0 !important;
          padding: 0 !important;
        }

        .print-map-pane .print-map-page-wrapper {
          box-shadow: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .print-map-pane .map-container {
            left: 0px !important;
            top: 0px !important;
            width: ${params.widthPage}px !important;
            height: ${params.heightPage}px !important;
        }

        .print-map-pane .print-map-export-wrapper,
        .print-map-pane .print-map-page,
        .print-map-pane .print-map {
          width: ${params.widthMap}px !important;
          height: ${params.heightMap}px !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
        }

        .print-map-pane div.print-map-export-wrapper {
          position: absolute;
          margin: ${params.margin}px !important;
        }

        #webmap-wrapper {
          top: 0 !important;
        }
    }`;
};
