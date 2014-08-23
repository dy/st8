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
		var A = Mod({
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
		})

		var a = new A;

		assert.equal(a.a, 1);

		a.b = 1;
		assert.equal(a.a, 2);

		a.b = 2;
		assert.equal(a.a, 1);
	});

})