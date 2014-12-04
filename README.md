# st8 [![Build Status](https://travis-ci.org/dfcreative/st8.svg?branch=master)](https://travis-ci.org/dfcreative/st8) ![Deps](https://david-dm.org/dfcreative/st8.svg) <a href="http://unlicense.org/UNLICENSE"><img src="http://upload.wikimedia.org/wikipedia/commons/6/62/PD-icon.svg" width="20"/></a>

St8 (_state_) — a state controller for UI-components. It provides a natural and intuitive way of declaring properties and states, just like as if you draw a state diagram of a component. In general case, st8 provides stateful behaviour for any object.


# Get started

To use in browser, use browserify.

```
$ npm install st8
```

```js
var state = require('st8');

//a target component to apply properties (usually a class instance)
var target = {
	a: 1,
	b: 2
};

//apply stateful behaviour to the target
state(target, {
	a: {
		//called once on init
		init: function(value){
			//value === 1
			return value;
		},
		//called any time `a` has changed
		changed: function(v){
			assert.equal(v, 2);
		}
	},

	b: {
		//for any value of `b` (`_` wildcard) — use a setter for `a`
		_: {
			a: {
				set: function(v){
					assert.equal(v,1)
					return 2;
				}
			}
		}
	}
});

assert.equal(target.a, 2);
```


# Specs

Putting all together case:

```js
state(target, {
	//define plain property
	myProperty: 1,

	//define method
	myMethod: function(){},

	//define stateful property
	mySpecialProperty: {
		/**
		 * Property hooks
		 */

		//called once on init
		init: function(initValue){
			//go to state 1
			return 1;
		},

		//getter - called on each get
		get: function(value){
			return value * 5
		},

		//setter - called on each set
		set: function(value, oldValue){
			if (value < 20) return oldValue;

			//returned value is used as a new value
			return value / 5;
		},

		//called on each change
		changed: function(value, oldValue){
			this.updateSomething();
		},


		/**
		 * State values
		 * Each key corresponds to the value of the property
		 */

		//applied when mySpecialProperty === 1
		1: {
			//called on entering state
			before: function(){},

			//called on leaving state
			after: function(){},

			//redefine base things
			myMethod: function(){},
			myProperty: 2
		},

		//state 3 & 4 shortcut - go to the state 1
		'3,4': 1,

		//any other state wildcard
		_: function(){
			//go back to 1
			return 1;
		}
	},


	/**
	 * Events
	 * Declared along with properties.
	 * Enot is used for events: https://github.com/dfcreative/enot
	 */

	//accessing `this.*` properties for binding events
	'@parentNode click, @div mouseenter': function(){},

	//only elements with `.item` or `.other-item` classes trigger this callback
	':root click:delegate(.item, .other-item)': function(){},

	//only right mouse button triggers this callback
	'click:pass(right_mouse)': function(){},

	//only keys from the subset triggers this callback
	'keypress:pass(12,13,14,15)': function(){},

	//callback is triggered once
	'someEvent:one': function(){},

	//combined modifier
	'keypress:pass(escape, enter):one': function(){},

	//call after 200 ms
	'switch:defer(200)': function(){},

	//call no more than 1 per 20ms
	'update:throttle(20)': function(){},

	//redirect to other events
	'a': '@firstChild click, document specialEvent'
});
```

# Typical use

A typical use case of st8 is to declare component options by it. You init state in a component constructor, passing side options (maybe parsed from an element data-attributes) to the state, and st8 takes the control over a component.

Components build with st8:

* [slidy](https://github.com/dfcreative/slidy) — a versatile slider
* [draggy](https://github.com/dfcreative/draggy) — a draggable behaviour provider
* [poppy](https://github.com/dfcreative/poppy) — popups, tooltips, dropdowns and overlays provider

St8 is a successor of [mod](https://github.com/dfcreative/poppy) in that it’s it’s core.

[![NPM](https://nodei.co/npm/st8.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/st8/)