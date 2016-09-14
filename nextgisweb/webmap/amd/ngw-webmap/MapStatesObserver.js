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
            if (this._states.hasOwnProperty(state)) {
                if (this._currentState) {
                    this._states[this._currentState].control.deactivate();
                }
                this._states[state].control.activate();
                this._currentState = state;
                return true;
            } else {
                return false;
            }
        },

        deactivateState: function (state) {
            if (this._states.hasOwnProperty(state)) {
                this._states[state].control.deactivate();
                this._currentState = null;
                if (this._defaultState) {
                    this.activateState(this._defaultState);
                }
                return true;
            } else {
                return false;
            }
        },

        setDefaultState: function (state, activate) {
            this._defaultState = state;
            if (activate) {
                this.activateState(state);
            }
        }
    }));
});
