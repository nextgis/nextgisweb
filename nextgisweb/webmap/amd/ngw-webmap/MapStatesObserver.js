define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'ngw/utils/make-singleton'
], function (declare, array, MakeSingleton) {
    return MakeSingleton(declare('ngw-webmap.MapStatesObserver', [], {
        _states: {},
        _defaultState: null,
        _currentState: null,

        constructor: function (options) {
            if (!options) {
                return true;
            }

            if (options.states) {
                array.forEach(options.states, function (stateItem) {
                    this.addState(stateItem.state, stateItem.control);
                }, this);
            }

            if (options.defaultState) {
                this.setDefaultState(options.defaultState);
            }
        },

        addState: function (state, control, activate) {

            if (this._states.hasOwnProperty(state)) {
                throw new Exception('State "' + state + '" already registered.');
            }

            this._states[state] = {
                control: control
            };

            if (activate) {
                this.activateState(state);
            }
        },

        removeState: function (state) {
            delete this._states[state];
        },

        activateState: function (state) {
            if (!this._states.hasOwnProperty(state)) {
                return false;
            }

            if (this._currentState && this._currentState === state) return true;

            if (this._currentState) {
                this._states[this._currentState].control.deactivate();

            }
            this._states[state].control.activate();
            this._currentState = state;
            return true;
        },

        deactivateState: function (state) {
            if (!this._states.hasOwnProperty(state) ||
                state !== this._currentState) {
                return false;
            }

            this._states[state].control.deactivate();
            this._currentState = null;
            if (this._defaultState && this._defaultState !== state) {
                this.activateState(this._defaultState);
            }
            return true;
        },

        setDefaultState: function (state, activate) {
            this._defaultState = state;
            if (activate) {
                this.activateState(state);
            }
        },

        activateDefaultState: function () {
            this.activateState(this._defaultState);
        },

        getActiveState: function () {
            if (!this._currentState) return false;
            return this._currentState;
        }
    }));
});
