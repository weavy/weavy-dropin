
/**
 * Generate a S4 alphanumeric 4 character sequence suitable for non-sensitive GUID generation etc.
 */
export function S4() {
  return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}



/**
 * Wraps an event handler with a delegate selector, so it can be used for generic listening similar to jQuerys `$(element).on("click", ".my-selector", handler)`.
 * 
 * @example
 * document.body.addEventListener("click", delegate("button.btn", function(event) { ... });
 * 
 * @param {string} selector - The selector to match.
 * @param {function} handler - The handler function to wrap.
 */
export function delegate(selector, handler) {
  return function (event) {
    var targ = event.target;
    do {
      if (targ.matches(selector)) {
        handler.apply(targ, arguments);
      }
    } while ((targ = targ.parentNode) && targ !== event.currentTarget);
  }
}

export function debounce(func, delay) {
  let inDebounce
  let debounce = function () {
    const context = this;
    const args = arguments;
    clearTimeout(inDebounce);
    inDebounce = setTimeout(() => func.apply(context, args), delay);
  };
  debounce.cancel = function () { clearTimeout(inDebounce) };
  return debounce;
}


/**
 * Checks if an element is visible, similar to jQuery :visible
 * @param {HTMLElement} el
 */
export function isVisible(el) {
  return el.isConnected && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)
}

/*
 * is-plain-object <https://github.com/jonschlinkert/is-plain-object>
 *
 * Copyright (c) 2014-2017, Jon Schlinkert.
 * Released under the MIT License.
 */

/**
 * Checks if an object is an object.
 * 
 * @param {any} maybeObject - The object to check
 * @returns {boolean} True if the object is an object
 */
export function isObject(maybeObject) {
  return Object.prototype.toString.call(maybeObject) === '[object Object]';
}

/**
 * Checks if an object is a plain object {}, similar to jQuery.isPlainObject()
 * 
 * @param {any} maybePlainObject - The object to check
 * @returns {boolean} True if the object is plain
 */
export function isPlainObject(maybePlainObject) {
  var ctor, prot;

  if (isObject(maybePlainObject) === false) return false;

  // If has modified constructor
  ctor = maybePlainObject.constructor;
  if (ctor === undefined) return true;

  // If has modified prototype
  prot = ctor.prototype;
  if (isObject(prot) === false) return false;

  // If constructor does not have an Object-specific method
  if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
    return false;
  }

  // Most likely a plain Object
  return true;
}



/**
 * Compares two plain objects. Compares all the properties in a to any properties in b.
 * 
 * @param {any} a - The plain object to compare with b
 * @param {any} b - The plain object to compare properties from a to
 * @param {any} skipLength - Do not compare the number of properties
 * @returns {boolean}
 */
export function eqObjects(a, b, skipLength) {
  if (!isPlainObject(a) || !isPlainObject(b)) {
    return false;
  }

  var aProps = Object.getOwnPropertyNames(a);
  var bProps = Object.getOwnPropertyNames(b);

  if (!skipLength && aProps.length !== bProps.length) {
    return false;
  }

  for (var i = 0; i < aProps.length; i++) {
    var propName = aProps[i];
    var propA = a[propName];
    var propB = b[propName];

    if (propA !== propB && !eqJQuery(propA, propB) && !eqObjects(propA, propB, skipLength)) {
      return false;
    }
  }

  return true;
}

/**
 * Compares two jQuery objects.
 *
 * @param {any} a - The first jQuery object to compare
 * @param {any} b - The second jQuery object to compare
 * @returns {boolean}
 */
export function eqJQuery(a, b) {
  return a && b && a.jquery && b.jquery && a.jquery === b.jquery && a.length === b.length && a.length === a.filter(b).length;
}

/**
 * Removes HTMLElement and Node from object before serializing. Used with JSON.stringify().
 * 
 * @example
 * var jsonString = JSON.stringify(data, sanitizeJSON);
 * 
 * @param {string} key
 * @param {any} value
 * @returns {any} - Returns the value or undefined if removed.
 */
export function sanitizeJSON(key, value) {
  // Filtering out DOM Elements and nodes
  if (value instanceof HTMLElement || value instanceof Node) {
    return undefined;
  }
  return value;
}


/**
 * Same as jQuery.ready()
 * 
 * @param {Function} fn
 */
export function ready(fn) {
  if (document.readyState !== 'loading') {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  }
}

export default {
  S4: S4,
  debounce: debounce,
  delegate: delegate,
  eqJQuery: eqJQuery,
  eqObjects: eqObjects,
  isObject: isObject,
  isPlainObject: isPlainObject,
  isVisible: isVisible,
  ready: ready,
  sanitizeJSON: sanitizeJSON
}
