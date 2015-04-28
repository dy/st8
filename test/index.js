//stub element
if (typeof Element === 'undefined') global.Element = function(){};
if (typeof HTMLElement === 'undefined') global.HTMLElement = function(){};
if (typeof Event === 'undefined') global.Event = function(){};

var assert = require('chai').assert;
var State = require('..');



describe("State", function(){

	it("perform state transitions", function(){
		var state, outState;

		var a = new State({
			1: {
				before: function(){
					// console.log("before 1")
					state = this.get()
				},
				after: function(){
					// console.log("after 1")
					outState = this.get()
				}
			},
			2: {
				before: function(){
					state = this.get()
				},
				after: function(){
					outState = this.get()
				}
			},
			3: {
				before: function(){
					// console.log('before 3')
					state = this.get()
				},
				after: function(){
					// console.log('after 3')
					outState = this.get()
				}
			},
			//this shouldn’t be entered unless string 'undefined' passed
			undefined: {
				before: function(){
					// console.log("beforeundefinedstate", this.get())
					state = this.get()
				},
				after: function(){
					// console.log("afterundefined", this.get())
					outState = this.get()
				}
			},
			null: {
				before: function(){
					// console.log("beforenullstate", this.get())
					state = this.get()
				},
				after: function(){
					// console.log("afternullstate", this.get())
					outState = this.get()
				}
			},
			//this should be a case for `undefined` state
			_: {
				before: function(){
					// console.log("before remainder")
				},

				after: function(){
					// console.log("after remainder")
				}
			}
		});

		a.set();

		// console.log(A.properties)
		assert.strictEqual(state, undefined);
		assert.strictEqual(outState, undefined);
		a.set(null);
		assert.strictEqual(state, null);
		assert.strictEqual(outState, undefined);
		// console.log('-----a.set(1)');
		a.set(1);
		assert.strictEqual(state, 1);
		assert.strictEqual(outState, null);
		a.set(2);
		assert.strictEqual(state, 2);
		assert.strictEqual(outState, 1);
		a.set(3);
		assert.equal(state, 3);
		assert.equal(outState, 2);
		// delete a.a;
		// assert.equal(a.a, 3);
		// console.log('--------a.a = undefined');
		a.set(undefined);
		assert.equal(state, undefined);
		assert.equal(outState, 3);
	});

	it("undefined states & redirections", function(){
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

		assert.equal(a.get(), 2);
	});

	it("init remainder state", function(){
		var i = 0, o = 0;

		var a = new State({
			_: {
				before: function(){
					// console.log("before _")
					i++
				},
				after: function(){
					// console.log("after _")
					o++
				}
			},
			1: {
				before: function(){
					i++
				},
				after: function(){
					o++
				}
			}
		});

		a.set();

		assert.equal(i, 1 );
		assert.equal(o, 0 );
		// console.log("---------a.a = 1")
		a.set(1);
		assert.equal(i, 2 );
		assert.equal(o, 1 );
		// console.log("---------a.a = undefined")
		a.set();
		assert.equal(i, 3 );
		assert.equal(o, 2 );
	});

	it("switch state from within `before` and `after` to any other state", function(){
		var a = new State({
			1: {
				before: function(){
					// console.log("before 1")
					this.set(2);
				},
				after: function(){
					// console.log("after 1")
				}
			},
			2: {
				before: function(){
					// console.log("before 2")
					this.set(3);
				},
				after: function(){
					// console.log("after 2")
				}
			},
			3: {
				before: function(){
					// console.log("before 3")
				},
				after: function(){
					// console.log("after 3")
					this.set(4);
				}
			},
			4: {
				before: function(){
					// console.log("before 4")
					this.set(5);
				},
				after: function(){
					// console.log("after 4")
				}
			}
		});

		a.set(1);
		assert.equal(a.get(), 3)
		// console.log("---- a = 2")
		a.set(2);
		// console.log(a.get())
		assert.equal(a.get(), 5)
	});

	it("prevent entering state if before returned false", function(){
		var a = new State({
			1: {
				before: function(){
					// console.log("before 1")
				}
			},
			2: {
				before: function(){
					// console.log("before 2")
					return false;
				}
			}
		});

		a.set(1);
		a.set(2);
		assert.equal(a.get(), 1);
	});

	it("prevent leaving state if after returned false", function(){
		var a = new State({
			1: {
				before: function(){
					// console.log("before 1")
				}
			},
			2: {
				after: function(){
					// console.log("after 2")
					return false;
				}
			}
		});

		a.set(1);

		a.set(2);
		assert.equal(a.get(), 2);
		a.set(1);
		assert.equal(a.get(), 2);
	});

	it("enter state returned from before/after, if any", function(){
		var a = new State({
			1: {
				before: function(){
					// console.log("before 1")
					return 2
				}
			},
			2: {
				before: function(){
					// console.log("before 2")
					return 3;
				}
			},
			3: {
				after: function(){
					// console.log("after 3")
					return 4
				}
			},
			4: {
				before: function(){
					// console.log("before 4")
					return 5
				}
			}
		});

		a.set(1);
		assert.equal(a.get(), 3);

		a.set(2);
		// console.log(a.a)
		assert.equal(a.get(), 5);
	});

	it("enter remainder state, if nothing other matched", function(){
		var log = [];

		var a = new State({
			1: {
				before: function(){
					// console.log("before 1")
					return 3;
				}
			},
			2: {
				before: function(){
					// console.log("before 2")
					return 4;
				}
			},
			_: {
				before: function(){
					// console.log("_before")
					log.push("_before");
				},
				after: function(){
					// console.log("_after")
					log.push("_after");
				}
			}
		});

		a.set(1);

		assert.equal(a.get(), 3);
		assert.deepEqual(log, ["_before"]);

		log = [];
		a.set(2);
		assert.equal(a.get(), 4);
		assert.deepEqual(log, ["_after", "_before"])

		log = [];
		a.set(8);
		assert.equal(a.get(), 8);
		assert.deepEqual(log, ["_after", "_before"])
	});

	it("keep states callbacks context", function(){
		var i = 0, b = {};
		var a = new State({
			1: {
				before: function(){
					i++;
					assert.equal(this, b);
				},
				after: function(){
					i++;
					assert.equal(this, b);
				}
			}
		}, b);

		a.set(1);
		a.set(2);
		assert.equal(i, 2);
	});

	it("recognize function as a short state notation of `before` method", function(){
		var a = new State({
			1: {},
			_: function(){ return 1; }
		});

		a.set(1);
		// console.log(A.properties)
		//FIXME: parse states shortcuts

		assert.equal(a.get(), 1);
		a.set(2);
		assert.equal(a.get(), 1);
	});

	it("catch state recursions", function(){
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

		assert.equal(a.get(), 1);
		// assert.throw(function(){}, "Too many redirects");
	});

	it("handle weird state cases", function(){
		var a = new State({
			'false': false,
			x: false,
			y: 'y',
			z: '_',
			_: 'y'
		});

		a.set('z');
		assert.equal(a.get(), 'y');

		a.set(false);
		assert.equal(a.get(), 'y');

		a.set('x');
		assert.equal(a.get(), 'y');
	});

	it("stringy remainder state shortcut should be recognized as a redirect, not the state", function(){
		var a = new State({
			_: 'abc'
		});

		a.set('abc');

		assert.equal(a.get(), 'abc')
	});

	it("changed callback", function(){
		var log = [];

		var a = new State({
			1: {

			},
			2: {

			}
		});

		a.set(1);

		a.on('change', function(to, from){
			log.push(to);
			log.push(from);
		});

		a.set(2);

		assert.deepEqual(log, [2, 1]);
	});

	it("chain calls", function () {
		var log = [];

		var a = new State({
			1: {

			},
			2: {

			}
		});

		a.on('change', function(to, from){
			log.push(to);
			log.push(from);
		});

		a.set(1).set(2);

		assert.deepEqual(log, [1, undefined, 2, 1]);
	});
});