/** @module  st8 */
module.exports = applyState;

//TODO: ensure no memory leaks
//TODO: group props to objects instead of sets of weakmaps
//TODO: add proper destroyer


var enot = require('enot');
var type = require('mutype');
var eachCSV = require('each-csv');
var extend = require('extend');
var icicle = require('icicle');
var flattenKeys = require('split-keys');

//externs
var isObject = type.isObject;
var has = type.has;
var isFn = type.isFn;
var isPlain = type.isPlain;
var isString = type.isString;

var eOn = enot.on;
var eOff = enot.off;


//tech names
var createdCallbackName = 'created';
var enterCallbackName = 'before';
var leaveCallbackName = 'after';
var initCallbackName = 'init';
var changedCallbackName = 'changed';
var setterName = 'set';
var getterName = 'get';
var remainderStateName = '_';


/** values keyed by target */
var valuesCache = new WeakMap();

/** As far properties can change it’s behaviour dynamically, we have to keep actual states somewhere */
var statesCache = new WeakMap();

/** initial (root) prop values - we need it in resetting value */
var propsCache = new WeakMap();

/** dependencies for the right init order */
var depsCache = new WeakMap();

/** actual callbacks */
var activeCallbacks = new WeakMap();

/** native properties per target */
var ignoreCache = new WeakMap();

/** target prop setters */
var settersCache = new WeakMap();



/** per-property storage objects, keyed by target */
// var propsCache = new WeakMap();

/** property class */
// function Property(){
// }
/*
Property.prototype = {
	constructor: Property,

	//current value for property
	value: undefined,

	//actual (result) state
	state: undefined,

	//dependencies
	deps: undefined,

	//actual callback (value bound)
	callback: fn,

	//
	ignore: false,

	//actual setter for the property
	set: fn
}
*/



/**
 * Apply state to a target
 *
 * @property {*} target Any object to apply state descriptor
 * @property {object} props An object - set of properties
 * @property {(object|undefined)} ignoreProps Native properties or alike -
 *                                            blacklisted items which should be ignored
 */
function applyState(target, props, ignoreProps){
	// console.group('applyState', props)

	//create target private storage
	if (!statesCache.has(target)) statesCache.set(target, {});
	if (!activeCallbacks.has(target)) activeCallbacks.set(target, {});
	if (!ignoreCache.has(target)) ignoreCache.set(target, ignoreProps || {});
	if (!settersCache.has(target)) settersCache.set(target, {});
	if (!propsCache.has(target)) propsCache.set(target, {});

	flattenKeys(props, true);

	//calc dependencies, e.g. b depends on a = {b: {a: true}, a: {}}
	var deps = {};
	depsCache.set(target, deps);

	for (var propName in props){
		//ignore native props
		if (has(Object, propName)) continue;

		//ignore lc props
		if (propName === createdCallbackName || propName === initCallbackName){
			continue;
		}

		deps[propName] = deps[propName] || {};

		var prop = props[propName];
		if (isObject(prop)) {
			for (var stateName in prop){
				var innerProps = prop[stateName];
				//pass non-object inner props
				if (!isObject(innerProps)) continue;

				for (var innerPropName in innerProps){
					if (isStateTransitionName(innerPropName) || innerPropName === propName) continue;

					var innerProp = innerProps[innerPropName];

					//save parent prop as a dependency for inner prop
					(deps[innerPropName] = deps[innerPropName] || {})[propName] = true;

					//save stringy inner prop as a dependece for the prop
					if (isString(innerProp)) (deps[propName] = deps[propName] || {})[innerProp] = true;

					//stub property on target with proper type (avoid uninited calls of inner methods)
					if (!has(target, innerPropName) && !has(props, innerPropName)) {
						if (isFn(innerProp)) target[innerPropName] = noop;
					}

				}
			}
		}
	}

	//create accessors
	createProps(target, props);


	//init values
	//init plain props first
	for (propName in props){
		if (!props[propName] && props[propName] !== 0) {
			initProp(target, propName);
		}
	}
	for (propName in props){
		if (isPlain(props[propName])) {
			initProp(target, propName);
		}
	}
	//init fns second
	for (propName in props){
		if (isFn(props[propName])) {
			initProp(target, propName);
		}
	}
	//init descriptors props last
	for(propName in deps){
		initProp(target, propName);
	}
	// console.groupEnd();
	return target;
}


