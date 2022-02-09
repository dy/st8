import t, {is} from 'tst'
import State from '../index.js';


t("perform state transitions", function(t){
	var state, outState;

	var a = new State({
		1: function (){
				// console.log("enter 1")
				state = this.get()
				return () => {outState = this.get()}
		},
		2: function(){
				state = this.get()
				return function(){outState = this.get()}
		},
		3: function (s) {
				// console.log('enter 3', state)
				state = this.get()
				return function (s) {outState = this.get()}
		},
		//this shouldn’t be entered unless string 'undefined' passed
		undefined: function(){
				// console.log("beforeundefinedstate", this.get())
				state = this.get()
				return function(){
					// console.log("afterundefined", this.get())
					outState = this.get()
				}
		},
		null: function(){
				// console.log("enter null", this.get())
				state = this.get()
				return function(){
					// console.log("leave null", this.get())
					outState = this.get()
				}
		},
		//this should be a case for `undefined` state
		_: function(){
				return function(){
					// console.log("after remainder")
				}
		}
	});

	a.set();

	// console.log(A.properties)
	is(state, undefined);
	is(outState, undefined);
	a.set(null);
	is(state, null, 'curr is 1');
	is(outState, undefined, 'prev is undefined');
	// console.log('-----a.set(1)');
	a.set(1);
	is(state, 1, 'curr is 1');
	is(outState, null, 'prev is null');
	a.set(2);
	is(state, 2, 'curr is 2');
	is(outState, 1, 'prev is 1');
	a.set(3);
	is(state, 3, 'curr is 3');
	is(outState, 2, 'prev is 2');
	// delete a.a;
	// is(a.a, 3);
	// console.log('--------a.a = undefined');
	a.set(undefined);
	is(state, undefined);
	is(outState, 3);
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

	is(a.get(), 2);
});

t("init remainder state", function(t){
	var i = 0, o = 0;

	var a = new State({
		_: function(){
				// console.log("before _")
				i++
				return function(){
					// console.log("after _")
					o++
				}
		},
		1: function(){
				i++
				return function(){
				o++
			}
		}
	});

	a.set();

	is(i, 1 );
	is(o, 0 );
	// console.log("---------a.a = 1")
	a.set(1);
	is(i, 2 );
	is(o, 1 );
	// console.log("---------a.a = undefined")
	a.set();
	is(i, 3 );
	is(o, 2 );
});

t("switch state from within `before` and `after` to any other state", function(t){
	var a = new State({
		1: function(){
				// console.log("before 1")
				this.set(2);
			return function(){
				// console.log("after 1")
			}
		},
		2: function(){
				// console.log("before 2")
				this.set(3);
			return function(){
				// console.log("after 2")
			}
		},
		3: function(){
				// console.log("before 3")
			return function(){
				console.log("after 3")
				this.set(4);
			}
		},
		4: function(){
				// console.log("before 4")
				this.set(5);
			return function(){
				// console.log("after 4")
			}
		}
	});

	a.set(1);
	is(a.get(), 3)
	// console.log("---- a = 2")
	a.set(2);
	// console.log(a.get())
	is(a.get(), 5)
});

t("prevent entering state if before returned false", function(t){
	var a = new State({
		1: function(){
				// console.log("before 1")
		},
		2: function(){
				// console.log("before 2")
				return false;
		}
	});

	a.set(1);
	a.set(2);
	is(a.get(), 1, 'did not enter 2');
});

t("prevent leaving state if after returned false", function(t){
	var a = new State({
		1: function(){
				// console.log("before 1")
		},
		2: function(){
				return () => console.log('after 2')||false;
		}
	});

	a.set(1);

	a.set(2);
	is(a.get(), 2);
	a.set(1);
	is(a.get(), 2);
});

t("enter state returned from before/after, if any", function(t){
	var a = new State({
		1: function(){
				// console.log("before 1")
				return 2
		},
		2: function(){
				// console.log("before 2")
				return 3;
		},
		3: function(){
				// console.log("after 3")
				() => 4
		},
		4: function(){
				// console.log("before 4")
				return 5
		}
	});

	a.set(1);
	is(a.get(), 3);

	// a.set(2);
	// // console.log(a.a)
	// is(a.get(), 5);
});

t("enter remainder state, if nothing other matched", function(t){
	var log = [];

	var a = new State({
		1: function(){
				// console.log("before 1")
				return 3;
		},
		2: function(){
				// console.log("before 2")
				return 4;
		},
		_: function(){
				// console.log("_before")
				log.push("_before");
			return function(){
				// console.log("_after")
				log.push("_after");
			}
		}
	});

	a.set(1);

	is(a.get(), 3);
	is(log, ["_before"]);

	log = [];
	a.set(2);
	is(a.get(), 4);
	is(log, ["_after", "_before"])

	log = [];
	a.set(8);
	is(a.get(), 8);
	is(log, ["_after", "_before"])
});

t("keep states callbacks context", function(t){
	var i = 0, b = {};
	var a = new State({
		1: function(){
				i++;
				is(this, b);
			return function(){
				i++;
				is(this, b);
			}
		}
	}, b);

	a.set(1);
	a.set(2);
	is(i, 2);

});

t("recognize function as a short state notation of `before` method", function(t){
	var a = new State({
		1: ()=>{},
		_: function(){ return 1; }
	});

	a.set(1);
	// console.log(A.properties)
	//FIXME: parse states shortcuts

	is(a.get(), 1, 'entered 1');
	a.set(2);
	is(a.get(), 1, 'did not enter anything else');

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

	is(a.get(), 1);
	// t.throw(function(){}, "Too many redirects");

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
	is(a.get(), 'y');

	a.set(false);
	is(a.get(), 'y');

	a.set('x');
	is(a.get(), 'y');

});

t("stringy remainder state shortcut should be recognized as a redirect, not the state", function(t){
	var a = new State({
		_: 'abc'
	});

	a.set('abc');

	is(a.get(), 'abc')

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

	is(log, [2, 1]);

});
