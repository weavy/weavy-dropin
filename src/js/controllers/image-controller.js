import { Controller } from "@hotwired/stimulus";
import WeavyConsole from "../utils/console";

const console = new WeavyConsole("image-controller");

// Check already loaded images and display them instantly
// Othewise let them transition via CSS when loaded

export default class extends Controller {

  initialize() {
    this.name = this.element.id;
    console.log("init", this.element.id);
  }

  connect() {
    console.log("connect", this.element.id)
    this.checkImageLoad(this.element);
    this.element.addEventListener('load', this.imageLoaded, true); // needs capturing
  }

  checkImageLoad(img) {
    var isLoaded = img.complete && img.naturalHeight !== 0;
    if (isLoaded) {
      if (!img.classList.contains("wy-loading")) {
        console.debug("image is instantly loaded")
        img.classList.add("wy-loading", "wy-loaded");
      } else {
        img.decode().then(() => {
          console.debug("image is loaded after delay")
          img.classList.add("wy-loaded");
        })
      }

      
    } else {
      console.debug("image is loading")
      img.classList.add("wy-loading");
    }
  }

  imageLoaded(event) {
    var img = event.target;
    if (img.tagName === 'IMG' && img.classList.contains("wy-loading") && !img.classList.contains("wy-loaded")) {
      console.debug("load event"); img.classList.add("wy-loaded")
      }
  }

  disconnect() {
    console.debug("disconnected", this.element.id);
    this.element.removeEventListener('load', this.imageLoaded, true); // needs capturing
  }
}
