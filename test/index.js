var enot = require('enot');

describe("State cases", function(){

	it("accessor of outer state defined in inner state", function(){
		var target = applyState({}, {
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
							// console.log('set called')
							assert.equal(v,1)
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
						log.push('bi')
					},
					after: function(){
						log.push('ai')
					}
				},

				set: {
					before: function(){
						log.push('bs')

					},

					after: function(){
						log.push('as')

					}
				},

				get: {
					before: function(){
						// console.log('before get')
						log.push('bg')

					},

					after: function(){
						log.push('ag')

					}
				},

				changed: {
					before: function(){
						log.push('bc')

					},

					after: function(){
						log.push('ac')

					}
				},

				_: {
					before: function(){
						log.push('b_')
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
		delete a.a
		assert.equal(a.a, 3)
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
		enot.fire(a, "e");
		assert.equal(v, 1)
		// console.log('-------a=2')
		a.a = 2;
		assert.equal(v, 1)
		enot.fire(a, "e");
		assert.equal(v, 2)
		// console.log('-------a=3')
		a.a = 3;
		assert.equal(v, 2);
		// console.log('-------fire e')
		enot.fire(a, "e");
		assert.equal(v, 3);
		a.a = 1;
		assert.equal(v, 3);
		enot.fire(a, "e");
		assert.equal(v, 1);

	});

	it("fire state events within before/after", function(){
		var i = 0, y = 0;
		var a = applyState({}, {
			v: {
				_: {
					before: function(){
						// console.log("_:before", this)
						enot.fire(this, "a")
					},
					after: function() {
						// console.log("_:after")
						enot.fire(this, "a")
					},
					a: function() {
						// console.log("_:a")
						i++
					}
				},

				1: {
					before: function() {
						// console.log("1:before")
						enot.fire(this, "a")
					},
					after: function() {
						// console.log("1:after")
						enot.fire(this, "a")
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
		enot.fire(a, "a")
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

})