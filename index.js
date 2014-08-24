var enot = require('enot');
var _ = require('mutypes');

module.exports = applyState;



var enterCallbackName = 'before';
var leaveCallbackName = 'after';
var initCallbackName = 'init';
var changedCallbackName = 'changed';
var setterName = 'set';
var getterName = 'get';

//values keyed by target
var valuesCache = new WeakMap;

//as far properties can change it’s behaviour dynamically, we have to keep real states somewhere
var statesCache = new WeakMap;

//list of dependencies for the right init order
var depsCache = new WeakMap;


//apply state to a target
function applyState(target, props){
	//create target private storage
	if (!valuesCache.has(target)) valuesCache.set(target, {});
	if (!statesCache.has(target)) statesCache.set(target, {});

	//calc dependencies, e.g. b depends on a = {b: {a: true}, a: {}}
	var deps = {};
	depsCache.set(target, deps);

	for (var propName in props){
		deps[propName] = deps[propName] || {};

		var prop = props[propName];
		if (_.isObject(prop)) {
			for (var stateName in prop){
				var innerProps = prop[stateName];
				//pass non-object inner props
				if (!_.isObject(innerProps)) continue;

				for (var innerPropName in innerProps){
					if (isStateTransitionName(innerPropName)) continue;
					var innerProp = innerProps[innerPropName];
					//save parent prop as a dependency for inner prop
					(deps[innerPropName] = deps[innerPropName] || {})[propName] = true;

					//stub property on target with proper type
					if (!(innerPropName in target)) {
						if (_.isFn(innerProp)) target[innerPropName] = noop;
					}
				}
			}
		}
	}

	//create accessors
	createProps(target, props, deps);


	//init values
	for (var propName in deps){
		initProp(target, propName);
	}

	return target;
}


//create accessor on target for every stateful property
//TODO: getect init fact via existing value in storage (throw away storage objects)
function createProps(target, props, deps){
	for (var name in deps) {
		var prop = props[name];

		//set initial property states as prototypes
		statesCache.get(target)[name] = Object.create(_.isObject(prop) ? prop : null);

		//save initial values
		if (_.has(target, name)) {
			valuesCache.get(target)[name] = target[name];
		} else if (!_.isObject(prop)) {
			valuesCache.get(target)[name] = prop;
		}

		//set initialization lock in order to detect first set call
		lock(target, initCallbackName + name);

		//set accessors for all props, not the object ones only: some plain property may be dependent on other property’s state, so it has to be intercepted in getter and the stateful property inited beforehead
		Object.defineProperty(target, name, {
			get: (function(name, target){
				return function(){
					// console.group('get ', name)
					var propState = statesCache.get(target)[name];
					var targetValues = valuesCache.get(target);

					//init, if is not
					initProp(target, name);

					//getting prop value just returns it’s real value
					var getValue = callState(target, propState[getterName], targetValues[name]);

					// console.groupEnd();
					return getValue;
				}
			})(name, target),
			set: (function(name, target){
				return function(value){
					// console.log('set', name, value)
					var propState = statesCache.get(target)[name];
					var targetValues = valuesCache.get(target);

					//init, if is not
					initProp(target, name);

					var oldValue = targetValues[name];

					//1. apply setter to value
					var setResult = callState(target, propState[setterName], value, oldValue);
					value = setResult;

					//FIXME: catch initial call better way
					//ignore leaving absent initial state
					if (!unlock(target, initCallbackName + name)) {
						//Ignore not changed value
						if (value === oldValue) return;

						//leaving an old state unbinds all events of the old state
						var oldState = _.has(propState, oldValue) ? propState[oldValue] : propState._;
						unapplyProps(target, oldState);

						//try to enter new state (if redirect happens)
						var leaveResult = leaveState(target, oldState, value, oldValue);
					}

					//save new self value
					targetValues[name] = value;

					var newStateName = _.has(propState, value) ? value : '_'

					if (!lock(target, newStateName)) {
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

							return unlock(target, newStateName);
						}

						unlock(target, newStateName);
					}


					//4. call changed
					if (value !== oldValue)
						callState(target, propState[changedCallbackName], value, oldValue)

					// console.groupEnd()
				}
			})(name, target)
		});
	};
}

//property initializer
function initProp(target, name){
	var deps = depsCache.get(target);
	if(!deps[name]) return;

	// console.log('init', name, 'dependent on', deps[name]);

	var propState = statesCache.get(target)[name];
	var targetValues = valuesCache.get(target);

	//init dependens things beforehead
	for (var depPropName in deps[name]){
		if (deps[name][depPropName]) {
			// console.log('redirect init to', depPropName)
			initProp(target, depPropName);
		}
	}

	//mark dependency as resolved (ignore next init calls)
	deps[name] = null;
	//call init with target initial value stored in targetValues
	var initResult = callState(target, propState[initCallbackName], targetValues[name]);

	//bind fn
	if (initResult !== undefined) enot.on(target, name, initResult);

	target[name] = initResult;
}


//take over properties by target
function applyProps(target, props){
	if (!props) return;

	for (var name in props){
		if (isStateTransitionName(name)) continue;

		var value = props[name];
		var state = statesCache.get(target)[name];

		//extendify descriptor value
		if (_.isObject(value)){
			for (var propName in value){
				state[propName] = value[propName]
			}
		}

		else {
			//bind fn value as a method
			enot.on(target, name, value);

			//assign value
			target[name] = value;
		}
	}
}

//unbind state declared props
function unapplyProps(target, props){
	if (!props) return;

	for (var name in props){
		if (isStateTransitionName[name]) continue;

		var value = props[name];
		var state = statesCache.get(target)[name];

		//delete extended descriptor
		if (_.isObject(value)){
			for (var propName in value){
				delete state[propName]
			}
		}

		else {
			//unbind fn value
			// console.log('unbind', name, value)
			enot.off(target, name, value);

			//set value to root initial one
			target[name] = value;
		}
	}
}


//try to enter a state property, like set/get/init/etc
function callState(target, state, a1, a2) {
	//undefined state (like no init meth)
	if (state === undefined) {
		return a1;
	}

	//init: 123
	else if (_.isPlain(state)) {
		return state;
	}

	//init: function(){}
	else if (_.isFn(state)) {
		return state.call(target, a1, a2);
	}

	else if (_.isObject(state)) {
		//init: {before: function(){}}
		if (_.isFn(state[enterCallbackName])) {
			return state[enterCallbackName].call(target, a1, a2);
		}
		//init: {before: 123}
		else {
			return state[enterCallbackName];
		}
	}

	//init: document.createElement('div')
	return state
}


//try to leave state: call after with new state name passed
function leaveState(target, state, a){
	// console.log('leave', state)
	if (!state) return a;

	if (!state[leaveCallbackName]) return state[leaveCallbackName];

	if (_.isFn(state[leaveCallbackName])) return state[leaveCallbackName].call(target, a)
}


function noop(){};

function isStateTransitionName(name){
	if (name === enterCallbackName || name === leaveCallbackName) return true;
}

//lock helpers
var lockCache = new WeakMap;
function lock(target, name){
	if (!lockCache.get(target)) lockCache.set(target, {});
	if (lockCache.get(target)[name]) return true;
	lockCache.get(target)[name] = true;
	return false;
}

function unlock(target, name){
	var res = false;
	if (lockCache.get(target)[name]) res = true;
	lockCache.get(target)[name] = null;
	return res;
}