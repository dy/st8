var enot = require('enot');
var _ = require('_');
var extend = require('extend');

module.exports = applyState;



var enterCallbackName = 'before';
var leaveCallbackName = 'after';

//values keyed by target
var valuesCache = new WeakMap;

//as far properties can change it’s behaviour dynamically, we have to keep real states somewhere
var statesCache = new WeakMap;

//list of dependencies for right init order
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
				for (var innerPropName in innerProps){
					if (innerPropName === 'before' || innerPropName === 'after') continue;
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

		//set property states
		if (_.isObject(prop)) statesCache.get(target)[name] = prop;
		else statesCache.get(target)[name] = {};

		//save initial values
		valuesCache.get(target)[name] = target[name];

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
					var getValue = callState(target, propState.get, targetValues[name]);

					// console.groupEnd();
					return getValue;
				}
			})(name, target),
			set: (function(name, target){
				return function(value){
					// console.log('set ', name)
					var propState = statesCache.get(target)[name];
					var targetValues = valuesCache.get(target);

					//init, if is not
					initProp(target, name);

					var oldValue = targetValues[name];

					//1. apply setter to value
					var setResult = callState(target, propState.set, value, oldValue);
					value = setResult;

					//leaving an old state unbinds all events of the old state
					var oldProps = propState[oldValue];
					if (oldProps === undefined) oldProps = propState._;
					unbindEvents(target, oldProps)

					//new state applies new props: binds events, sets values
					var newProps = propState[value];
					if (newProps === undefined) newProps = propState._;
					applyProps(target, newProps);

					//save new self value
					targetValues[name] = value;

					//4. call changed
					callState(target, propState.changed, value, oldValue)

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
	target[name] = callState(target, propState.init, targetValues[name]);
}


//take over properties by target
function applyProps(target, props){
	// console.log('apply props', props)
	if (!props) return;

	for (var name in props){
		var value = props[name];
		var state = statesCache.get(target)[name];

		//extendify descriptor value
		if (_.isObject(value)){
			extend(state, value);
		}

		else {
			//bind fn value as a method
			if (_.isFn(value)){
				enot.on(name, value);
			}
			target[name] = value;
		}
	}
}

function unbindEvents(target, props){
	if (!props) return;

	for (var name in props){
		//bind fn value as a method
		enot.off(name, props[name]);
	}
}


//try to enter a state property, like set/get/init/etc
function callState(target, state, a1, a2) {
	//undefined/false state (like no init meth)
	if (!state) {
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


//try to leave state
function leave(target, state, a){
	if (!state) return state;

	if (!state[leaveCallbackName]) return state[leaveCallbackName];

	if (isFn(state[leaveCallbackName])) return state[leaveCallbackName].call(target, a)
}


function noop(){};