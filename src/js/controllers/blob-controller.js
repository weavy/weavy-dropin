import { Controller } from "@hotwired/stimulus";
import WeavyConsole from '@weavy/dropin-js/src/common/console';

const console = new WeavyConsole("blob");

export default class extends Controller {

  static targets = ["hidden", "file", "thumb", "remove"];

  connect() {
    console.debug("connected");
  }

  select() {
    this.fileTarget.click();
  } 

  remove(e) {
    e.stopPropagation();
    this.hiddenTarget.value = "";
    this.fileTarget.value = "";
    this.thumbTarget.setAttribute("src", this.thumbTarget.dataset.thumb);       
    this.removeTarget.setAttribute("hidden", "");
  }

  upload() {
    const data = new FormData();
    const files = this.fileTarget.files;
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      data.append("blob", f);
    }

    fetch('/blobs', { method: "POST", body: data })
      .then(response => response.json())
      .then(json => {
        // get uploaded file
        var blob = json[0];

        // get file extension
        var a = blob.name.split(".");
        var ext = "";
        if (a.length === 1 || (a[0] === "" && a.length === 2)) {
          // filename without extension
          ext = "";
        } else {
          ext = "." + a.pop();
        }

        // crop and resize thumbnail to 256x256 pixels
        this.hiddenTarget.value = blob.id;
        this.thumbTarget.src = `/b${blob.id}/thumb-256-crop,both${ext}`;
        this.removeTarget.removeAttribute("hidden");
      });
  }
}
