# LazyPromise

Promises are eager by definition.  Whatever function you pass to `new Promise(f)` is run immediately.  If you don't want to run the function right away, then what you're doing is not formally a Promise, _but_ it can be convenient to apply Promise semantics to this usage style.

## Use Case

Consider a cache that might start with some instances of a resource but defer loading other instances until they are needed.  From a usage perspective, it's convenient to pretend that all instances are async, and the pattern you would normally use for that is a Promise.  However, you don't want to load the other instances until they are needed.  You can certainly structure access to defer construction of the promises, but you might prefer to invert control and hand dependents a preconfigured "promise" up front so that they don't need to know about the cache or anything else other than that there is a resource that they access asynchronously.

```
var cache = {
	'key1': Promise.resolve(...local value...),
	'key2': new LazyPromise(...lazy function...), // not evaluated yet!
	'key3': new LazyPromise(...lazy function...)
};
	
cache['key2'].then(...); // triggers evaluation if needed
```

## Definition and Usage

A `LazyPromise` is a constructor function that inherits protypally from Promise and adds two basic characteristics:
1. Its function argument will be called at most once, but not until the first `then` or `catch` call.
2. It has `lazyThen` and `lazyCatch` methods that allow chaining without triggering evaluation.

```
var lp = new LazyPromise(f); // f receives resolve/reject methods; it can also return or throw

lp = lp.lazyThen(...); // still hasn't called f

lp = lp.then(...); // finally calls f

lp = lp.finally(...); // finally is not a standard method, but many Promise implementations support it, so LazyPromise proxies it
```
```
var lp = LazyPromise(p); // call as a function to cast a Promise to a LazyPromise; if already lazy then p is just returned

lp.lazyThen(...); // you can now call lazy methods (but if this wraps a regular promise, then lazyThen is just an alias to then)
```

## Implementation

LazyPromise is a constructor function that you should use for the most part like you would use Promise.  If called as a regular function, then it assumes you're trying to cast/wrap a Promise so you can access the lazy methods that LazyPromise extends Promise with.

Internally, LazyPromise assigns a "native" (or whatever happens to be global) Promise instance as its prototype.  So it's going to look and behave like a Promise for the most part.

If you call `then` or `catch` on a LazyPromise, then it's going to "thunk" and call the lazy function it was passed (which will execute at most once and resolve or reject the prototype Promise instance).  At this point it's just like any other Promise, so it just returns the result of calling `then` or `catch` on the prototype.

The lazy methods do not thunk, but they need to return a LazyPromise.  They do this by calling an internal constructor variant that initializes a new LazyPromise with the `then`/`catch` result on the original prototype and the thunk function.  The new LazyPromise result can continue to be chained.  When the thunk finally happens, the native promise chain that's been built up will execute normally.

## Caveats

This is not a conventional use of promises, and if you find yourself reaching for this pattern, it's a good idea to consider whether there's another approach.  You might find that there's a way to achieve the desired laziness without introducing a new concept.

LazyPromise is a global.  It assumes a global Promise.

LazyPromise is a Promise, but depending on your runtime environment, it might not be the Promise you think it is.  Depending on load order, what other libraries and polyfills are present and whether a library ends up using the same Promise that LazyPromise sees you may or may not be able to use `lp instanceof Promise` reliably.  LazyPromise uses a simple `then` check as its "is this a Promise" criteria.

LazyPromise thunks automatically on the first `then` or `catch` call.  If you chain through code that tries to use a LazyPromise as a regular Promise then you'll get an automatic thunk that may not be what you intended.  To avoid this, pass the prototype which is a regular promise chain pending the thunk.  You can trigger the thunk manually by calling `thunk()` on the LazyPromise instance.

```
var lp = new LazyPromise(...); // the prototype of a LazyPromise is a regular Promise pending thunk

lp.prototype.then(...); // chaining off the prototype will not thunk

lp.thunk(); // you can trigger the thunk directly
```
