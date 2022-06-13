var browser, engine, platform;
var mobile = false, tablet = false, webView = false;

let userAgent = window.navigator.userAgent;

// browser
if (userAgent.includes("Edge/")) {
  browser = "Edge";
} else if (userAgent.includes("Chrome/") && !userAgent.includes("Chromium/")) {
  browser = "Chrome";
} else if (userAgent.includes("Chromium/")) {
  browser = "Chromium";
} else if (userAgent.includes("Firefox/") && !userAgent.includes("Seamonkey/")) {
  browser = "Firefox";
} else if (userAgent.includes("; MSIE ") || userAgent.includes("Trident/")) {
  browser = "IE";
} else if (userAgent.includes("OPR/") || userAgent.includes("Opera/")) {
  browser = "Opera";
} else if (userAgent.includes("Seamonkey/")) {
  browser = "Seamonkey";
} else if (userAgent.includes("Safari/") && !userAgent.includes("Chrome/") && !userAgent.includes("Chromium/")) {
  browser = "Safari";
}

// engine
if (userAgent.includes("Edge/")) {
  engine = "EdgeHTML";
} else if (userAgent.includes("AppleWebKit/")) {
  engine = "WebKit";
} else if (userAgent.includes("Opera/")) {
  engine = "Presto";
} else if (userAgent.includes("Gecko/")) {
  engine = "Gecko";
} else if (userAgent.includes("Trident/")) {
  engine = "Trident";
} else if (userAgent.includes("Chrome/")) {
  engine = "Blink";
}

// mobile or tablet
if (userAgent.includes("Mobi")) {
  mobile = true;
}
if (userAgent.includes("iPad") || (userAgent.includes("Android") && !userAgent.includes("Mobi"))) {
  tablet = true;
  mobile = true; // Tablet should also be treated as mobile normally
}

// platform
if (userAgent.includes("Windows")) {
  platform = "Windows";
} else if (userAgent.includes("Macintosh")) {
  platform = "Mac";
} else if (userAgent.includes("iPad") || userAgent.includes("iPhone") || userAgent.includes("iPod")) {
  platform = "iOS";
} else if (userAgent.includes("Android")) {
  platform = "Android";
}

if (platform === "Android" && userAgent.includes("; wv") || platform === "iOS" && !userAgent.includes("Safari")) {
  webView = true;
}

export default {
  browser,
  engine,
  platform,
  mobile,
  tablet,
  webView,
  get desktop() {
    return !mobile && !tablet;
  },
}


