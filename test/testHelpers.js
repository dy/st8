//testing helpers stuff

function createKeyEvt(name, code){
	var evt = document.createEvent("KeyboardEvent")
	Object.defineProperty(evt, 'keyCode', {
				get : function() {
					return this.keyCodeVal;
				}
	});
	Object.defineProperty(evt, 'which', {
				get : function() {
					return this.keyCodeVal;
				}
	});

	if (evt.initKeyboardEvent) {
		evt.initKeyboardEvent("keydown", true, true, document.defaultView, false, false, false, false, code, code);
	} else {
		evt.initKeyEvent("keydown", true, true, document.defaultView, false, false, false, false, code, 0);
	}

	evt.keyCodeVal = code;

	return evt
}

function createMouseEvt(name, btn){
	var evt = document.createEvent("MouseEvent")
	evt.initMouseEvent(
		name, true,true,window,
		1, 0,0,0,0,
		false,false,false,false,
		btn, null
	)
	evt.which = btn;
	return evt
}

function dispatchEvt(el, eventName, data, bubbles){
	var event;
	if (el instanceof HTMLElement || el === window || el === document) {
		if (!(eventName instanceof Event)) {
			event =  document.createEvent("CustomEvent");
			event.initCustomEvent(eventName, bubbles, null, data)
		} else {
			event = eventName;
		}
		// var event = new CustomEvent(eventName, { detail: data, bubbles: bubbles })
		el.dispatchEvent(event);
	} else {
		if (el.fire) el.fire(eventName);
		else if (el.trigger) el.trigger(eventName);
		else if (el.emit) el.emit(eventName);
	}
}

function listen(el, evt, fn){
	//bind target fn
	if (typeof $ !== "undefined"){
		//delegate to jquery
		$(el).on(evt, fn);
	} else {
		//listen element
		el.addEventListener(evt, fn)
	}
}
function stopListen(el, evt, fn){
	//bind target fn
	if (typeof $ !== "undefined"){
		//delegate to jquery
		$(el).off(evt, fn);
	} else {
		//listen element
		el.removeEventListener(evt, fn)
	}
}