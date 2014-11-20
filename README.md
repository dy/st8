# st8&thinsp;—&thinsp;state controller

St8 provides stateful behaviour for any object.

[![NPM](https://nodei.co/npm/st8.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/st8/)


## Use

```
$ npm install st8
```

```js
var state = require('st8');

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
		//called any time `a` changes
		changed: function(v){
			assert.equal(v, 2);
		}
	},

	b: {
		//for any value of `b` (`_` wildcard) — apply setter to `a`
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


## API

To apply state to any object:

```js
target = state(target, stateDescriptor);
```


State descriptor specification:

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

		//getter
		get: function(value){
			return value * 5
		},

		//setter, returned value is used as a new value
		set: function(value, oldValue){
			if (value < 20) return oldValue;

			return value / 5;
		},

		//called each time on change
		changed: function(value, oldValue){
			this.updateSomething();
		},


		/**
		 * State values, each key corresponds to the value of that property
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
	 * Events.
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


## License

Unlicensed.