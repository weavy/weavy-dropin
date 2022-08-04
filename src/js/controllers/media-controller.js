import { Controller } from "@hotwired/stimulus";
import WeavyConsole from "../utils/console";
import WeavyPostal from "../utils/postal";

const console = new WeavyConsole("media-controller");

/**
 * Display error fallback for video and audio
 * @param {any} media
 */
function mediaFallback(media) {
  if (media.classList.contains("wy-loading")) {
    media.classList.add("wy-loaded");
  }
  media.classList.add("wy-error");
  media.outerHTML = media.outerHTML.replace(/<(video|audio)/, "<div").replace(/(video|audio)>/, "div>");
}

export default class extends Controller {

  initialize() {
    this.element.classList.add("wy-loading");
    this.pause = () => this.element.pause();
  }

  connect() {
    console.debug("connected");

    WeavyPostal.on("close", this.pause);

    this.element.addEventListener('error', this.mediaError, true); // needs capturing
    this.element.addEventListener('loadedmetadata', this.mediaLoaded, true); // needs capturing
    this.element.addEventListener('loadedmetadata', this.codecError, true); // needs capturing
  }

  mediaLoaded(event) {
    var src = event.target;
    if (src.tagName === 'VIDEO' || src.tagName === 'AUDIO') {
      if (src.classList.contains("wy-loading")) {
        console.log("loaded")
        src.classList.add("wy-loaded");
      }
    }
  }

  mediaError(event) {
    var src = event.target;
    var media;
    if (src.tagName === 'SOURCE') {
      media = src.parentNode;
      media.dataset.errors = (media.dataset.errors || 0) + 1;

      if (media.querySelectorAll("source").length >= media.dataset.errors) {
        console.warn(media.tagName.toLowerCase() + " source error, switching to fallback");
        mediaFallback(media);
      }
    }
  }

  codecError(event) {
    var src = event.target;
    if (src.tagName === 'VIDEO' || src.tagName === 'AUDIO') {
      // Capture codec-error for video in firefox
      if (src.tagName === 'VIDEO' && !src.videoWidth || src.tagName === 'AUDIO' && !src.duration) {
        console.warn(src.tagName.toLowerCase() + " track not available, switching to fallback");
        mediaFallback(src);
      }
    }
  }

  disconnect() {
    console.debug("disconnected");

    WeavyPostal.off("close", this.pause);

    this.pause();
    this.element.removeAttribute("autoplay");
    this.element.setAttribute("preload", "none");

    this.element.removeEventListener('error', this.mediaError, true); // needs capturing
    this.element.removeEventListener('loadedmetadata', this.mediaLoaded, true); // needs capturing
    this.element.removeEventListener('loadedmetadata', this.codeError, true); // needs capturing
  }
}
