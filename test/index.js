describe("State cases", function(){

	it("accessor of outer state defined in inner state", function(){
		var target = {};
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

		assert.equal(target.a, 2)
	})

})