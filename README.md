# st8 [![Build Status](https://travis-ci.org/dy/st8.svg?branch=master)](https://travis-ci.org/dy/st8)

_St8_ is a tiny state machine for structural describing behavior of components.


# Usage

```
$ npm install st8
```

```js
var State = require('st8');

var state = new State({
	a: {
		enter: () => {
			...
		},
		exit: () => {
			...
		}
	},

	// shortcut for enter/exit
	b: [ () => {}, () => {} ],

	// enter shortcut, forwards to state d
	c: () => 'd',

	// shorter cut, redirects to state a
	d: 'a',

	// any other state
	_: 'a'
});


//enter state 'a', invoke corresponding callbacks
state.set('a');

//get current state
state.get(); // 'a'
```

# API

### let state = new State(states [, context])

Create a new state machine based on the `states` object. Optionally pass a `context` for callbacks.

### state.get()

Get current state.


### state.set(value)

Transition to a new state, invoking necessary callbacks.


[![NPM](https://nodei.co/npm/st8.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/st8/)
