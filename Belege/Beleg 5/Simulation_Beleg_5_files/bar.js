(function() {
    var Bar,
        Emitter,
        noop = function() {},
        __slice = [].slice,
        __hasProp = {}.hasOwnProperty,
        __extends = function(child, parent) {
            for (var key in parent) {
                if (__hasProp.call(parent, key))
                    child[key] = parent[key];
            }

            function Constructor() {
                this.constructor = child;
            }
            Constructor.prototype = parent.prototype;
            child.prototype = new Constructor();
            child.__super__ = parent.prototype;
            return child;
        };

    Emitter = (function() {
        function Emitter() {}

        Emitter.prototype.addEventListener = Emitter.prototype.on;

        Emitter.prototype.on = function(event, fn) {
            this._callbacks = this._callbacks || {};
            if (!this._callbacks[event]) {
                this._callbacks[event] = [];
            }
            this._callbacks[event].push(fn);
            return this;
        };

        Emitter.prototype.emit = function() {
            var args, callback, callbacks, event, _i, _len;
            event = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
            this._callbacks = this._callbacks || {};
            callbacks = this._callbacks[event];
            if (callbacks) {
                for (_i = 0, _len = callbacks.length; _i < _len; _i++) {
                    callback = callbacks[_i];
                    callback.apply(this, args);
                }
            }
            return this;
        };

        Emitter.prototype.removeListener = Emitter.prototype.off;

        Emitter.prototype.removeAllListeners = Emitter.prototype.off;

        Emitter.prototype.removeEventListener = Emitter.prototype.off;

        Emitter.prototype.off = function(event, fn) {
            var callback, callbacks, i, _i, _len;
            if (!this._callbacks || arguments.length === 0) {
                this._callbacks = {};
                return this;
            }
            callbacks = this._callbacks[event];
            if (!callbacks) {
                return this;
            }
            if (arguments.length === 1) {
                delete this._callbacks[event];
                return this;
            }
            for (i = _i = 0, _len = callbacks.length; _i < _len; i = ++_i) {
                callback = callbacks[i];
                if (callback === fn) {
                    callbacks.splice(i, 1);
                    break;
                }
            }
            return this;
        };

        return Emitter;
    })();

    Bar = (function(_super) {
        var apply,
            round,
            extend;

        __extends(Bar, _super);

        Bar.prototype.Emitter = Emitter;

        Bar.prototype.events = ["update"];

        Bar.prototype.defaultOptions = {
            capacity: 100,
            precision: 2,
            bars: [{
                initial: 0,
                tooltip: "Predicted: {{percent}}% {{used}}/{{capacity}}",
                attributes: {
                    id: "predicted",
                    classes: "predicted"
                }
            }, {
                initial: 0,
                tooltip: "Used: {{percent}}% {{used}}/{{capacity}}",
                attributes: {
                    id: "used",
                    classes: "used"
                }
            }],
            tooltip: function(tooltip, percent, used, capacity) {
                return tooltip
                    .replace("{{percent}}", percent)
                    .replace("{{used}}", used)
                    .replace("{{capacity}}", capacity);
            },
            init: function() {
                return noop;
            },
            create: function() {
                return noop;
            },
            clipValue: false,
            remaining: true,
            remainingTooltip: "Remaining: {{percent}}% {{used}}/{{capacity}}",
            height: "5px",
            attributes: {
                classes: "meter"
            }
        };

        apply = function(elem, attrs) {
            for (var idx in attrs) {
                if ((idx === 'styles' || idx === 'style') && typeof attrs[idx] === 'object') {
                    for (var prop in attrs[idx]) {
                        elem.style[prop] = attrs[idx][prop];
                    }
                } else if (idx === 'classes') {
                    elem.setAttribute('class', attrs[idx]);
                } else if (idx === 'html') {
                    elem.innerHTML = attrs[idx];
                } else {
                    elem.setAttribute(idx, attrs[idx]);
                }
            }
        };

        round = function(value, decimals) {
            return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
        };

        extend = function() {
            var key, object, objects, target, val, _i, _len;
            target = arguments[0], objects = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
            for (_i = 0, _len = objects.length; _i < _len; _i++) {
                object = objects[_i];
                for (key in object) {
                    val = object[key];
                    target[key] = val;
                }
            }
            return target;
        };

        function Bar(element, options) {
            this.element = element;
            if (typeof this.element === "string") {
                this.element = document.querySelector(this.element);
            }
            this.options = extend({}, this.defaultOptions, options != null ? options : {});
            this.bars = this.options.bars.slice();
            this.init();
        };

        Bar.prototype.init = function() {
            var b,
                bar;
            this.states = [];
            this.element.style.height = this.options.height;
            apply(this.element, this.options.attributes);
            for (var i = 0; i < this.bars.length; i++) {
                bar = this.bars[i];
                var elem = document.createElement("span");
                apply(elem, bar.attributes);
                this.element.appendChild(elem);
                b = {
                    state: 0,	// Will be immediately overridden in #set(index, value)
                    value: 0,	// Will be immediately overridden in #set(index, value)
                    percent: 0,	// Will be immediately overridden in #set(index, value)
                    config: bar,
                    element: elem,
                    index: i
                };
                this.states.push(b);
                this.set(b, bar.initial);
                this.options.create.call(this, b, this.options.capacity);
            }
            this.options.init.call(this);
        };

        Bar.prototype.add = function(index, amount) {
            var b = typeof index === "number" ? this.states[index] : index;
            return this.set(index, b.value + amount);
        };

        Bar.prototype.remove = function(index, amount) {
            var b = typeof index === "number" ? this.states[index] : index;
            return this.set(index, b.value - amount);
        };

        Bar.prototype.set = function(index, value) {
            var b = typeof index === "number" ? this.states[index] : index;
            var capacity = this.options.capacity;
            var state = 0;
            var percent = 0;
            if (value > capacity) {
                state = 1;
                percent = 100;
                if (this.options.clipValue) {
                	value = capacity;
                }
            } else if (value < 0) {
                state = -1;
                percent = 0;
                if (this.options.clipValue) {
                	value = 0;
                }
            } else {
                percent = round((value / capacity) * 100, this.options.precision);
            }
            b.state = state;
            b.value = value;
            b.percent = percent;
            b.element.style.width = percent + "%"

            if (state === 0 && b.config.tooltip) {
                b.element.title = this.options.tooltip(b.config.tooltip, percent, value, capacity);
            }

            this.emit("update", b, capacity);

            if (this.options.remaining && state !== 1) {
                var size = 0;
                var elems = this.states;
                for (var i = 0; i < elems.length; i++) {
                    size = Math.max(elems[i].value, size);
                }
                var remaining = capacity - size;
                if (this.options.remainingTooltip) {
                	this.element.title = this.options.tooltip(this.options.remainingTooltip, (remaining / capacity) * 100, remaining, capacity);
                }
            }
            return b;
        };

        return Bar;
    })(Emitter);

    Bar.version = "0.1";
    Bar.options = {};

    if (typeof jQuery !== "undefined" && jQuery !== null) {
        jQuery.fn.bar = function(options) {
            return this.each(function() {
                return new Bar(this, options);
            });
        };
    }

    if (typeof module !== "undefined" && module !== null) {
        module.exports = Bar;
    } else {
        window.Bar = Bar;
    }
}).call(this);