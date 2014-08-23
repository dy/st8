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

})