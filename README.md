# st8 [![test](https://github.com/dy/st8/actions/workflows/test.yml/badge.svg)](https://github.com/dy/st8/actions/workflows/test.yml) [![npm](https://img.shields.io/npm/v/subscript)](http://npmjs.org/subscript)

> Tiny state machine for structural describing behavior of components.


# Usage

```
$ npm install st8
```

## Standalone state machine

```js
import State from 'st8';

var state = new State({
	// enter, exit
	b: () => () => {},

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

## Define stateful object property

```js
import State from 'st8'

var state = new State({
	a() {
		// onenter
		this === target //true
	},

	b() {
		// onenter
		this === target //true
		return () => {
			// onexit
		}
	}

}, target);

Object.defineProperty(target, property, {
	set: function (value) {
		return state.set(value);
	},
	get: function () {
		return state.get();
	}
});
```

# API

### let state = new State(states [, context])

Create a new state machine based on the `states` object. Optionally pass a `context` for callbacks.

### state.get()

Get current state.

### state.set(value)

Transition to a new state, invoking necessary callbacks.

<!--
### state.subscribe((newState,oldState) => {})

Subscribe to state changes.

### state\[Symbol.observable\]()

Returns _Subscribable_ for interop with _Observables_ etc.
-->


<p align="center">🕉<p>
