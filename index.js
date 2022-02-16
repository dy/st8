/**
 * @module  st8
 *
 * Micro state machine.
 */
'use strict'


var isPrimitive = require('is-primitive')


// API constants
State.OTHERWISE = '_'
State.ENTER = 'enter'
State.EXIT = 'exit'


/**
 * Create a new state controller based on states passed
 *
 * @constructor
 *
 * @param {object} settings Initial states
 */

function State(states, context){
	//ignore existing state
	if (states instanceof State) return states;

	//ensure new state instance is created
	if (!(this instanceof State)) return new State(states);

	//save states object
	this.states = states || {};

	//save context
	this.context = context || this;

	//initedFlag
	this.inited = false;
}


/**
 * Go to a state
 *
 * @param {*} value Any new state to enter
 */

State.prototype.set = function (value) {
	var prevValue = this.state, states = this.states;
	var ENTER = State.ENTER, EXIT = State.EXIT, OTHERWISE = State.OTHERWISE
	// console.group('set', value, prevValue);

	//leave old state
	var oldStateName = states[prevValue] !== undefined ? prevValue : OTHERWISE
	var oldState = states[oldStateName];

	var leaveResult, leaveFlag = EXIT + oldStateName;
	if (this.inited) {
		if (oldState) {
			if (!this[leaveFlag]) {
				this[leaveFlag] = true;

				//if oldState has after method - call it
				leaveResult = oldState[EXIT] && oldState[EXIT].call ?
						oldState[EXIT].call(this.context) :
					oldState[1] && oldState[1].call ?
						oldState[1].call(this.context) : oldState[EXIT]

				//ignore changing if leave result is falsy
				if (leaveResult === false) {
					this[leaveFlag] = false;
					// console.groupEnd();
					return false;
				}

				//redirect, if returned anything
				else if (leaveResult !== undefined && leaveResult !== value) {
					this.set(leaveResult);
					this[leaveFlag] = false;
					// console.groupEnd();
					return false;
				}

				this[leaveFlag] = false;

				//ignore redirect
				if (this.state !== prevValue) {
					return;
				}
			}
		}

		//ignore not changed value
		if (value === prevValue) return false;
	}
	else {
		this.inited = true;
	}

	//set current value
	this.state = value;


	//try to enter new state
	var newStateName = states.hasOwnProperty(value) ? value : OTHERWISE
	var newState = states[newStateName];
	var enterResult;
	var enterFlag = ENTER + newStateName;

	if (!this[enterFlag]) {
		this[enterFlag] = true;

		if (newState) {
			// enter pure function
			if (newState.call) {
				enterResult = newState.call(this.context)
			}
			// enter array
			else if (Array.isArray(newState)) {
				enterResult = (newState[0] && newState[0].call) ? newState[0].call(this.context, this) : newState[0]
			}
			// enter object with enter method
			else if (newState.hasOwnProperty(ENTER)) {
				enterResult = newState[ENTER].call ? newState[ENTER].call(this.context) : newState[ENTER];
			}
			else if (isPrimitive(newState)) {
				enterResult = newState
			}
		}
		else {
			enterResult = newState
		}

		//ignore entering falsy state
		if (enterResult === false) {
			this.set(prevValue);
			this[enterFlag] = false;
			// console.groupEnd();
			return false;
		}

		//redirect if returned anything but current state
		else if (enterResult !== undefined && enterResult !== value) {
			this.set(enterResult);
			this[enterFlag] = false;
			// console.groupEnd();
			return false;
		}

		this[enterFlag] = false;
	}

	// console.groupEnd();

	//return context to chain calls
	return this.context;
};


/** Get current state */

State.prototype.get = function(){
	return this.state;
};

module.exports = State;
