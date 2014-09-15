//stub element
if (typeof Element === 'undefined') global.Element = function(){};
if (typeof HTMLElement === 'undefined') global.HTMLElement = function(){};
if (typeof Event === 'undefined') global.Event = function(){};

var assert = require('chai').assert;
var enot = require('enot');
var applyState = require('../index');



describe("State cases", function(){

	it("accessor of outer state defined in inner state", function(){
		var target = applyState({}, {
			a: {
				init: function(){
					return 1;
				},
				changed: function(v){
					assert.equal(v, 2);
				}
			},

			b: {
				_: {
					a: {
						set: function(v){
							// console.log('set called')
							assert.equal(v,1);
							return 2;
						}
					}
				}
			}
		});

		assert.equal(target.a, 2)
	});


	it("fns declared within states", function(){
		var a = applyState({}, {
			a: {
				init: 1,
				changed: function(v){
					this.f();
				}
			},
			x: {
				_: {
					before: function(){
						this.f()
					},
					f: function(){
					}
				}
			}
		});
	});


	it("unravel hidden properties", function(){
		var a = applyState({}, {
			a: {
				init: 1,
				changed: function(v){
					this.f();
				}
			},
			x: {
				1: {
					before: function(){
						this.f()
					},
					f: function(){
					}
				}
			}
		});
	});


	it("any state name is possible", function(){
		var log = [];

		var target = applyState({}, {
			a: {
				init: {
					before: function(){
						// console.log('bi')
						log.push('bi')
					},
					after: function(){
						log.push('ai')
					}
				},

				set: {
					before: function(){
						log.push('bs')
						// console.log('bs')
					},

					after: function(){
						log.push('as')

					}
				},

				get: {
					before: function(){
						log.push('bg')
						// console.log('bg')

					},

					after: function(){
						log.push('ag')

					}
				},

				changed: {
					before: function(){
						log.push('bc')
						// console.log('bc')

					},

					after: function(){
						log.push('ac')

					}
				},

				_: {
					before: function(){
						log.push('b_')
						// console.log('b_')
					},

					after: function(){
						log.push('a_')
					}
				}
			}
		});

		assert.deepEqual(log, ['bi', 'bs', 'b_'])
		assert.equal(target.a, undefined)
	});



	it("append descriptors in states, unapply changes on leaving state", function(){
		var a = applyState({}, {
			a: {
				get: function(){
					return 1
				}
			},

			b: {
				1: {
					a: {
						get: function(){
							return 2
						}
					}
				}
			}
		});

		assert.equal(a.a, 1);

		a.b = 1;
		assert.equal(a.a, 2);

		a.b = 2;
		assert.equal(a.a, 1);
	});



	it("perform state transitions", function(){
		var state, outState;

		var a = applyState({}, {
			a: {
				1: {
					before: function(){
						// console.log("before 1")
						state = this.a
					},
					after: function(){
						// console.log("after 1")
						outState = this.a
					}
				},
				2: {
					before: function(){
						state = this.a
					},
					after: function(){
						outState = this.a
					}
				},
				3: {
					before: function(){
						// console.log('before 3')
						state = this.a
					},
					after: function(){
						// console.log('after 3')
						outState = this.a
					}
				},
				//this shouldn’t be entered unless string 'undefined' passed
				undefined: {
					before: function(){
						// console.log("beforeundefined", this.a)
						state = this.a
					},
					after: function(){
						// console.log("afterundefined", this.a)
						outState = this.a
					}
				},
				'null': {
					before: function(){
						// console.log("beforenullstate", this.a)
						state = this.a
					},
					after: function(){
						// console.log("afternullstate", this.a)
						outState = this.a
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
			}
		})

		// console.log(A.properties)
		assert.strictEqual(state, undefined)
		assert.strictEqual(outState, undefined)
		a.a = null;
		assert.strictEqual(state, null)
		assert.strictEqual(outState, undefined)
		// console.log('-----a.a = 1')
		a.a = 1;
		assert.strictEqual(state, 1)
		assert.strictEqual(outState, null)
		a.a = 2;
		assert.strictEqual(state, 2)
		assert.strictEqual(outState, 1)
		a.a = 3;
		assert.equal(state, 3)
		assert.equal(outState, 2)
		// delete a.a;
		// assert.equal(a.a, 3)
		// console.log('--------a.a = undefined')
		a.a = undefined;
		assert.equal(state, undefined)
		assert.equal(outState, 3)
	});



	it("undefined states & redirections", function(){
		var a = applyState({}, {
			a: {
				init: 'x',
				undefined: null,
				x: null,
				null: 'y',
				y: 1,
				1: 2,
				2: 8,
				_: false
			}
		})

		assert.equal(a.a, 2);
	});



	it("init remainder state", function(){
		var i = 0, o = 0;

		var a = applyState({},{
			a: {
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

			}
		})

		assert.equal(i, 1 );
		assert.equal(o, 0 );
		// console.log("---------a.a = 1")
		a.a = 1;
		assert.equal(i, 2 );
		assert.equal(o, 1 );
		// console.log("---------a.a = undefined")
		a.a = undefined;
		assert.equal(i, 3 );
		assert.equal(o, 2 );

	})



	it("unbind/bind events when component switches", function(){
		var v;
		var a = applyState({}, {
			a: {
				init: 1,

				1: {
					e: function(){
						v = 1
					}
				},
				2: {
					e: function(){
						v = 2
					}
				},
				3: {
					e: 'f'
				}

			},
			f: function(){
				v = 3;
			}
		});

		assert.equal(v, undefined)
		// console.log("-----------dispatch e")
		enot.emit(a, "e");
		assert.equal(v, 1)
		// console.log('-------a=2')
		a.a = 2;
		assert.equal(v, 1)
		enot.emit(a, "e");
		assert.equal(v, 2)
		// console.log('-------a=3')
		a.a = 3;
		assert.equal(v, 2);
		// console.log('-------fire e')
		enot.emit(a, "e");
		assert.equal(v, 3);
		a.a = 1;
		assert.equal(v, 3);
		enot.emit(a, "e");
		assert.equal(v, 1);

	});

	it("fire state events within before/after", function(){
		var i = 0, y = 0;
		var a = applyState({}, {
			v: {
				_: {
					before: function(){
						// console.log("_:before", this)
						enot.emit(this, "a")
					},
					after: function() {
						// console.log("_:after")
						enot.emit(this, "a")
					},
					a: function() {
						// console.log("_:a")
						i++
					}
				},

				1: {
					before: function() {
						// console.log("1:before")
						enot.emit(this, "a")
					},
					after: function() {
						// console.log("1:after")
						enot.emit(this, "a")
					},
					a: 'b'
				}
			},
			b: function(){
				// console.log("b")
				y++
			}
		})

		assert.equal(i, 1)
		assert.equal(y, 0)
		// console.log('------ fire a')
		enot.emit(a, "a")
		assert.equal(i, 2)
		// console.log("------ v = 1")
		a.v = 1;
		assert.equal(i, 3)
		assert.equal(y, 1)
		// console.log("------ v = undefined")
		a.v = undefined
		assert.equal(i, 4)
		assert.equal(y, 2)

	});


	it("switch state from within `before` and `after` to any other state", function(){
		var a = applyState({}, {
			a: {
				init: 1,
				1: {
					before: function(){
						// console.log("before 1")
						this.a = 2
					},
					after: function(){
						// console.log("after 1")
					}
				},
				2: {
					before: function(){
						// console.log("before 2")
						this.a = 3
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
						this.a = 4
					}
				},
				4: {
					before: function(){
						// console.log("before 4")
						this.a = 5
					},
					after: function(){
						// console.log("after 4")
					}
				}
			}
		})

		assert.equal(a.a, 3)
		// console.log("---- a.a = 2")
		a.a = 2
		// console.log(a.a)
		assert.equal(a.a, 5)
	});




	it("prevent entering state if before returned false", function(){
		var a = applyState({}, {
			a: {
				init: 1,

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

			}
		})

		a.a = 2;
		assert.equal(a.a, 1)
	})

	it("prevent leaving state if after returned false", function(){
		var a = applyState({}, {
			a: {
				init: 1,

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

			}
		})

		a.a = 2;
		assert.equal(a.a, 2)
		a.a = 1;
		assert.equal(a.a, 2)
	});


	it("enter state returned from before/after, if any", function(){
		var a = applyState({}, {
			a: {
				init: 1,

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

			}
		})

		assert.equal(a.a, 3)
		a.a = 2;
		// console.log(a.a)
		assert.equal(a.a, 5)
	})

	it("enter remainder state, if nothing other matched", function(){
		var log = [];

		var a = applyState({}, {
			a: {
				init: 1,

				1: {
					before: function(){
						// console.log("before 1")
						return 3
					}
				},
				2: {
					before: function(){
						// console.log("before 2")
						return 4
					}
				},
				_: {
					before: function(){
						// console.log("_before")
						log.push("_before")
					},
					after: function(){
						// console.log("_after")
						log.push("_after")
					}
				}

			}
		})

		// console.log(A.properties)

		assert.equal(a.a, 3);
		assert.deepEqual(log, ["_before"]);

		log = [];
		a.a = 2;
		assert.equal(a.a, 4);
		assert.deepEqual(log, ["_after", "_before"])

		log = [];
		a.a = 8;
		assert.equal(a.a, 8);
		assert.deepEqual(log, ["_after", "_before"])
	});




	it("keep states callbacks context", function(){
		var i = 0
		var a = applyState({}, {
			a: {
				1: {
					before: function(){
						i++
						assert.equal(this, a)
					},
					after: function(){
						i++
						assert.equal(this, a)
					},
					fn: function(){
						i++
						assert.equal(this, a)
					}
				}
			}
		})

		a.a = 1;
		enot.emit(a, "fn")
		a.a = 2
		assert.equal(i, 3)
	})

	it("redefine property behaviour by descriptors defined in states of other property", function(){
		var a = applyState({}, {
			a: {
				init: 3
			},
			x: {
				1: {
					a: {
						get: function(){
							return 1
						}
					}
				},
				2: {
					a: {
						get: function(){
							return 2
						}
					}
				}
			}
		});

		assert.equal(a.a, 3);

		a.a = 4;
		assert.equal(a.a, 4);

		a.x = 1;
		assert.equal(a.a, 1)

		a.x = 2;
		assert.equal(a.a, 2)

		//TODO: unapply specific getter
		// a.x = 3;
		// assert.equal(a.a, 4);
	})

	it("recognize function as a short state notation of `before` method", function(){
		var a = applyState({}, {
			a: {
				init: 1,
				1: {},
				_: function(){ return 1 }

			}
		})

		// console.log(A.properties)
		//FIXME: parse states shortcuts

		assert.equal(a.a, 1);
		a.a = 2;
		assert.equal(a.a, 1);
	})




	it("catch state recursions", function(){
		var a = applyState({}, {
			a: {
				init: 1,

				1: function(){
					// console.log("before 1")
					return 2;
				},

				2: function(){
					// console.log("before 2")
					return 1;
				}

			}
		});


		assert.equal(a.a, 1);
		// assert.throw(function(){}, "Too many redirects");
	})


	it("redefine callbacks in states", function(){
		var log = [];
		var a = applyState({cb: function(){
				// console.log("extra cb")
				log.push("ex")
			}}, {
			a: {
				init: 1,

				2: {
					meth: function(){
						log.push("2")
					},
					cb: function(){
						// console.log("2cb")
						log.push("2cb")
					},
					cbAlias: null
				}
			},

			cbAlias: 'cb',
			cbAlias2: 'cb',

			meth: function(){
				log.push("default")
				// console.log("meth")
			},
			cb: function(){
				// console.log("default cb")
				log.push("default cb")
			}
		})

		assert.deepEqual(log, [])

		// A.meth();
		enot.emit(a, "meth")
		enot.emit(a, "cb")
		assert.sameMembers(log, ["default", "ex"])
		log = [];
		enot.emit(a, "cbAlias")
		assert.deepEqual(log, ["ex"])
		enot.emit(a, "cbAlias2")
		assert.deepEqual(log, ["ex", "ex"])

		log = [];
		// console.log("---------a = 2")
		a.a = 2;
		// A.meth();
		enot.emit(a, "meth")
		enot.emit(a, "cb")
		assert.sameMembers(log, ["default", "ex", "2", "2cb"])
		enot.emit(a, "cbAlias")
		assert.sameMembers(log, ["default", "ex", "2", "2cb"])
		enot.emit(a, "cbAlias2")
		assert.sameMembers(log, ["default", "ex", "2", "2cb", "2cb"])

		log = [];
		// console.log("------a=1")
		a.a = 1;
		a.meth();
		enot.emit(a, "cb")
		assert.sameMembers(log, ["default", "ex"])
		enot.emit(a, "cbAlias")
		assert.sameMembers(log, ["default", "ex", "ex"])
		enot.emit(a, "cbAlias2")
		assert.sameMembers(log, ["default", "ex", "ex", "ex"])
	})

	it("redefine variables in states", function(){
		var a = applyState({}, {
			a: {
				init: 1,

				2: {
					b: 2,
					c: 2,
					d: "d"
				}
			},

			b: 1,
			c: {c: 1},
			d: "str"
		})

		// console.log("---- new A")

		assert.equal(a.a, 1)
		assert.equal(a.b, 1)
		assert.equal(a.c, undefined)
		assert.equal(a.d, "str")
		// console.log('---- a = 2')
		a.a = 2;
		assert.equal(a.b, 2)
		assert.equal(a.c, 2)
		assert.equal(a.d, "d")
	})


	it("redefine complicated nested stateful descirptors with self-links", function(){
		var a = applyState({}, {
			a: {
				init: 1,
				1: 2,
				2: function(){return 3},
				3: {a: 4},
				4: {
					before: 5
				},
				5: {
					before: function(){
						return 6
					}
				},
				6: {
					a: {
						init: 7
					}
				}
			}
		})
		// assert.equal(a.a, 7)
	})

	it("reset state variables to default values", function(){
		var a = applyState({}, {
			v: {
				init: 1,

				2: {
					a: 2
				}
			},

			a: 1
		})


		assert.equal(a.a, 1)

		a.v = 2;
		assert.equal(a.a, 2)

		a.v = 1;
		assert.equal(a.a, 1)
	})




	it("handle listed state values", function(){
		var a = applyState({}, {
			a: {
				init:1,

				'1,2': {
					x: 1
				}
			}
		})

		assert.equal(a.x, 1)
	})

	it("handle redirect shortcuts", function(){
		var a = applyState({}, {
			a: {
				init: 1,

				1: 2,
				2: function(){
					return 3;
				},
				3: {

				},
				_: false

			}
		})

		// console.log(A.properties)


		assert.equal(a.a, 3);

		// console.log("---- a.a = 4")
		a.a = 4;

		assert.equal(a.a, 3);
	})

	it("properly throw to default values in undefined states", function(){
		var log = [];
		var a = applyState({}, {
			v: {
				init: 1,

				1: {
					a: 1
				},

				2: {
					x: 1,
					a: 2
				},

				3: {
					a: 3
				}
			},

			x:2
		})

		// console.dir(A)

		assert.equal(a.x, 2)

		// console.log("----v = 2")
		a.v = 2;
		assert.equal(a.x, 1)

		// console.log("----v = 3")
		a.v = 3;
		assert.equal(a.x, 2)

		// console.log("----v = 4")
		a.v = 4;
		assert.equal(a.x, 2)
		assert.equal(a.a, 3)
	})


	it("handle weird state cases", function(){
		var a = applyState({}, {
			a: {
				'false': false,
				x: false,
				y: 'y',
				z: '_',
				i: {
					a: false
				},
				_: 'y'
			}
		})


		assert.equal(a.a, 'y');
	})


	it("init gets on well with states", function(){
		var log = [];
		var a = applyState({a: 0}, {
			a: {
				init: function(value){
					log.push("init");
					// console.log("init cb", value)
					assert.equal(value, 0);
					return 1;
				},

				0: {
					before: function(){
						log.push("before0")
						// assert.equal(a.a, xxx)
					}
				},
				1: {
					before: function(){
						log.push("before1")
					}
				},
				2: {
					before: function(){
						log.push("before2")
					}
				}

			}
		})

		assert.deepEqual(log, ["init", "before1"]);
		assert.equal(a.a, 1);
	})


	it("all state-dependent properties has to present on element in undefined state", function(){
		var a = applyState({}, {
			a: {
				1: {
					x:1,
					'@x some': function(){
						return 123;
					}
				}
			}
		});


		assert.ok("x" in a);
		assert.property(a, "@x some");
	})


	it("modify descriptors in runtime", function(){
		var log = [];

		var a = applyState({}, {
			a: {
				1: {
					b: {
						set: function(val){
							return val * 3
						},
						changed: function(){
							log.push("changed")
						}
					}
				}
			},

			b: {
				init: 1,
				set: function(val){
					// console.log('set b', val)
					return val * 2
				}
			}
		})


		assert.equal(a.b, 2);

		// console.log("---set b 2")
		a.b = 2;
		assert.equal(a.b, 4);
		assert.deepEqual(log, []);

		// console.log("---set a 1")
		a.a = 1;
		assert.equal(a.b, 4);
		assert.deepEqual(log, []);

		// console.log("---set b 3")
		log = [];
		a.b = 3;
		assert.equal(a.b, 9);
		assert.deepEqual(log, ["changed"]);

		// console.log('---set a 2')
		//FIXME: make returning to _ state not reinit `init`
		a.a = 2;
		assert.equal(a.b, 9);
		assert.deepEqual(log, ["changed"]);

		// console.log("---set b 3")
		a.b = 3;
		assert.equal(a.b, 6);
		assert.deepEqual(log, ["changed"]);
	})

	it("nested states", function(){
		//FIXME: expand this test
		var a = applyState({}, {
			a: {
				init: 1,

				1: {
					a: {
						init: 2

					}
				},

				2: {
					x: 1
				}
			}
		})


		assert.equal(a.a, 1);
	})


	it("stateful events should be consistent && exclusive (they are noop in other states)", function(){
		var i = 0;
		var j = 0;
		var a = applyState({z: {x:1}}, {
			x: {
				init: 1,
				1: {
					'click': function(){
						j++
					}
				},
				2: {

				},
				3: {
					'this.z click': 'inc'
				}
			},

			inc: function(){
				i++
			}
		});

		var z = a.z;

		enot.emit(z, 'click')
		enot.emit(a, 'click')
		assert.equal(i, 0)
		assert.equal(j, 1)

		// console.log('-------- x = 2')
		a.x = 2;

		enot.emit(z, 'click')
		enot.emit(a, 'click')
		assert.equal(i, 0)
		assert.equal(j, 1)

		// console.log('-------- x = 3')
		a.x = 3;

		enot.emit(z, 'click')
		enot.emit(a, 'click')
		assert.equal(i, 1)
		assert.equal(j, 1)

		// console.log('------- x = 2')
		a.x = 2;
		enot.emit(z, 'click')
		enot.emit(a, 'click')
		assert.equal(i, 1)
		assert.equal(j, 1)

		// console.log('------- x = 1')
		a.x = 1;

		enot.emit(z, 'click')
		enot.emit(a, 'click')
		assert.equal(i, 1)
		assert.equal(j, 2)
	})


	it("undefined get/set result", function(){
		var a = applyState({}, {
			a: {
				init: 1,
				set: function(a){

				}
			},
			b: {
				init: 2,
				get: function(){

				}
			}
		});

		assert.equal(a.a, 1);
		assert.equal(a.b, 2);
	})


	it("same event in different states", function(){
		var log = [];
		var a = applyState({}, {
			a: {
				_: {
					x: function(){log.push(1)}
				},
				2: {
					x: function(){}
				}
			},

			b: {
				_: {
					x: function(){log.push(2)}
				}
			}
		});

		enot.emit(a, 'x');
		assert.sameMembers(log, [1,2])

		// console.log('------- a.a = 2')
		a.a = 2;
		enot.emit(a, 'x');
		assert.sameMembers(log, [1,2,2])
	})


	it("events bound via on/off", function(){
		var i = 0;
		var inc = function(){
			i++
			// console.log("inc", i)
		}
		var a = applyState({}, {
			a: inc//function(){console.log(1)}
		})


		enot.emit(a, "a");
		assert.equal(i, 1);

		// console.log('--------add listener')
		//NOTE: inc shouldn’t be bound twice, it’s specifics of `addEventListener`
		enot.on(a, "a",
			inc //inc
		);

		enot.emit(a, "a");
		assert.equal(i, 3);

		i = 0;

		// console.log('--------remove listener')
		enot.off(a, "a", inc)

		enot.emit(a, "a");
		assert.equal(i, 1);
	})


	it("mind context in all possible events", function(){
		var i = 0;
		var a = {target: {x:{}}};
		a = applyState(a, {
			'@target x:one': function(){
				assert.equal(this, a);
			},

			//basic descriptor
			a: {
				init: function(){
					assert.equal(this, a);
				},
				get: function(){
					assert.equal(this, a);
				},
				set: function(){
					assert.equal(this, a);
				},
				changed: function(){
					assert.equal(this, a);
				},
				1: function(){
					assert.equal(this, a);
				},
				2: {
					before: function(){
						assert.equal(this, a);
					},
					'@target y': function(){
						i++
						// console.log(this, a)
						assert.equal(this, a);
					},
					after: function(){
						assert.equal(this, a);
					}
				},
				_: function(){
					assert.equal(this, a);
				}
			},

			'@target.x z': function(){
				i++
				assert.equal(this, a);
			}

		})


		// console.log("----a=1")
		a.a = 1;
		// console.log("----a=2")
		a.a = 2;
		enot.emit(a.target, 'x');
		enot.emit(a.target, 'y');
		assert.equal(i, 1);
		// console.log("----a=3")
		a.a = 3;


		// console.log("----dispatch z")
		enot.emit(a.target.x, 'z', true, true);
		assert.equal(i, 2);
	})




	it("properly keep native properties but handle own callbacks", function(){
		var i = 0, j = 0;
		var a = {
			click: function(){i++}
		}
		applyState(a, {
			click: function(){
				j++
			}
		}, {click: true})

		a.click();
		assert.equal(i,1)

		enot.emit(a, 'click')
		assert.equal(j,1)
	})

	it("transmit plain values", function(){
		var a = applyState({}, {
			x:1
		})

		a.x = 1;
	})

	it("keep native properties untaught", function(){
		var fn = function(){}
		var a = {
			x: 1,
			y: fn
		}

		applyState(a, {
			x: 2,
			y: function(){}
		})

		assert.equal(a.x, 1)
		assert.equal(a.y, fn)
	})

	it("self reference redirects", function(){
		var i = 0;
		var a = applyState({}, {
			$a: {
				init: function(){
					return {};
				}
			},

			x: {
				_:{
					'@$a click, click': 'inc'
				}
			},

			// API
			y: {
				_: {
					inc: function(){
						i++
					}
				}
			}

		}, {click: true});

		enot.emit(a.$a, 'click')
		assert.equal(i, 1)

		// console.log('----fire click')
		enot.emit(a, 'click')
		assert.equal(i, 2)
	})


	it("properly init state values", function(){
		var a = applyState({a: "b"}, {
			a: {
				init: "a",

				a: function(){

				},
				b: function(){

				}
			}
		})

		assert.equal(a.a, "b")
	})

	it("init within init", function(){
		var a = applyState({}, {
			x: {
				init: function(){
					this.x = 1;
				}
			}
		});

		assert.equal(a.x, 1);
	});

	it("double :defer bind @dropdown_case (check for noop)")

	it("ignore bind to non-str or non-fn events", function(){
		var i = 0;
		var a = applyState({}, {
			x: false,
			false: function(){i++}
		});

		enot.emit(a, 'x')
		assert.equal(i, 0);
	})

	it("init event self references beforehead", function(){
		//TODO: try to catch that
		var i = 0;
		var a = applyState({},{
			s: {
				init: 1,
				1: {
					'@z x': function(){
						i++
					}
				}
			},
			q: {
				init: 1,
				1: {
					z: function(){return {}}
				}
			}
		})

		enot.emit(a.z, 'x');
		assert.equal(i,1);
	})

	it("init variable from within state", function(){
		var a = applyState({}, {
			s: {
				_: {
				},
				1: {
					a:1
				},
				2: {

				}
			}
		});

		assert.equal(a.a, undefined)

		a.s = 1;
		assert.equal(a.a, 1)

		a.s = 2;
		assert.equal(a.a, 1)
	});

	it("switching state shouldn’t erase value", function(){
		var a = applyState({}, {
			a: {
				1: {
					x: 1
				},
				2: {

				}
			},
			x: {}
		});

		// assert.equal(a.x, undefined)

		a.a = 1;
		assert.equal(a.x, 1)

		a.a = 2;
		assert.equal(a.x, 1)

		a.a = 1;
		assert.equal(a.x, 1)

		a.a = 0;
		assert.equal(a.x, 1)
	});

	it("should try to keep initial values untouched even in secondary run", function(){
		var a = applyState({x: 'abc'}, {
			x: 'def'
		});
		applyState(a, {x: 'def', y: 1})

		assert.equal(a.x, 'abc')
		assert.equal(a.y, 1)
	})

	it("flatten keys properly", function(){
		var a = applyState({}, {
			a: {
				set: function(v){
					return v + 1;
				}
			},
			'a,b': {
				init: 1
			}
		});

		assert.equal(a.a, 2)
		assert.equal(a.b, 1)
	})

	it.skip("props circular dependency", function(){
		//TODO: make it fail
		var a = applyState({},{
			x: {
				init: 0,
				set: function(){
					var z = this.y + 1
					return z;
				}
			},
			y: {
				init: 1,
				set: function(){
					var z = this.x + 1
					return z;
				}
			}
		})
	})

	it('Flatten listed keys', function(){
		var log = [];

		var a = applyState({}, {
			s: {
				'1,2,3,4': {

				},
				'1,2': {
					f: function(){
						log.push(1)
					}
				},

				'3,4': {
					f: function(){
						log.push(2)
					}
				},
				_: {

				}
			}
		});
		a.s = 1;

		a.f();

		assert.deepEqual(log, [1])
	})


	it("interindependent props", function(){
		var i = 0;

		var a = applyState({}, {
			c: {
				init: function(){
					// console.group('init c')
					this.fn()
					// console.groupEnd('after init c')
				}
			},

			f: {
				_: {
					fn: function(){
						// console.log('call fn')
						i++
					}
				}
			}
		});

		assert.equal(i, 1);
	})
})