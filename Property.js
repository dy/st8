//TODO: use enot fully instead of own iteration

/**
* Property controller on instance
*/
function Property(target, name, desc) {
	var scope = getScope(target);
	var self = this;

	//save prop params
	self.displayName = name;
	self.modInstance = target;
	self.descriptor = desc;

	//set states applied counter
	self.appliedStates = 0;

	//set storage for events applied through states
	self.eventHandlers = {};

	//FIXME: accord with target creation selfProp detection
	//replace with events
	if (name[0] === '@') {
		var refName = name.split(/\s/)[0].slice(1);
		self.referenceEvt = name.slice(refName.length + 1).trim();

		// console.log('`' + refName + '`')

		self.reference = scope[refName];

		//keep referrers list
		//FIXME: sometimes there’s an error of absent reference (look for pornorama.js)
		if (!self.reference.referrers) self.reference.referrers = [];
		self.reference.referrers.push(self);
	}

	//parse preset value in order to avoid it from being redefined in initialization of adjacent props
	self.presetValue = self.parseInitialValue();

	//set self value caller
	self.callValue = self.callValue.bind(self);

	//ignore native property, just keep method inited
	if (has(target._clone, name)){
		self.isNative = true;
	}

	//declare property on the target
	else {
		defineProperty(target, name, {
			configurable: false,
			enumerable: true,
			//FIXME: get rid of these binds
			get: self.getValue.bind(self),
			set: self.setValue.bind(self)
		});
	}

	//extend prop descriptor
	self.states = {};
	extend(self.states, desc);

	// console.groupEnd();
	return self;
}

