var t = require('tape')
var State = require('..');


t("perform state transitions", function(t){
	var state, outState;

	var a = new State({
		1: {
			enter: function(){
				// console.log("before 1")
				state = this.get()
			},
			exit: function(){
				// console.log("after 1")
				outState = this.get()
			}
		},
		2: [function(){
				state = this.get()
			},
			function(){
				outState = this.get()
			}],
		3: [function (s) {
				console.log('enter 3', state)
				state = this.get()
			},
			function (s) {
				// console.log('after 3')
				outState = this.get()
			}
		],
		//this shouldn’t be entered unless string 'undefined' passed
		undefined: {
			enter: function(){
				// console.log("beforeundefinedstate", this.get())
				state = this.get()
			},
			exit: function(){
				// console.log("afterundefined", this.get())
				outState = this.get()
			}
		},
		null: {
			enter: function(){
				// console.log("beforenullstate", this.get())
				state = this.get()
			},
			exit: function(){
				// console.log("afternullstate", this.get())
				outState = this.get()
			}
		},
		//this should be a case for `undefined` state
		_: {
			enter: function(){
				// console.log("before remainder")
			},

			exit: function(){
				// console.log("after remainder")
			}
		}
	});

	a.set();

	// console.log(A.properties)
	t.strictEqual(state, undefined);
	t.strictEqual(outState, undefined);
	a.set(null);
	t.strictEqual(state, null, 'curr is 1');
	t.strictEqual(outState, undefined, 'prev is undefined');
	// console.log('-----a.set(1)');
	a.set(1);
	t.strictEqual(state, 1, 'curr is 1');
	t.strictEqual(outState, null, 'prev is null');
	a.set(2);
	t.strictEqual(state, 2, 'curr is 2');
	t.strictEqual(outState, 1, 'prev is 1');
	a.set(3);
	t.equal(state, 3, 'curr is 3');
	t.equal(outState, 2, 'prev is 2');
	// delete a.a;
	// t.equal(a.a, 3);
	// console.log('--------a.a = undefined');
	a.set(undefined);
	t.equal(state, undefined);
	t.equal(outState, 3);

	t.end()
});

t("undefined states & redirections", function(t){
	var a = new State({
			undefined: null,
			x: null,
			null: 'y',
			y: 1,
			1: 2,
			2: 8,
			_: false
	});

	a.set('x');

	t.equal(a.get(), 2);

	t.end()
});

t("init remainder state", function(t){
	var i = 0, o = 0;

	var a = new State({
		_: {
			enter: function(){
				// console.log("before _")
				i++
			},
			exit: function(){
				// console.log("after _")
				o++
			}
		},
		1: {
			enter: function(){
				i++
			},
			exit: function(){
				o++
			}
		}
	});

	a.set();

	t.equal(i, 1 );
	t.equal(o, 0 );
	// console.log("---------a.a = 1")
	a.set(1);
	t.equal(i, 2 );
	t.equal(o, 1 );
	// console.log("---------a.a = undefined")
	a.set();
	t.equal(i, 3 );
	t.equal(o, 2 );

	t.end()
});

t("switch state from within `before` and `after` to any other state", function(t){
	var a = new State({
		1: {
			enter: function(){
				// console.log("before 1")
				this.set(2);
			},
			exit: function(){
				// console.log("after 1")
			}
		},
		2: {
			enter: function(){
				// console.log("before 2")
				this.set(3);
			},
			exit: function(){
				// console.log("after 2")
			}
		},
		3: {
			enter: function(){
				// console.log("before 3")
			},
			exit: function(){
				// console.log("after 3")
				this.set(4);
			}
		},
		4: {
			enter: function(){
				// console.log("before 4")
				this.set(5);
			},
			exit: function(){
				// console.log("after 4")
			}
		}
	});

	a.set(1);
	t.equal(a.get(), 3)
	// console.log("---- a = 2")
	a.set(2);
	// console.log(a.get())
	t.equal(a.get(), 5)

	t.end()
});

t("prevent entering state if before returned false", function(t){
	var a = new State({
		1: {
			enter: function(){
				// console.log("before 1")
			}
		},
		2: {
			enter: function(){
				// console.log("before 2")
				return false;
			}
		}
	});

	a.set(1);
	a.set(2);
	t.equal(a.get(), 1, 'did not enter 2');

	t.end()
});

