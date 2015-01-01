* Is it better to declare state events or just to use before/after?
	* - Before/after is concise and agile enough to do anything
	* - Declaring events causes heavy _enot_ dependency
	* + Declaring events adds sense to `emit`.
		* - Emit has sense by it’s own.
	* + It makes sense for _StateEmitter_ name
		* - _StateEmitter_ shortens use-case range for _State_.
	* - It drastically increases size (+4kb gzipped).
	* + In most cases in before/after you have to have emmy’s `.not` etc methods (bind to document - impossible with component-emitter).
		* - Quite often you have to call on component-specific targets, like `targets` list for dropdown, so you can’t declaratively describe it.
			* + Unless you use inner-reference notation `@targets`
				* - Which increases compile-size due to necessity to keep references
	* + You need to declare `off`s in `after` to unbind `on`s.
		* - And it’s extra flexibility for describing things