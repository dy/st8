```
npm install st8
```

```js
var state = require('st8');

//target can be any object
var target = {};

//apply properties controller to the target
state(target, {
	a: {
		init: function(){
			return 1
		},
		changed: function(v){
			assert.equal(v, 2)
		}
	},

	b: {
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

## TODO

* replace set of storages with property class. It seems to be good idea.
* extern muparse, mustring
* move actual tests from mod here