import type { RenderPostprocess } from "@nextgisweb/render/type/api";

export type PreviewPostprocess = Partial<RenderPostprocess> | null;
export type PreviewPostprocessParamName = `postprocess[${number}]`;

export interface PreviewPostprocessParam {
  name: PreviewPostprocessParamName;
  value: string;
}

export function buildPreviewPostprocessParam(
  resourceId: number,
  postprocess: PreviewPostprocess
): PreviewPostprocessParam | null {
  if (postprocess === null) {
    return null;
  }

  return {
    name: `postprocess[${resourceId}]`,
    value: JSON.stringify(postprocess),
  };
}

export function appendPreviewPostprocessParam(
  searchParams: URLSearchParams,
  resourceId: number,
  postprocess: PreviewPostprocess
) {
  const param = buildPreviewPostprocessParam(resourceId, postprocess);
  if (param !== null) {
    searchParams.set(param.name, param.value);
  }
}
