import { Controller } from "@hotwired/stimulus";
import WeavyConsole from '../utils/console';

const console = new WeavyConsole("attachments");

export default class extends Controller {

  static targets = ["input", "list"];
  static classes = ["uploading"];

  connect() {
    console.debug("connected");
  }

  // trigger file selection
  select(e) {
    e.preventDefault();
    this.inputTarget.click();
  }

  // dispatched from editor
  pasteImage(e) {
    if (e && e.detail) {
      this.upload(null, e.detail);
    }
  }

  // upload selected files
  async upload(e, file) {
    this.element.classList.add(this.uploadingClass);

    const files = typeof file !== "undefined" ? [file] : this.inputTarget.files;
    const list = this.listTarget;
    let that = this;
    let count = 0;

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