t("prevent leaving state if after returned false", function(t){
	var a = new State({
		1: {
			enter: function(){
				// console.log("before 1")
			}
		},
		2: {
			exit: function(){
				// console.log("after 2")
				return false;
			}
		}
	});

	a.set(1);

	a.set(2);
	t.equal(a.get(), 2);
	a.set(1);
	t.equal(a.get(), 2);

	t.end()
});

t("enter state returned from before/after, if any", function(t){
	var a = new State({
		1: {
			enter: function(){
				// console.log("before 1")
				return 2
			}
		},
		2: {
			enter: function(){
				// console.log("before 2")
				return 3;
			}
		},
		3: {
			exit: function(){
				// console.log("after 3")
				return 4
			}
		},
		4: {
			enter: function(){
				// console.log("before 4")
				return 5
			}
		}
	});

	a.set(1);
	t.equal(a.get(), 3);

	// a.set(2);
	// // console.log(a.a)
	// t.equal(a.get(), 5);

	t.end()
});

t("enter remainder state, if nothing other matched", function(t){
	var log = [];

	var a = new State({
		1: {
			enter: function(){
				// console.log("before 1")
				return 3;
			}
		},
		2: {
			enter: function(){
				// console.log("before 2")
				return 4;
			}
		},
		_: {
			enter: function(){
				// console.log("_before")
				log.push("_before");
			},
			exit: function(){
				// console.log("_after")
				log.push("_after");
			}
		}
	});

	a.set(1);

	t.equal(a.get(), 3);
	t.deepEqual(log, ["_before"]);

	log = [];
	a.set(2);
	t.equal(a.get(), 4);
	t.deepEqual(log, ["_after", "_before"])

	log = [];
	a.set(8);
	t.equal(a.get(), 8);
	t.deepEqual(log, ["_after", "_before"])

	t.end()
});

t("keep states callbacks context", function(t){
	var i = 0, b = {};
	var a = new State({
		1: {
			enter: function(){
				i++;
				t.equal(this, b);
			},
			exit: function(){
				i++;
				t.equal(this, b);
			}
		}
	}, b);

	a.set(1);
	a.set(2);
	t.equal(i, 2);

	t.end()
});

t("recognize function as a short state notation of `before` method", function(t){
	var a = new State({
		1: {},
		_: function(){ return 1; }
	});

	a.set(1);
	// console.log(A.properties)
	//FIXME: parse states shortcuts

	t.equal(a.get(), 1, 'entered 1');
	a.set(2);
	t.equal(a.get(), 1, 'did not enter anything else');

	t.end()
});

t("catch state recursions", function(t){
	var a = new State({
		1: function(){
			// console.log("before 1")
			return 2;
		},

		2: function(){
			// console.log("before 2")
			return 1;
		}
	});

	a.set(1);

	t.equal(a.get(), 1);
	// t.throw(function(){}, "Too many redirects");

	t.end()
});

t("handle weird state cases", function(t){
	var a = new State({
		'false': false,
		x: false,
		y: 'y',
		z: '_',
		_: 'y'
	});

	a.set('z');
	t.equal(a.get(), 'y');

	a.set(false);
	t.equal(a.get(), 'y');

	a.set('x');
	t.equal(a.get(), 'y');

	t.end()
});

t("stringy remainder state shortcut should be recognized as a redirect, not the state", function(t){
	var a = new State({
		_: 'abc'
	});

	a.set('abc');

	t.equal(a.get(), 'abc')

	t.end()
});

t.skip("changed callback", function(t){
	// deprecated since events can be easily implemented via state own callbacks
	var log = [];

	var a = new State({
		1: {

		},
		2: {

		}
	});

	a.set(1);

	a.on('change', function(to){
		log.push(to);
		log.push(from);
	});

	a.set(2);

	t.deepEqual(log, [2, 1]);

	t.end()
});

t("chain calls", function (t) {
	var log = [];

	var a = new State({
		1: {

		},
		2: {

		}
	});

	// a.on('change', function({to, from}){
	// 	log.push(to);
	// 	log.push(from);
	// });

	a.set(1).set(2);

	// t.deepEqual(log, [1, undefined, 2, 1]);

	t.equal()

	t.end()
});