/** create accessor on target for every stateful property */
//TODO: getect init fact via existing value in storage (throw away storage objects)
function createProps(target, props){
	var deps = depsCache.get(target);
	var ignoreProps = ignoreCache.get(target);

	//create prototypal values
	var protoValues = {}, initialStates = {};
	for (var propName in deps){
		//set proto value - property value, if it is not descriptor
		if (!isObject(props[propName])){
			protoValues[propName] = props[propName];
		}

		//save initial property
		if (has(props, propName)) propsCache.get(target)[propName] = prop;
	}


	//if new values - set prototypes
	if (!valuesCache.has(target)) {
		valuesCache.set(target, Object.create(protoValues));
	}

	//if existing values - just set new values, appending new prototypes
	else {
		var values = valuesCache.get(target);

		//append new value to the prototypes
		for (propName in protoValues){
			//FIXME: get proto in a more reliable way
			var valuesProto = values.__proto__;
			if (!has(valuesProto, propName)) valuesProto[propName] = protoValues[propName];
		}
	}


	for (var name in deps) {
		var prop = props[name];

		//set initial property states as prototypes
		statesCache.get(target)[name] = Object.create(isObject(prop) ? prop : null);


		//set initialization lock in order to detect first set call
		icicle.freeze(target, initCallbackName + name);

		//create fake setters for ignored props
		if (ignoreProps[name]) {
			createSetter(target, name);
			continue;
		}

		//save initial value
		if (has(target, name)/* && !has(valuesCache.get(target),name)*/) {
			valuesCache.get(target)[name] = target[name];
		}

		//set accessors for all props, not the object ones only: some plain property may be dependent on other property’s state, so it has to be intercepted in getter and the stateful property inited beforehead
		Object.defineProperty(target, name, {
			configurable: true,
			get: (function(target, name){
				return function(){
					// console.group('get ', name)
					var propState = statesCache.get(target)[name];
					//init, if is not
					initProp(target, name);

					var values = valuesCache.get(target);
					var value = values[name];


					//getting prop value just returns it’s real value
					var getResult = callState(target, propState[getterName], value);
					value = getResult === undefined ? values[name] : getResult;

					// console.groupEnd();
					return value;
				};
			})(target, name),

			set: createSetter(target, name)
		});
	}
}


/**
 * create & save setter on target
 * @todo optimize setter create for diffirent kind of descriptor
 */
var inSetValues = new WeakMap();
function createSetter(target, name){
	var setter = function(value){
		// console.group('set', name, value)
		// console.log('set', name, value)
		var propState = statesCache.get(target)[name];
		var targetValues = valuesCache.get(target);

		//init, if is not
		initProp(target, name);
		var oldValue = targetValues[name];

		//1. apply setter to value
		var setResult;

		if (icicle.freeze(target, setterName + name)) {
			if (icicle.freeze(target, setterName + name + value)) {
				// console.log('set', name, value)

				try {
					setResult = callState(target, propState[setterName], value, oldValue);
				} catch (e){
					throw e;
				}

				icicle.unfreeze(target, setterName + name + value);
				icicle.unfreeze(target, setterName + name);

				//self.value could've changed here because of inner set calls
				if (inSetValues.has(target)) {
					setResult = inSetValues.get(target);
					// console.log('redirected value', setResult)
					inSetValues.delete(target);
				}

				if (setResult !== undefined) value = setResult;

				else {
					//redirect in set
					if (targetValues[name] !== oldValue) {
						// console.groupEnd();
						return;
					}
				}

			}
		}
		else {
			inSetValues.set(target, value);
		}


		//ignore leaving absent initial state
		var initLock = icicle.unfreeze(target, initCallbackName + name);
		if (!initLock) {
			//Ignore not changed value
			if (value === oldValue) {
				// console.groupEnd()
				return;
			}

			//leaving an old state unbinds all events of the old state
			var oldState = has(propState, oldValue) ? propState[oldValue] : propState[remainderStateName];

			if (icicle.freeze(target, leaveCallbackName + oldState)) {
				//try to enter new state (if redirect happens)
				var leaveResult = leaveState(target, oldState, value, oldValue);

				//redirect mod, if returned any but self
				if (leaveResult !== undefined && leaveResult !== value) {
					//ignore entering falsy state
					if (leaveResult === false) {
					}
					//enter new result
					else {
						target[name] = leaveResult;
					}

					// console.groupEnd()
					return icicle.unfreeze(target, leaveCallbackName + oldState);
				}

				icicle.unfreeze(target, leaveCallbackName + oldState);

				//ignore redirect
				if (targetValues[name] !== oldValue) {
					// console.groupEnd()
					return;
				}

				unapplyProps(target, oldState);
			}

		}

		//save new self value
		// targetValues[name] = value;
		applyValue(target, name, value);
		// console.log('set succeeded', name, value)

		var newStateName = has(propState, value) ? value : remainderStateName;
		if (icicle.freeze(target, name + newStateName)) {
			//new state applies new props: binds events, sets values
			var newState = propState[newStateName];

			applyProps(target, newState);

			//try to enter new state (if redirect happens)
			var enterResult = callState(target, newState, value, oldValue);

			//redirect mod, if returned any but self
			if (enterResult !== undefined && enterResult !== value) {
				//ignore entering falsy state
				if (enterResult === false) {
					target[name] = oldValue;
				}
				//enter new result
				else {
					target[name] = enterResult;
				}

				// console.groupEnd()
				return icicle.unfreeze(target, name + newStateName);
			}

			icicle.unfreeze(target, name + newStateName);
		}


		//4. call changed
		if (value !== oldValue || (initLock && value !== undefined))
			callState(target, propState[changedCallbackName], value, oldValue);

		// console.groupEnd()
	};

	//save setter
	settersCache.get(target)[name] = setter;

	return setter;
}


