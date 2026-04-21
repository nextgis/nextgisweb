import { useEffect, useMemo } from "react";

import { useRouteGet } from "@nextgisweb/pyramid/hook";

import { normalizePostprocessConfig, setPostprocessDefaults } from "./value";

export function useEffectsConfig() {
  const { data } = useRouteGet("render.effects.presets");
  const effectsConfig = useMemo(() => normalizePostprocessConfig(data), [data]);

  useEffect(() => {
    setPostprocessDefaults(effectsConfig.defaults);
  }, [effectsConfig.defaults]);

  return effectsConfig;
}
