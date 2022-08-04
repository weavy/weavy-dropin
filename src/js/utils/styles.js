import WeavyPostal from './postal';
import WeavyConsole from './console';

const console = new WeavyConsole("CSS");

/**
 * Sets a DOM id on the HTML element if not already set
 * @param {string} id - Valid string DOM id
 */
export function setId(id) {
  if (id && !document.documentElement.id) {
    document.documentElement.id = id;
  }
}

/**
 * Adds classNames to the HTML element
 * @param {string} classNames - Any number of className strings
 */
export function setClassNames(classNames) {
  if (classNames && typeof classNames === "string") {
    // Splits className by space to an array and filters out empty entries
    let classNamesList = classNames.split(" ").filter((x) => x);
    if (classNamesList && classNamesList.length) {
      document.documentElement.classList.add(...classNamesList);
    }
  }
}

/**
 * Adds or replaces CSS as a stylesheet in HEAD element.
 * @param {string} css - The CSS to apply
 */
export function setCss(css) {
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

/**
 * Postmessage styles received from parent
 *
 * @listens WeavyPostal#event:styles
 * @param {WeavyPostal#event:styles} e
 * @param {WeavyPostal#event:styles~data} styles
 */
WeavyPostal.on("styles", (e, styles) => {
  console.log("received internal css styles from parent", styles.id);
  setId(styles.id);
  setClassNames(styles.className);
  setCss(styles.css);
})
