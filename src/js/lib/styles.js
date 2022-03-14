import WeavyPostal from '@weavy/dropin-js/src/common/postal';

/**
 * Postmessage styles received from parent
 *
 * @listens WeavyPostal#event:styles
 * @param {WeavyPostal#event:styles} e
 * @param {WeavyPostal#event:styles~data} styles
 */
WeavyPostal.on("styles", (e, styles) => {
  console.log("CSS: received internal css styles from parent", styles.id);
  applyId(styles.id);
  // Splits className by space to an array and filters out empty entries
  applyClassNames(...styles.className.split(" ").filter((x) => x));
  applyCss(styles.css);
})

/**
 * Sets a DOM id on the HTML element if not already set
 * @param {string} id - Valid string DOM id
 */
function applyId(id) {
  if (id && !document.documentElement.id) {
    document.documentElement.id = id;
  }
}

/**
 * Adds classNames to the HTML element
 * @param {...string} classNames - Any number of className strings
 */
function applyClassNames(...classNames) {
  if (classNames.length) {
    document.documentElement.classList.add(...classNames);
  }
}

/**
 * Adds or replaces CSS as a stylesheet in HEAD element.
 * @param {string} css - The CSS to apply
 */
function applyCss(css) {
  if (String(css).trim()) {
    var styleId = "weavy-styles";
    var cssStyles = document.getElementById(styleId);
    if (!cssStyles) {
      cssStyles = document.createElement("style");
      cssStyles.id = styleId;
    }

    if (cssStyles.firstChild) {
      cssStyles.replaceChild(document.createTextNode(css), cssStyles.firstChild);
    } else {
      cssStyles.appendChild(document.createTextNode(css));
    }

    if (!cssStyles.isConnected) {
      document.getElementsByTagName("head")[0].appendChild(cssStyles);
    }

  }
}
