import WeavyUtils from './utils';
import WeavyPromise from './promise';
import WeavyConsole from './console';
import WeavyStorage from './storage';

//console.debug("postal-child.js", self.name);

function WeavyPostal(options) {

    var console = new WeavyConsole("WeavyPostalChild");

    var weavyPostal = this;

    this.timeout = options && options.timeout || 2000;

    var inQueue = [];
    var messageListeners = [];

    var _whenLeader = new WeavyPromise();
    var _isLeader = null;

    var _parentWeavyId = null;
    var _parentWindow = null;
    var _parentOrigin = null;
    var _parentName = null;
    var _origin = extractOrigin(window.location.href);

    function extractOrigin(url) {
        var extractOrigin = null;
        try {
            extractOrigin = /^((?:https?:\/\/[^/]+)|(?:file:\/\/))\/?/.exec(url)[1]
        } catch (e) {
            console.error("Unable to resolve location origin. Make sure you are using http, https or file protocol and have a valid location URL.");
        }
        return extractOrigin;
    }

    function distributeMessage(e, fromFrame) {
        var fromSelf = e.source === window && e.origin === _origin;
        var fromParent = e.source === _parentWindow && e.origin === _parentOrigin;

        if (fromSelf || fromParent) {

            var genericDistribution = !e.data.weavyId || e.data.weavyId === true;

            var messageName = e.data.name;
            if (messageName === "distribute") {
                if (_isLeader) {
                    return;
                }
                e.data.name = e.data.distributeName;
            }

            //console.debug("message from", fromSelf && "self" || fromParent && "parent", e.data.name);

            messageListeners.forEach(function (listener) {
                var matchingName = listener.name === messageName || listener.name === "message";
                var genericListener = listener.selector === null;
                var matchingWeavyId = listener.selector === e.data.weavyId;
                var matchingDataSelector = WeavyUtils.isPlainObject(listener.selector) && WeavyUtils.eqObjects(listener.selector, e.data, true);

                if (matchingName && (genericDistribution || genericListener || matchingWeavyId || matchingDataSelector)) {

                    listener.handler(e, e.data);

                    if (listener.once) {
                        off(listener.name, listener.selector, listener.handler);
                    }
                }
            });
        }
    }

    window.addEventListener("message", function (e) {
        if (e.data.name && e.data.weavyId !== undefined) {
            if (e.data.weavyMessageId && e.data.name !== "message-receipt" && e.data.name !== "unready") {
                console.debug("sending message receipt", e.data.weavyMessageId, e.data.name)
                try {
                    e.source.postMessage({ name: "message-receipt", weavyId: e.data.weavyId, weavyMessageId: e.data.weavyMessageId }, e.origin);
                } catch (error) {
                    console.error("could not post back message-receipt to source");
                }
            }

            switch (e.data.name) {
                case "register-window":
                    if (!_parentWindow) {
                        //console.debug("registering frame window");
                        _parentOrigin = e.origin;
                        _parentWindow = e.source;
                        _parentName = e.data.windowName;
                        _parentWeavyId = e.data.weavyId;
                    }

                    window.addEventListener("unload", () => {
                        postToParent({ name: "unready" });
                    })

                    console.debug("is not leader");
                    _isLeader = false;
                    _whenLeader.resolve(false);

                    //var statusCode = wvy.context && wvy.context.statusCode;
                    //var statusDescription = wvy.context && wvy.context.statusDescription;
                    var navbarMiddle = document.querySelector(".navbar-middle");
                    var title = navbarMiddle && navbarMiddle.innerText;

                    try {
                        e.source.postMessage({ name: "ready", windowName: e.data.windowName, weavyId: e.data.weavyId, location: window.location.href, title: title/*, statusCode: statusCode, statusDescription: statusDescription*/ }, e.origin);
                    } catch (e) {
                        console.error("register-window could not post back ready-message to source", e);
                    }

                    /*if (wvy.whenLoaded) {
                        wvy.whenLoaded.then(function () {
                            postToParent({ name: "load" });
                        });
                    }*/

                    if (inQueue.length) {
                        inQueue.forEach(function (messageEvent) {
                            distributeMessage(messageEvent)
                        });
                        inQueue = [];
                    }

                    break;
                case "reload":
                    console.debug("reload", _parentName, !!e.data.force);
                    window.location.reload(e.data.force);

                    break;
                default:
                    if (e.source === window || _parentWindow) {
                        distributeMessage(e);
                    } else {
                        inQueue.push(e);
                    }

                    break;
            }
        }
    });

    function on(name, selector, handler) {
        if (typeof arguments[1] === "function") {
            // omit weavyId argument
            handler = arguments[1];
            selector = null;
        }
        messageListeners.push({ name: name, handler: handler, selector: selector });
    }

    function one(name, selector, handler) {
        if (typeof arguments[1] === "function") {
            // omit weavyId argument
            handler = arguments[1];
            selector = null;
        }
        messageListeners.push({ name: name, handler: handler, selector: selector, once: true });
    }

    function off(name, selector, handler) {
        if (typeof arguments[1] === "function") {
            // omit weavyId argument
            handler = arguments[1];
            selector = null;
        }
        messageListeners = messageListeners.filter(function (listener) {
            var nameMatch = name === listener.name;
            var handlerMatch = handler === listener.handler;
            var stringSelectorMatch = typeof selector === "string" && selector === listener.selector;
            var plainObjectMatch = WeavyUtils.isPlainObject(selector) && WeavyUtils.eqObjects(selector, listener.selector);
            var offMatch = nameMatch && handlerMatch && (selector === null || stringSelectorMatch || plainObjectMatch);
            return !(offMatch);
        });
    }

    function whenPostMessage(contentWindow, message, transfer) {
        var whenReceipt = new WeavyPromise();

        if (transfer === null) {
            // Chrome does not allow transfer to be null
            transfer = undefined;
        }

        var toSelf = contentWindow === window.self;
        var toParent = _parentWindow && _parentWindow !== window && _parentWindow === contentWindow;
        var origin = toSelf ? extractOrigin(window.location.href) :
            (toParent && _parentOrigin);
        var validWindow = toSelf || toParent

        if (validWindow) {
            if (!message.weavyMessageId) {
                message.weavyMessageId = WeavyUtils.S4() + WeavyUtils.S4();
            }

            queueMicrotask(() => {
                console.debug("whenPostMessage", message.name, message.weavyMessageId);

                var messageWatchdog = setTimeout(function () {
                    if (whenReceipt.state() === "pending") {
                        whenReceipt.reject(new Error("postMessage() receipt timed out: " + message.weavyMessageId + ", " + message.name));
                    }
                }, weavyPostal.timeout || 2000);

                on("message-receipt", { weavyId: message.weavyId, weavyMessageId: message.weavyMessageId }, function () {
                    console.debug("message-receipt received", message.weavyMessageId, message.name);
                    clearTimeout(messageWatchdog);
                    whenReceipt.resolve();
                });

                try {
                    contentWindow.postMessage(message, origin, transfer);
                } catch (e) {
                    whenReceipt.reject(e);
                }
            })
        } else {
            whenReceipt.reject(new Error("postMessage() Invalid window origin: " + origin + ", " + message.name));
        }

        return whenReceipt();
    }

    function postToSelf(message, transfer) {
        if (typeof message !== "object" || !message.name) {
            console.error("postToSelf() Invalid message format", message);
            return;
        }

        message.weavyId = message.weavyId || true;

        return whenPostMessage(window.self, message, transfer);
    }

    function postToParent(message, transfer) {
        if (typeof message !== "object" || !message.name) {
            console.error("postToParent() Invalid message format", message);
            return;
        }

        return _whenLeader().then(function (isLeader) {
            if (!isLeader) {
                if (message.weavyId === undefined) {
                    message.weavyId = _parentWeavyId;
                }

                if (message.windowName === undefined) {
                    message.windowName = _parentName;
                }

                return whenPostMessage(_parentWindow, message, transfer);
            } else {
                return WeavyPromise.resolve();
            }
        });
    }

    function postToSource(e, message, transfer) {
        if (e.source && e.data.weavyId !== undefined) {
            var fromSelf = e.source === window.self && e.origin === _origin;
            var fromParent = e.source === _parentWindow && e.origin === _parentOrigin;

            if (transfer === null) {
                // Chrome does not allow transfer to be null
                transfer = undefined;
            }

            if (fromSelf || fromParent) {
                message.weavyId = e.data.weavyId;

                try {
                    e.source.postMessage(message, e.origin, transfer);
                } catch (e) {
                    console.error("postToSource() Could not post message back to source");
                }
            }
        }
    }

    function setLeader() {
        if (_whenLeader.state() === "pending") {
            console.debug("Is leader");
            _isLeader = true;
            _whenLeader.resolve(_isLeader);
        }
    }

    function init() {

        // Register in parent or opener
        var parent = window.self.opener !== window.self && window.self.opener || window.self.parent !== window.self && window.self.parent;

        if (parent) {
            var parentOrigins;

            try {
                // Server configured cors-origins
                // Origins containing wildcards will be treated as generic wildcard origin
                if (!parentOrigins) {
                    let corsOrigins = WeavyStorage.config.allowedOrigins;
                    if (corsOrigins && !(corsOrigins.length === 1 && corsOrigins[0] === "*")) {
                        parentOrigins = corsOrigins;
                        console.log("Postal using allowed origin");
                    }
                }
            } catch (e) { /* no parentOrigins assigned */ }

            try {
                // Same-domain origin, only available when samedomain is successfully configured
                if (!parentOrigins) {
                    parentOrigins = [parent.location.origin];
                    if (parentOrigins) {
                        console.log("Postal using same-domain origin");
                    }
                }
            } catch (e) { /* no parentOrigins assigned */ }

            // Default if no origin is configured
            parentOrigins = parentOrigins || ["*"];

            // Filter and sort
            parentOrigins = Array.from(parentOrigins)
                .map(e => e.indexOf("*") !== -1 ? "*" : e) // Uniform wildcards
                .filter((e, i, a) => a.indexOf(e) === i) // Unique entries
                .sort((a, b) => a.indexOf("*") - b.indexOf("*")); // Sort explicit origins before any wildcards

            // Filter by ancestor to exclude mismatching origins
            if (parentOrigins.length > 1) {
                var parentAncestor;

                // Try ancestorOrigins
                if ('ancestorOrigins' in window.location) {
                    parentAncestor = window.location.ancestorOrigins[0];
                }

                // Try accessing same-site location
                if (!parentAncestor) {
                    try {
                        parentAncestor = parent.location.origin;
                    } catch (e) { /* parent location not same-site */ }
                }

                // Try using document referrer (FF)
                if (!parentAncestor && document.referrer) {
                    if (new URL(document.referrer).origin !== window.location.origin) {
                        parentAncestor = new URL(document.referrer).origin;
                    }
                }

                if (parentAncestor && parentOrigins.indexOf(parentAncestor) >= 0) {
                    parentOrigins = [parentAncestor];
                } else {
                    console.warn("Frame registration may cause " + (parentOrigins.length - 1) + " origin error messages in the console due to multiple cors-origins configured.");
                }
            }

            if (parentOrigins.length) {
                console.debug("Checking for parent");

                parentOrigins.forEach(function (parentOrigin) {
                    if (parentOrigin === "*") {
                        console.warn("Using wildcard origin for registration.")
                    }

                    try {
                        parent.postMessage({ name: "register-child", weavyId: true }, parentOrigin);
                    } catch (e) {
                        console.error("Error checking for parent", e);
                    }
                })
            } else {
                console.warning("Could not find any parent with valid origin.")
            }

            requestAnimationFrame(function () {
                window.setTimeout(setLeader, parentOrigins.length ? 2000 : 1);
            });

        } else {
            setLeader();
        }

    }

    this.on = on;
    this.one = one;
    this.off = off;
    this.postToParent = postToParent;
    this.postToSelf = postToSelf;
    this.postToSource = postToSource;
    this.whenLeader = function () { return _whenLeader(); };

    Object.defineProperty(this, "isLeader", {
        get: function () { return _isLeader; }
    });
    Object.defineProperty(this, "parentWeavyId", {
        get: function () { return _parentWeavyId; }
    });
    Object.defineProperty(this, "parentName", {
        get: function () { return _parentName; }
    });
    Object.defineProperty(this, "parentOrigin", {
        get: function () { return _parentOrigin; }
    });

    init();
}


export default new WeavyPostal();



