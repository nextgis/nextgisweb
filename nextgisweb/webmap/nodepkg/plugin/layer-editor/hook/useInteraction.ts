import type { Interaction } from "ol/interaction";
import { useEffect, useMemo } from "react";

import { useEditorContext } from "../context/useEditorContext";

export function useInteraction<T extends Interaction>(
    key: string,
    active: boolean,
    factory: () => T
): T {
    const { olMap, interactionsRef, interactionsVersion } = useEditorContext();

    const interaction = useMemo(() => {
        /**
         * IMPORTANT: re-creating interaction with the SAME
         * Feature or Source multiple times tends to makes editing laggy.
         *
         * A better fix would be to properly "clean" the features before attaching a new interaction.
         * I tried approaches with `feature.clone()`, but it's became too complex.
         */
        void interactionsVersion;
        const exist = interactionsRef.current.get(key);
        if (exist) {
            return exist as T;
        } else {
            const inter = factory();
            interactionsRef.current.set(key, inter);
            return inter;
        }
    }, [factory, interactionsRef, interactionsVersion, key]);

    useEffect(() => {
        olMap.addInteraction(interaction);
        interaction.setActive(false);
        return () => {
            interaction.setActive(false);
            olMap.removeInteraction(interaction);
        };
    }, [olMap, interaction, interactionsRef]);

    useEffect(() => {
        interaction.setActive(active);
    }, [interaction, active]);

    return interaction;
}
