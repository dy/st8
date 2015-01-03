# st8 [![Build Status](https://travis-ci.org/dfcreative/st8.svg?branch=master)](https://travis-ci.org/dfcreative/st8) [![Code Climate](https://codeclimate.com/github/dfcreative/st8/badges/gpa.svg)](https://codeclimate.com/github/dfcreative/st8) ![Deps](https://david-dm.org/dfcreative/st8.svg) <a href="http://unlicense.org/UNLICENSE"><img src="http://upload.wikimedia.org/wikipedia/commons/6/62/PD-icon.svg" width="20"/></a>


St8 is a tiny state machine for structural describing behaviour of components.


# Get started

```
$ npm install st8
```

```js
var State = require('st8');


//create a new state instance
var state = new State({
	//state 1
	1: {
		before: function(){
			...
		},
		after: function(){
			...
		}
	},

	//state 2
	2: {
		before: function(){
			...
		},
		after: function(){
			...
		}
	},

	//state 3 `before` shortcut - go to 4
	3: function(){
		return 4
	},

	//state 4 shortcut (go to 1)
	4: 1

	//any other state
	_: {
		before: function(){
			//go to 2
			return 2
		}
	}
});


//enter state 3
state.set(3);

//get current state
state.get(); //1

//add event listener
state.on('change', function(to, from){
	...
});
```


State inherits [emitter](https://github.com/component/emitter), in that it has methods `on`, `off`, `once`, `emit`.


# API

### State(states [, context])

Create a new state machine based on the `states` object. Optionally pass a `context` for callbacks.


### State.prototype.get()

Get current state.


### State.prototype.set(value)

Go to a new state.



[![NPM](https://nodei.co/npm/st8.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/st8/)