//NOTE: constructor reference misses in prototype redefinition
extend(Property.prototype, {
	//whether property has been inited already
	isInited: null,

	//inner reference stuff
	reference: null,
	referenceEvt: null,

	//main prop value keeper
	value: undefined,

	//return type of descriptor (example of value)
	getType: function(){
		var self = this;
		return isObject(self.descriptor) ? (isFn(self.descriptor.init) ? undefined : self.descriptor.init ) : self.descriptor;
	},

	//parse option from the target
	parseInitialValue: function(){
		var self = this, propName = self.displayName, target = self.modInstance,
			result;

		//preset value - parse it
		if (has(target, propName)) {
			//don’t redefine fns - keep them native
			if (isFn(target[propName])) return target[propName];

			result = target[propName]
			// console.log('PARSED', self.displayName, result)
		}

		//attribute value - parse it
		else {
			if (has(target, 'attributes')) {
				var dashedPropName = toDashedCase(propName);

				var attr = target.attributes[propName] || target.attributes['data-' + propName] || target.attributes[dashedPropName] || target.attributes['data-' + dashedPropName];

				if (attr) {
					// console.log('parseAttr', propName, propType)
					//function on-attribute
					if (/^on/.test(propName)) {
						result = new Function(attr.value);
					}

					//detect based on type
					else {
						result = parseTyped(attr.value, self.getType());
					}
				}
			}
		}

		return result;
	},

	//self value caller
	callValue: function(e){
		var self = this, value = self.value, target = self.modInstance;

		// console.group('callValue', self.displayName, value)

		//call fn
		if (isFn(value)) {
			value.call(target, e);
		}
		//call fn refs (redirect)
		else if (isString(value)){
			eachCSV(value, function(item){
				// console.log('fire', target, item)
				enot.fire(target, item);
			})
		}

		// console.groupEnd();
	},

	//get event handler specific for target and value
	getEventHandler: function(target, value){
		// console.log('get handler', this.displayName, value)
		return function(e){
			// console.log('eventHandler', value)
			//call fn
			if (isFn(value)) {
				value.call(target, e);
			}
			//call fn refs (redirect)
			else if (isString(value)){
				eachCSV(value, function(item){
					// console.log(item)
					enot.fire(target, item);
				})
			}
		}
	},

	//bind self.value
	bindValue: function(value){
		var self = this, target = self.modInstance, scope = getScope(target), fn;

		value = value || self.value;

		// console.log('bind', self.displayName, value)
		//FIXME: a property may have lots of referrers, whereas a referrer may have only one reference

		//bind fnref
		if (((isString(value) && isPossiblyFnRef(value)) || isFn(value)) && (!self.reference && !self.referrers)) {
			// console.log('bind fn', self.displayName, value, target);
			return enot.on(target, self.displayName, value);
		}
	},

	//bind evt
	bindReference: function(){
		var self = this, value = self.value;

		// console.log('bind reference', self.displayName)

		//bind inner reference pointer
		if (self.referrers) {
			if (value) {
				//FIXME: get rid of that hack
				for (var i = 0; i < self.referrers.length; i++){
					var referrer = self.referrers[i];
					enot.on(value, referrer.referenceEvt, referrer.callValue);
				}
			}
		}
		//bind inner reference
		else if (self.reference) {
			if (value){
				//native values may be updated, so bind to a real value - the property one
				// on(self.reference.value, self.referenceEvt, self.callValue);
				enot.on(self.modInstance[self.reference.displayName], self.referenceEvt, self.callValue);
			}
		}
	},

	//unbind self.value
	unbindValue: function(value){
		var self = this, target = self.modInstance, scope = getScope(target);

		// console.log('unbindValue', self.displayName, value)

		value = value || self.value;

		//unbind fn/fnref
		if ((isString(value) && isPossiblyFnRef(value) || isFn(value)) && (!self.reference && !self.referrers)) {
			// console.log('off')
			//TODO: there cb reference is of the new state one
			return enot.off(target, self.displayName, value);
		}
	},

	//unbind reference event, if any
	unbindReference: function(){
		var self = this, value = self.value;

		// console.log('unbind reference', self.displayName, value)

		//unbind inner ref pointer
		if (self.referrers) {
			// console.log('rebind inner ref target', self.referrer.value)
			if (value) {
				for (var i = 0; i < self.referrers.length; i++){
					var referrer = self.referrers[i];
					// enot.off(value, referrer.referenceEvt, referrer.referenceFn);
					enot.off(value, referrer.referenceEvt, referrer.callValue);
				}
			}
		}
		//unbind inner reference
		else if (self.reference) {
			// console.log('unbind-inner-ref-fn', self.refProp, '`' + self.refEvt + '`', target[self.refProp])
			if (value){
				// enot.off(self.reference.value, self.referenceEvt, self.callValue);
				enot.off(self.modInstance[self.reference.displayName], self.referenceEvt, self.callValue);
			}
		}
	},

	//getter & setter
	getValue: function(){
		//init, if not inited
		if (!this.isInited) this.initValue();

		var getResult = this.enterState('get', this.value);

		return getResult === undefined ? this.value : getResult;
	},

	//call this fn once in order to init uninited value
	initValue: function(){
		var self = this;


		// console.log('init', self.displayName, self.descriptor)
		if (self.initBeforehead) {
			getScope(self.modInstance)[self.initBeforehead].initValue();
			self.initBeforehead = undefined;
		}

		if (self.isInited) return;
		self.isInited = true;


		//resolve init value
		var value, initResult;

		//if descriptor isn’t an object - apply descriptor’s value
		if (!isObject(self.descriptor)) {
			//set preset value, if any
			if (self.presetValue !== undefined && !self.isNative) {
				value = self.presetValue;
			}

			//set default value
			else {
				value = self.descriptor;
			}
		}

		//if init isn’t a function and preset exists - return preset
		else if (!isFn(self.states.init) && self.presetValue !== undefined) {
			value = self.presetValue
		}

		//else infer initResult from the `init`
		else {
			var before = self.value;

			initResult = self.enterState('init', self.presetValue);


			//catch value changed fromwithin init
			if (self.value !== before) {
				return;
			}

			//redirect state, if returned any
			if (initResult !== undefined) {
				value = initResult;
			}

			//nothing returned
			else {
				//if preset existed - go to preset
				if (self.presetValue !== undefined){
					value = self.presetValue;
				}

				//else value is undefined
				else {
					value = undefined;
				}
			}
		}

		// console.log('init', self.displayName, value)

		//bind initial fns
		//FIXME: bind it more carefully
		self.bindInitialValue();

		self.setValue(value, true);
	},

	//initial value binder
	bindInitialValue: function(){
		var self = this;
		if (isFn(self.descriptor) || (isString(self.descriptor) && isPossiblyFnRef(self.descriptor))) {
			self.bindValue(self.callValue);
		}
	},

	//try to enter mod
	enterState: function(name, value, oldValue){
		var self = this, state = self.states[name];

		//undefined/false state
		if (!state) {
			return state;
		}

		//init: 123
		else if (isPlain(state)) {
			return state;
		}

		//init: function(){}
		else if (isFn(state)) {
			return state.call(self.modInstance, value, oldValue);
		}

		//init: {before: function(){}}
		else if (isObject(state)) {
			if (isFn(state['before'])) {
				return state['before'].call(self.modInstance, value, oldValue);
			} else {
				return state['before'];
			}
		}

		//init: document.createElement('div')
		return state
	},

	//apply extraneous state descriptor
	applyDesc: function(stateName, desc){
		var self = this;

		// console.group('applyDesc', stateName, self.displayName, desc);

		//set plain desc passed
		if (!isObject(desc)) {
			var setResult = self.setValue(desc);

			//bind state-dependent listeners
			//FIXME: fnref descriptors and selfRef descriptors are not being bound
			//save event to set of events applied by states
			// console.log('apply handler', stateName, self.displayName)
			if (!self.eventHandlers[stateName]) self.eventHandlers[stateName] = self.getEventHandler(self.modInstance, setResult);

			self.bindValue(self.eventHandlers[stateName]);
		}

		//extend self with specific descriptor passed
		else {
			extend(self.states, desc);
		}

		//TODO unbind initial event/value
		if (self.appliedStates === 0) {
			// console.log('unbind initial')
			self.unbindValue(self.callValue);
		};

		//save applied state
		self.appliedStates++;

		// console.groupEnd();
	},

	//unapply extraneous state descriptor
	unapplyDesc: function(stateName, desc) {
		var self = this;

		// console.group('unapplyDesc', stateName, self.displayName)

		//forget applied state
		self.appliedStates--;

		//unbind state-dependent listeners
		self.unbindValue(self.eventHandlers[stateName]);

		//if no states left - reset values & event to initial descriptors
		if (self.appliedStates === 0){
			// console.log('bind initial')
			self.bindInitialValue();
		}

		var src = self.descriptor;
		if (src !== undefined) {
			if (!isObject(src)) {
				self.setValue(src)
			}

			else {
				//FIXME: unapply applied states here
				extend(self.states, src);
			}
		}


		// console.groupEnd();
	},

	setValue: function(value, initialCall){
		var self = this, target = self.modInstance, oldValue = self.value, scope = getScope(target),
			stateName, state, oldStateName, oldState, firstCall, initResult;

		//passing no arguments will cause initial call
		// console.group('set', '`' + self.displayName + '`', value, 'from', oldValue);
		// console.log('set', self.displayName, value, 'from', oldValue);

		if (!self.isInited) {
			firstCall = true;
			// console.log('init via set', self.displayName)
			self.initValue();
		}


		//FIXME: make sure it’s the best decision to detect inner sets (too much of code duplication)
		if (!self.isInSet) {
			//call set
			var isSetLock = 'isSet' + value
			if (!self[isSetLock]) {
				self[isSetLock] = true;

				self.isInSet = true;

				//FIXME: make sure error thrown has proper stacktrace
				try {
					//TODO: make set/get/init/changed mod calls be proper
					var setResult = self.enterState('set', value, oldValue);
				} catch (e){
					self.isInSet = null;
					self[isSetLock] = null;
					throw e;
				}

				//self.value could've changed here because of inner set calls
				if (self.inSetValue !== undefined) {
					setResult = self.inSetValue;
					// console.log('redirected value', setResult)
					self.inSetValue = undefined;
				}

				self.isInSet = null;
				self[isSetLock] = null;

				//catch redirect
				if (!firstCall && self.value !== oldValue) {
					// console.groupEnd();
					return;
				}

				//redirect state, if returned any
				if (setResult !== undefined) {
					value = setResult;
				}
			}
		} else {
			// console.log('isSet', value)
			self.inSetValue = value;
			// console.groupEnd();
			return;
		}

		//ignore not changed value
		if (!firstCall && !initialCall && value === self.value) {
			// console.log('ignore absense of change', self.value)
			// console.groupEnd();
			return;
		}

		//handle leaving state routine
		oldStateName = has(self.states, oldValue) ? oldValue : '_';
		oldState = self.states[oldStateName];

		if (!initialCall && has(self.states, oldStateName)){
			//after callback
			var isAfterLock = 'isAfter' + oldStateName
			if (!self[isAfterLock]) {
				self[isAfterLock] = true;

				var afterResult;

				if (isObject(oldState)) {
					if (isFn(oldState['after'])) {
						afterResult = oldState['after'].call(target, value, oldValue);
					} else {
						afterResult = oldState['after'];
					}
				}


				//ignore leaving state
				if (afterResult === false) {
					// console.groupEnd()
					self[isAfterLock] = null;
					return;
				}

				//redirect state, if returned any
				if (afterResult !== undefined) {
					self.setValue(afterResult);
					// console.groupEnd()
					self[isAfterLock] = null;
					return;
				}

				//catch redirect
				if (self.value !== oldValue) {
					// console.groupEnd();
					self[isAfterLock] = null;
					return;
				}

				self[isAfterLock] = null;
			}

			//leave an old mod - unapply old props
			eachProp(oldState, function(name, desc){
				scope[name].unapplyDesc(self.displayName + oldStateName, desc);
			})
		}


		self.unbindReference();

		self.value = value;

		// console.log('set succeeded', self.displayName, self.value)

		self.bindReference();

		//FIXME: avoid unapply-apply action for properties, make straight transition
		stateName = has(self.states, value) ? value : '_';

		//enter the new state
		if (has(self.states, stateName)) {
			state = self.states[stateName];

			//before callback
			var beforeResult;
			var isBeforeLock = 'isBefore' + stateName;
			if (!self[isBeforeLock]){
				self[isBeforeLock] = true;

				//apply new state props (used to be known as applyProps)
				eachProp(state, function(name, desc){
					scope[name].applyDesc(self.displayName + stateName, desc);
				})

				beforeResult = self.enterState(stateName, value, oldValue);


				//ignore entering state, if before returned false
				if (beforeResult === false) {
					self.setValue(oldValue);
					// console.groupEnd()
					self[isBeforeLock] = null;
					return;
				}

				//redirect mod, if returned any
				if (beforeResult !== undefined) {
					self.setValue(beforeResult);
					// console.groupEnd()
					self[isBeforeLock] = null;
					return;
				}

				//catch redirect within before
				if (self.value !== value) {
					// console.groupEnd();
					self[isBeforeLock] = null;
					return;
				}

				self[isBeforeLock] = null;
			}
		}

		//changed callback
		//TODO: refuse changed callback to change self value by returning anything
		var isChangedLock = 'isChangedTo' + value;
		if (self.states.changed && !self[isChangedLock] && value !== oldValue) {
			self[isChangedLock] = true;

			self.enterState('changed', value, oldValue);

			//TODO: there have to be a covering test, because kudago.slideshow failed
			self[isChangedLock] = null;
		}

		//update attribute
		self.setAttribute();
		// console.groupEnd();

		return value;
	},

	//reflect self value as attribute
	setAttribute: function(){
		var self = this, target = self.modInstance;

		if (!self.attribute) return;
		if (!target.setAttribute) return;
		if (isFn(self.value)) return;

		if (!self.value) {
			//hide falsy attributes
			target.removeAttribute(self.displayName);
		} else {
			//avoid target attr-observer catch this attr changing
			target.setAttribute(self.displayName, stringify(self.value));
		}

		enot.fire(target, 'attributeChanged');
	}
});


/**
* tests string on possible mthod reference (no newlines, looks like a method name)
*/
function isPossiblyFnRef(str){
	return !(str.length > 80 || /\n/.test(str)) ;
}