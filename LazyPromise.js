function LazyPromise(f, thunk) {
	function isPromise(p) {
		return typeof f.then === 'function';
	}
	
	// Called as function (cast)
	if (!(this instanceof LazyPromise)) {
		if (f instanceof LazyPromise) {
			return f;
		} else if (isPromise(f)) {
			f.lazyThen = f.then;
			f.lazyCatch = f.catch;
			return f;
		} else {
			throw new TypeError('LazyPromise instances must be created with new.');
		}
	}

	var self = this;

	if (typeof f === 'function') {
		// New instance
		this.thunk = (function () {
			var resolve, reject;
			self.prototype = new Promise(function (res, rej) {
				resolve = res;
				reject = rej;
			});

			var called = false;
			return function () {
				if (!called) {
					called = true;
					try {
						resolve(f(resolve, reject));
					} catch (e) {
						reject(e);
					}
				}
			}
		})();
	} else if (isPromise(f) && thunk) {
		// Chained
		this.prototype = f;
		this.thunk = thunk;
	} else {
		throw new TypeError('LazyPromise expects a function.');
	}

	this.then = function (onFulfilled, onRejected) {
		self.thunk();
		return self.prototype.then(onFulfilled, onRejected);
	};
	this.catch = function (onRejected) {
		self.thunk();
		return self.prototype.catch(onRejected);
	};

	this.lazyThen = function (onFulfilled, onRejected) {
		return new LazyPromise(self.prototype.then(onFulfilled, onRejected), self.thunk);
	};
	this.lazyCatch = function (onRejected) {
		return new LazyPromise(self.prototype.catch(onRejected), self.thunk);
	};
	this.finally = function (f) {
		if (self.prototype.finally) {
			return new LazyPromise(self.prototype.finally(f), self.thunk);
		} else {
			throw new TypeError('Promise implementation does not support finally.');
		}
	};
}
