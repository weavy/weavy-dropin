import { Controller } from "@hotwired/stimulus";
import WeavyConsole from "../utils/console";

const console = new WeavyConsole("image-controller");

// Check already loaded images and display them instantly
// Othewise let them transition via CSS when loaded

export default class extends Controller {

  static targets = ["image"];

  initialize() {
    this.image = this.hasImageTarget ? this.imageTarget : this.element;
    this.name = this.image.id;
    console.log("init", this.element.id);
  }

  connect() {
    console.log("connect", this.name)
    this.checkImageLoad(this.image);
    this.image.addEventListener('load', this.imageLoaded, true); // needs capturing
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
      this.imageSize(img);
      
    } else {
      console.debug("image is loading")
      img.classList.add("wy-loading");
    }
  }

  imageSize(img) {
    console.log("image size", this.element.style.getPropertyValue("--width"), img.naturalWidth)
    if (!this.element.style.getPropertyValue("--width") && img.naturalWidth) {
      this.element.style.setProperty("--width", img.naturalWidth);
      this.element.style.setProperty("--height", img.naturalHeight);
    }
  }

  imageLoaded(event) {
    var img = event.target;
    if (img.tagName === 'IMG' && img.classList.contains("wy-loading") && !img.classList.contains("wy-loaded")) {
      console.debug("load event", this);
      img.classList.add("wy-loaded");
      this.imageSize(img);
    }
  }

  disconnect() {
    console.debug("disconnected", this.element.id);
    this.element.removeEventListener('load', this.imageLoaded, true); // needs capturing
  }
}
