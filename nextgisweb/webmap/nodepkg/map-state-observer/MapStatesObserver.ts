import { makeSingleton } from "../utils/makeSingleton";

export interface StateControl {
    activate: () => void;
    deactivate: () => void;
}

interface StateItem {
    state: string;
    control?: StateControl;
}

interface MapStatesObserverOptions {
    states?: StateItem[];
    defaultState?: string;
}

export class MapStatesObserver {
    private _states: Record<string, { control: StateControl | null }> = {};
    private _defaultState: string | null = null;
    private _currentState: string | null = null;

    constructor(options?: MapStatesObserverOptions) {
        if (!options) return;

        if (options.states) {
            options.states.forEach((stateItem) => {
                this.addState(stateItem.state, stateItem.control || null);
            });
        }

        if (options.defaultState) {
            this.setDefaultState(options.defaultState);
        }
    }

    addState(
        state: string,
        control?: StateControl | null,
        activate?: boolean
    ): void {
        if (Object.prototype.hasOwnProperty.call(this._states, state)) {
            return;
        }

        this._states[state] = {
            control: control ?? null,
        };

        if (activate) {
            this.activateState(state);
        }
    }

    removeState(state: string): void {
        delete this._states[state];
    }

    activateState(state: string): boolean {
        if (!Object.prototype.hasOwnProperty.call(this._states, state)) {
            return false;
        }

        const affectGlobalState = this.shouldAffectState(state);

        if (
            this._currentState &&
            this._currentState === state &&
            affectGlobalState
        ) {
            return true;
        }

        if (this._currentState && affectGlobalState) {
            const currentControl = this._states[this._currentState].control;
            currentControl?.deactivate();
        }

        const stateControl = this._states[state].control;
        stateControl?.activate();

        if (affectGlobalState) {
            this._currentState = state;
        }

        return true;
    }

    deactivateState(state: string): boolean {
        const affectGlobalState = this.shouldAffectState(state);

        if (
            !Object.prototype.hasOwnProperty.call(this._states, state) ||
            (state !== this._currentState && affectGlobalState)
        ) {
            return false;
        }

        const stateControl = this._states[state].control;
        stateControl?.deactivate();

        if (
            this._defaultState &&
            this._defaultState !== state &&
            affectGlobalState
        ) {
            this._currentState = null;
            this.activateState(this._defaultState);
        }

        return true;
    }

    shouldAffectState(stateName: string): boolean {
        return !stateName.startsWith("~");
    }

    setDefaultState(state: string, activate?: boolean): void {
        this._defaultState = state;
        if (activate) {
            this.activateState(state);
        }
    }

    activateDefaultState(): void {
        if (this._defaultState) {
            this.activateState(this._defaultState);
        }
    }

    getActiveState(): string | null {
        return this._currentState;
    }
}

export const MapStatesObserverSingleton = makeSingleton(MapStatesObserver);
