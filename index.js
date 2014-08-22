var enot = require('enot');
var _ = require('_');
var extend = require('extend');

module.exports = State;



var enterCallbackName = 'before';
var leaveCallbackName = 'after';

//values keyed by target
var valuesCache = new WeakMap;

//as far properties can change it’s behaviour dynamically, we have to keep real states somewhere
var statesCache = new WeakMap;


//calling constructor applies props on target
//NOTE: don’t use options here: it’s not the state responsibility
function State (target, props) {
	this.target = target;
	this.props = props;

	//create target private storage
	if (!valuesCache.has(this.target)) valuesCache.set(this.target, {});
	this.values = valuesCache.get(target)
	if (!statesCache.has(this.target)) statesCache.set(this.target, {});
	this.states = statesCache.get(target)

	//create accessors at first (incl inner props)
	this.createProps();

	//set properties values
	this.initProps();

	return target;
}


var proto = State.prototype;


//create accessor on target for every stateful property
//TODO: getect init fact via existing value in storage (throw away storage objects)
proto.createProps = function (){
	for (var name in this.props) {
		var prop = this.props[name];

		//set accessors only on stateful properties
		if (_.isObject(prop)) {
			this.states[name] = prop;

			//set target stub
			Object.defineProperty(this.target, name, {
				get: (function(name, self){
					return function(){
						var propState = self.states[name];

						//init, if is not
						if (!name in self.values) {
							self.values[name] = self.callState(propState.init, self.target[name]);
						}

						//getting prop value just returns it’s real value
						var getValue = self.callState(propState.get, self.values[name]);

						return getValue;
					}
				})(name, this),
				set: (function(name, self){
					return function(value){
						var propState = self.states[name];

						//init, if is not
						if (!_.has(self.values, name)) {
							self.values[name] = self.callState(propState.init, self.target[name]);
						}

						var oldValue = self.values[name];

						//1. apply setter to value
						var setResult = self.callState(propState.set, value, oldValue);
						value = setResult;

						//leaving an old state unbinds all events of the old state
						var oldProps = propState[oldValue];
						if (oldProps === undefined) oldProps = propState._;
						self.unbindEvents(oldProps)

						//new state applies new props: binds events, sets values
						var newProps = propState[value];
						if (newProps === undefined) newProps = propState._;
						self.applyProps(newProps);

						//save new self value
						self.values[name] = value;

						//4. call changed
						self.callState(propState.changed, value, oldValue)
					}
				})(name, this)
			});
		}

		//set plain property
		else {
			target[name] = props[name];
		}
	};
}


//set properties on target
proto.initProps = function (target, props){
	this.eachProp(function(name, prop){
		//init descriptor property
		this.target[name] = this.callState(prop.init, this.target[name]);
	});
}




//take over properties by target
proto.applyProps = function(props){
	if (!props) return;

	eachProp.call(this, props, function(name, value){
		//extendify descriptor value
		if (_.isObject(value)){
			extend(this.states[name], value);
		}

		//bind fn value as a method
		else if (_.isFn(value)){
			enot.on(name, value);
		}

		//redefine plain value
		else {
			this.target[name] = value;
		}
	})
}

proto.unbindEvents = function(props){
	if (!props) return;

	eachProp.call(this, props, function(name, value){
		//bind fn value as a method
		enot.off(name, value);
	})
}


//try to enter a state property, like set/get/init/etc
proto.callState = function(state, a1, a2) {
	var self = this;

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
		return state.call(this.target, a1, a2);
	}

	else if (_.isObject(state)) {
		//init: {before: function(){}}
		if (_.isFn(state[enterCallbackName])) {
			return state[enterCallbackName].call(this.target, a1, a2);
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





//iterate props in proper order
proto.eachProp = function(fn){
	var props = this.props;

	eachProp.call(this, props, fn)
}


function eachProp(props, fn){
	var self = this;

	//calc dependents - properties which can be affected by the state of this property
	//e.g. {a: {'b':true,'c':true,'d':true}} - b,c,d should go after a
	var dependents = {};
	for (var propName in props) {
		var prop = props[propName];

		if (_.isObject(prop)){
			dependents[propName] = getDependents(prop);
		}
	}

	//iterate over props
	Object.keys(props)
	//form the right order for iteration
	.sort(function(a, b){
		//a contains b as a dependent - make b go after a;
		if (dependents[a][b]) return -1;
		if (dependents[b][a]) return 1;


	})
	.forEach(function(name){
		fn.call(self, name, props[name]);
	});
}


//collect set of inner dependencies, e.g. {1: {a:1}, 2: {b:2}, _: {c:3}} → ['a', 'b', 'c']
function getDependents(prop){
	var res = {};

	for (var stateName in prop){
		for (var propName in prop[stateName]){
			res[propName] = true;
		}
	}

	return res;
}