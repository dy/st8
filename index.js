/**
 * @module  st8
 *
 * Micro state machine.
 */


/**
 * Create a new state controller based on states passed
 *
 * @constructor
 *
 * @param {object} settings Initial states
 */

class State {
	#states
	#context
	#state
	#teardown
	#inited

	constructor(states, context) {
		//ignore existing state
		if (states instanceof State) return states;

		//ensure new state instance is created
		if (!(this instanceof State)) return new State(states);

		//save states object
		this.#states = states || {};

		//save context
		this.#context = context || this;
	}

	/**
	* Go to a state
	*
	* @param {*} value Any new state to enter
	*/

	set(value) {
		var prevValue = this.#state,
				states = this.#states,
		// console.group('set', value, prevValue);

		//leave old state
		oldStateName = states[prevValue] !== undefined ? prevValue : OTHERWISE,
		oldState = states[oldStateName],

		leaveResult, leaveFlag = '<' + oldStateName, teardown;

		if (this.#inited) {
			if (oldState) {
				if (!this[leaveFlag]) {
					this[leaveFlag] = true;

					// if oldState has after method - call it
					if (teardown = this.#teardown) this.#teardown = null, leaveResult = teardown?.call(this.#context)

					// ignore changing if leave result is falsy
					if (leaveResult === false) return this[leaveFlag] = false;

					// redirect, if returned anything
					else if (leaveResult !== undefined && leaveResult !== value) return this.set(leaveResult), this[leaveFlag] = false;
					this[leaveFlag] = false;

					// ignore redirect
					if (this.#state !== prevValue) return;
				}

				// ignore not changed value
				if (value === prevValue) return false;
			}
		}
		else this.#inited = 1

		//set current value
		this.#state = value;

		//try to enter new state
		var newStateName = value in states ? value : OTHERWISE,
				newState = states[newStateName],
				enterResult,
				enterFlag = '>' + newStateName;

		if (!this[enterFlag]) {
			this[enterFlag] = true;

			enterResult = newState?.call ? newState.call(this.#context) : newState

			// ignore entering falsy state
			if (enterResult === false) return this.set(prevValue), this[enterFlag] = false;

			// returned function means teardown
			else if (enterResult?.call) { if (!this.#teardown) this.#teardown = enterResult }

			// redirect if returned anything but current state
			else if (enterResult !== undefined && enterResult !== value) return this.set(enterResult), this[enterFlag] = false;

			this[enterFlag] = false;
		}
	};


	/** Get current state */
	get() {
		return this.#state;
	};
}


// API constants
var OTHERWISE = State.OTHERWISE = '_'


const isPrimitive = val => typeof val === 'object' ? val === null : typeof val !== 'function';


export default State;

