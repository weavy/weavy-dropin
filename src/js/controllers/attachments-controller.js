import { Controller } from "@hotwired/stimulus";
import WeavyConsole from '../utils/console';

const console = new WeavyConsole("attachments");

export default class extends Controller {

  static targets = ["input", "list", "dragzone", "dropzone"];
  static classes = ["uploading", "dragging"];

  connect() {
    console.debug("connected");

    let that = this;
    let hightlightTimer = null;

    if (this.hasDragzoneTarget && this.hasDropzoneTarget) {

      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        this.dragzoneTarget.addEventListener(eventName, preventDefaults, false)
      });

      ['dragenter', 'dragover'].forEach(eventName => {
        this.dragzoneTarget.addEventListener(eventName, highlight, false)
      });

      ['dragleave', 'drop'].forEach(eventName => {
        this.dragzoneTarget.addEventListener(eventName, unhighlight, false)
      });

      this.dropzoneTarget.addEventListener('drop', that.handleDrop.bind(this), false);
    }

    function preventDefaults(e) {
      e.preventDefault()
      e.stopPropagation()
    }

    function highlight(e) {

      if (that.containsFiles(e)) {
        that.dropzoneTarget.classList.add(that.draggingClass);
        clearTimeout(hightlightTimer);
      }

    }

    function unhighlight(e) {
      hightlightTimer = setTimeout(() => that.dropzoneTarget.classList.remove(that.draggingClass), 50)
    }
  }

  // check if drag and drop contains files
  containsFiles(evt) {

    if (evt.dataTransfer.types) {
      for (let i = 0; i < evt.dataTransfer.types.length; i++) {
        if (evt.dataTransfer.types[i] === "Files") {
          return true;
        }
      }
    }

    return false;

  }

  // Dropped file(s)
  handleDrop(evt) {
    console.debug('File(s) dropped');

    let dt = evt.dataTransfer;
    let files = dt.files;

    if (!files.length) { return; }

    this.upload(evt, files);

  }

  // trigger file selection
  select(e) {
    e.preventDefault();
    this.inputTarget.click();
  }

  // dispatched from editor
  pasteFile(e) {
    if (e && e.detail) {
      this.upload(null, e.detail);
    }
  }

  // upload selected files
  async upload(e, files) {

    

    files = typeof files !== "undefined" ? [...files] : this.inputTarget.files;
    const list = this.listTarget;
    let that = this;
    let count = 0;

    if (files.length > 0) {
      this.element.classList.add(this.uploadingClass);
    }

    for (var i = 0; i < files.length; i++) {
      let data = new FormData();
      data.append("blob", files[i]);

      fetch("/dropin/attachments", { method: "POST", body: data }).then(function (response) {
        count++;

        if (response.status !== 200) {
          console.error("Failed to upload file. Status code: " + response.status);
        } else {
          response.text().then(function (html) {
            const placeholder = document.createElement("div");
            placeholder.innerHTML = html;
            while (placeholder.firstElementChild) {
              list.append(placeholder.firstElementChild);
            }
          });
        }

        if (count === files.length) {
          that.element.classList.remove(that.uploadingClass);
          that.inputTarget.value = "";
        }
      }).catch(error => {
        console.error("Error:", error);
        that.element.classList.remove(that.uploadingClass);
        that.inputTarget.value = "";
      });
    }
  }

  // remove blob from list
  remove(event) {
    event.currentTarget.parentElement.remove();
  }

}