/** property initializer */
function initProp(target, name){
	var deps = depsCache.get(target);
	if (!deps[name]) return;

	var propState = statesCache.get(target)[name];

	var targetValues = valuesCache.get(target);
	// console.log('init', name, 'dependent on', deps[name]);

	//mark dependency as resolved (ignore next init calls)
	var propDeps = deps[name];
	deps[name] = null;

	//init dependens things beforehead
	for (var depPropName in propDeps){
		if (propDeps[depPropName]) {
			// console.log('redirect init to', depPropName)
			initProp(target, depPropName);
		}
	}

	//handle init procedure
	var initResult, beforeInit = targetValues[name];


	//run initialize procedure
	if (isFn(propState[initCallbackName])) {
		initResult = propState[initCallbackName].call(target, beforeInit);
	}
	else if (isObject(propState[initCallbackName]) && has(propState[initCallbackName],enterCallbackName)) {
		initResult = callState(target, propState[initCallbackName], beforeInit);
	}
	else {
		initResult = beforeInit !== undefined ? beforeInit : propState[initCallbackName];
	}

	//if result is undefined - keep initial value
	if (initResult === undefined) initResult = beforeInit;

	//handle init redirect
	if (targetValues[name] !== beforeInit) return;

	//presave target value (someone wants to get it beforehead)
	valuesCache.get(target)[name] = initResult;

	var isIgnored = ignoreCache.get(target)[name];

	if (!isIgnored)	{
		target[name] = initResult;
	} else {
		//call fake ignored setter
		settersCache.get(target)[name](initResult);
	}
}


/** set value on target */
function applyValue(target, name, value){
	valuesCache.get(target)[name] = value;

	//don't bind noop values
	//FIXME: write test for this (dropdown.js use-case) - there’s still extra-binding or redundant noop
	if (value === noop) return;

	bindValue(target, name, value);
}

function bindValue(target, name, value){
	if (isString(value) || isFn(value)) {
		// console.log('assign', name, value)
		//make sure context is kept bound to the target
		if (isFn(value)) {
			value = value.bind(target);
			activeCallbacks.get(target)[name] = value;
		}

		eOn(target, name, value);
	}
}


/** take over properties by target */
function applyProps(target, props){
	if (!isObject(props)) return;

	for (var name in props){
		// console.group('apply prop', name)
		if (isStateTransitionName(name)) continue;

		var value = props[name];
		var state = statesCache.get(target)[name];

		//extendify descriptor value
		if (isObject(value)){
			extend(state, value);
		}

		else {
			//if some fn was unbound but is going to be rebind
			if (value === valuesCache.get(target)[name]){
				bindValue(target, name, value);
			}

			//FIXME: merge with the same condition in init
			if (!ignoreCache.get(target)[name])	{
				target[name] = value;
			} else {
				//call fake ignored setter
				settersCache.get(target)[name](value);
			}
		}
		// console.groupEnd();
	}
}

/** unbind state declared props */
function unapplyProps(target, props){
	if (!isObject(props)) return;

	for (var name in props){
		// console.log('unbind', name)
		if (isStateTransitionName[name]) continue;

		var propValue = props[name];
		var state = statesCache.get(target)[name];
		var values = valuesCache.get(target);

		//delete extended descriptor
		if (isObject(propValue)){
			for (var propName in propValue){
				delete state[propName];
			}
		}

		else {
			if (isString(propValue) || isFn(propValue)) {
				//unbind fn value
				// console.log('off', name)
				if (isFn(propValue)) {
					var callbacks = activeCallbacks.get(target);
					if (callbacks[name]) {
						propValue = callbacks[name];
						callbacks[name] = null;
					}
				}
				eOff(target, name, propValue);
			}

			//set value to the root initial one, if such
			if (has(propsCache.get(target), name) && !state.constructor)
				delete values[name];
		}
	}
}


/** try to enter a state property, like set/get/init/etc */
function callState(target, state, a1, a2) {
	//undefined state (like no init meth)
	if (state === undefined) {
		return a1;
	}

	//init: 123
	else if (isPlain(state)) {
		//FIXME: this guy is questionable (return state)
		return state;
	}

	//init: function(){}
	else if (isFn(state)) {
		return state.call(target, a1, a2);
	}

	else if (isObject(state)) {
		//init: {before: function(){}}
		if (isFn(state[enterCallbackName])) {
			return state[enterCallbackName].call(target, a1, a2);
		}
		//init: {before: 123}
		else {
			return state[enterCallbackName];
		}
	}

	//init: document.createElement('div')
	return state;
}


/** try to leave state: call after with new state name passed */
function leaveState(target, state, a){
	// console.log('leave', state)
	if (!state) return a;

	if (!state[leaveCallbackName]) {
		return state[leaveCallbackName];
	}

	if (isFn(state[leaveCallbackName])) {
		return state[leaveCallbackName].call(target, a)
	}
}

function noop(){}

function isStateTransitionName(name){
	if (name === enterCallbackName || name === leaveCallbackName) return true;
}


/** make sure there’re no references to the target, so there’re no memory leaks */
function unapplyState(target, props){
	//TODO
}