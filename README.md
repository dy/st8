```
npm install st8
```

```js
var State = require('st8');

//target can be any object
var target = {};

//temporary constructor is that.
//think about var s = new State(propList); st8.applyTo(target); - it will unbind state controller from the target instance.
var state = new State(target, {
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