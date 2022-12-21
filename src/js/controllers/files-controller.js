import { Controller } from "@hotwired/stimulus";
import WeavyConsole from '../utils/console';
import { S4 } from '../utils/utils';
import postal from "../utils/postal-child";
import { renderStreamMessage } from "@hotwired/turbo";
const console = new WeavyConsole("files");

export default class extends Controller {

  static values = {
    externalUrl: { type: String, default: "/dropin/external" },
    selector: { type: String, default: "" },
    app: { type: Number, default: 0 }
  };


  static targets = [
    "input", "content", "modal",
    "dragzone", "dropzone",
    "progressContainer", "progressItem", "uploadSheet", "uploadButton",
    "iconUploading", "iconComplete", "iconError",
    "uploadError", "uploadSuccess"];
  static classes = ["uploading"];
  uploadProgress = [];
  isActiveExteralPicker = false;

  handler = this.receiveExternalFiles.bind(this);
  closeHandler = this.closeExternalPicker.bind(this);

  connect() {
    // listen to messages from weavy client
    postal.on("add-external-blobs", this.handler);
    postal.on("file-browser-closed", this.closeHandler);

    document.addEventListener("paste", this.handlePaste.bind(this));
  }

  dropzoneTargetConnected(target) {

    let that = this;
    let hightlightTimer = null;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      this.dragzoneTarget.addEventListener(eventName, preventDefaults, false)
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      this.dragzoneTarget.addEventListener(eventName, highlight, false)
    });

    ['dragleave', 'drop'].forEach(eventName => {
      this.dragzoneTarget.addEventListener(eventName, unhighlight, false)
    });

    this.dropzoneTarget.addEventListener('drop', this.handleDrop.bind(this), false);

    function preventDefaults(e) {
      e.preventDefault()
      e.stopPropagation()
    }

    function highlight(e) {

      if (that.containsFiles(e)) {
        that.dropzoneTarget.classList.add('wy-files-dragging');
        clearTimeout(hightlightTimer);
      }

    }

    function unhighlight(e) {
      hightlightTimer = setTimeout(() => that.dropzoneTarget.classList.remove('wy-files-dragging'), 50)
    }
  }

  disconnect() {
    document.removeEventListener("paste", this.handlePaste.bind(this));
    this.dropzoneTarget.removeEventListener();
    postal.off("add-external-blobs", this.handler);
    postal.off("file-browser-closed", this.closeHandler);
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

  // Selected file(s) from file dialog
  handleSelect() {
    console.debug("File(s) selected");
    this.handleFiles(this.inputTarget.files);
    this.inputTarget.value = '';
  }

  // Dropped file(s)
  handleDrop(evt) {
    console.debug("File(s) dropped");
    let dt = evt.dataTransfer;
    let files = dt.files;
    if (files.length) {
      this.handleFiles(files);
    }
  }

  // Pasted file(s)
  handlePaste(evt) {
    console.debug("File(s) pasted");
    let files = [];
    const items = (evt.clipboardData || evt.originalEvent.clipboardData).items;
    for (let index in items) {
      const item = items[index];
      if (item.kind === 'file') {
        files = [...files, item.getAsFile()];
      }
    }
    if (files.length) {
      this.handleFiles(files);
    }
  }

  
  handleFiles(files) {

    files = [...files];
    this.initProgress(files);

    files.map((f, i) => {
      this.upload(f).then(async (response) => {
        renderStreamMessage(response.target.responseText);
        this.uploadProgress.find((up) => up.uuid === f.uuid).completed = true;
      }).catch((error) => {
        this.uploadProgress.find((up) => up.uuid === f.uuid).completed = true;
        this.uploadProgress.find((up) => up.uuid === f.uuid).error = true;
        switch (error.statuscode) {
          case 409:
            renderStreamMessage(error.message);
            break;
          default: {
            const message = JSON.parse(error.message);
            console.warn(`Error uploading ${f.name}: ${message.detail || message.title}`);
            fetch(`/dropin/files/error`, {
              method: "POST",
              body: JSON.stringify({ uuid: f.uuid, name: f.name, message: message.detail || message.title }),
              headers: {
                "Content-Type": "application/json",
                "Accept": "text/vnd.turbo-stream.html"
              }
            }).then((r) => r.text())
              .then((html) => {
                renderStreamMessage(html);
              });
          }
        }
      }).finally(() => {
        this.setUploadStatus();
      });
    });

  }

  // trigger file selection
  select(e) {
    e.preventDefault();
    this.inputTarget.click();
  }

  // init progress bar
  initProgress(files) {

    // check if any upload in progress
    let uploading = this.uploadProgress.filter((up) => up.value !== 100);
    if (uploading.length === 0) {
      this.clearUploadProgress();
    }

    for (let i = 0; i < files.length; i++) {
      // generate uuid for progress tracking
      let uuid = S4();
      files[i].uuid = uuid;
      this.uploadProgress.push({ uuid: uuid, value: 0, completed: false, error: false });

      // insert progress item for the file being uploaded
      let div = document.createElement('div');
      div.innerHTML = `<div id="upload-${uuid}" class="wy-item" data-files-target="progressItem">
  <svg class="wy-icon wy-icon-primary" data-icon="progress" data-controller="progress" data-progress-percent-value="0" viewBox="0 0 24 24" width="24" height="24" transform="rotate(-90)" ><circle cx="12" cy="12" r="10" stroke-linecap="butt" stroke-width="2" fill="none" stroke="#eee"></circle><circle cx="12" cy="12" r="10" stroke-dasharray="100" stroke-dashoffset="70" stroke-linecap="butt" stroke-width="2" fill="none" stroke="currentColor" pathLength="100"></circle></svg>
  <div class="wy-item-body">${files[i].name}</div>
</div>`.trim();
      this.progressContainerTarget.append(div.firstElementChild)
    }

    this.uploadButtonTarget.hidden = false;
    // cannot toggle svg.hidden property so we add/remove attribute instead
    this.iconCompleteTarget.setAttribute("hidden", "");
    this.iconErrorTarget.setAttribute("hidden", "");
    this.iconUploadingTarget.removeAttribute("hidden");
  }

  // update progress bar
  updateProgress(uuid, value) {
    // update progress array
    this.uploadProgress.find((up) => up.uuid === uuid).value = value;
    // update progress icon
    this.progressItemTargets.find((pi) => pi.id === "upload-" + uuid).querySelector("[data-icon]").dataset.progressPercentValue = value;
  }

  upload(file) {
    let that = this;

    return new Promise(function (resolve, reject) {

      // XMLHttpRequest instead of fetch because we want to track progress
      let xhr = new XMLHttpRequest();
      let url = `/dropin/files/${that.appValue}`;
      let data = new FormData();
      data.append("uuid", file.uuid); // posting the uuid will add it to the blob metadata which allows us to keep track of the blob and report upload progress/status
      data.append("blob", file);
      xhr.open('POST', url, true);
      xhr.setRequestHeader("Accept", "text/vnd.turbo-stream.html");
      xhr.upload.addEventListener("progress", function (e) {
        that.updateProgress(file.uuid, (e.loaded / e.total) * 100 || 100)
      })

      xhr.onload = (evt) => {
        if (evt.target.status === 200) { resolve(evt); }
        else { reject({ uuid: file.uuid, message: evt.target.responseText, blob: file, statuscode: evt.target.status }); }
      };
      xhr.onerror = reject;
      xhr.send(data);
    });
  }

  async replaceFile(blobId) {
    let response = await fetch(`/dropin/files/${this.appValue}/replace/${blobId}`, {
      method: "PUT",
      headers: {
        "Accept": "text/vnd.turbo-stream.html"
      }
    });
    let html = await response.text();
    renderStreamMessage(html);
  }

  replace(evt) {
    this.replaceFile(evt.params.blob);
    this.removeProgressItem(evt)
  }

  dismiss(evt) {
    this.removeProgressItem(evt)
  }


  removeProgressItem(evt) {
    let item = evt.target.closest(".wy-item");
    item.remove();

    let errors = this.uploadErrorTargets.length;

    if (this.progressContainerTarget.children.length === 0) {
      const sheetController = this.application.getControllerForElementAndIdentifier(this.uploadSheetTarget, 'sheet')
      sheetController.close();
      this.clearUploadProgress();
    } else if (errors === 0) {
      this.uploadButtonTarget.hidden = false;

      // cannot toggle svg.hidden property so we add/remove attribute instead
      this.iconUploadingTarget.setAttribute("hidden", "");
      this.iconErrorTarget.setAttribute("hidden", "");
      this.iconCompleteTarget.removeAttribute("hidden");
    }
  }

  clearUploadProgress() {

    let completed = this.uploadSuccessTargets;
    let errorsOrCompleted = false;

    if (completed.length > 0) {
      this.iconCompleteTarget.setAttribute("hidden", "");
      errorsOrCompleted = true;
      for (var i = 0; i < completed.length; i++) {
        completed[i].remove();
      }
    }

    let errors = this.uploadErrorTargets;
    if (errors.length === 0) {
      this.iconErrorTarget.setAttribute("hidden", "");
    } else {
      errorsOrCompleted = true;
    }

    if (!errorsOrCompleted) {
      this.uploadButtonTarget.hidden = true;
    }

    this.uploadProgress = [];
  }

  setUploadStatus() {
    // update counter

    // set upload finished          
    let completed = this.uploadProgress.filter((up) => up.completed);
    let errors = this.uploadProgress.filter((up) => up.error);

    // update upload status
    if (completed.length === this.uploadProgress.length) {
      if (errors.length > 0) {
        this.iconErrorTarget.removeAttribute("hidden");
        const sheetController = this.application.getControllerForElementAndIdentifier(this.uploadSheetTarget, 'sheet');
        sheetController.open();
      } else {
        this.iconCompleteTarget.removeAttribute("hidden");
      }
      this.iconUploadingTarget.setAttribute("hidden", "");
    }
  }

  toggleSheet() {
    const sheetController = this.application.getControllerForElementAndIdentifier(this.uploadSheetTarget, 'sheet');
    sheetController.toggle();
  }

  openExternalPicker(e) {
    e.preventDefault();

    // set current instance to active
    this.isActiveExteralPicker = true;

    // open file-browser
    postal.postToParent({ name: "request:file-browser-open" });
  }

  closeExternalPicker(e) {
    // reset active state    
    this.isActiveExteralPicker = false;
  }

  receiveExternalFiles(e) {
    console.debug("File(s) received");

    if (!this.isActiveExteralPicker) return;

    this.attachExternalFiles(e.data.blobs);

    // close file browser
    postal.postToParent({ name: "request:file-browser-close" });

    // reset active state    
    this.isActiveExteralPicker = false;

  }

  attachExternalFiles(blobs) {

    let files = [...blobs];
    this.initProgress(files);

    files.map((f, i) => {
      // pass in uuid as metadata 
      f.metadata = { uuid: f.uuid };

      fetch(this.externalUrlValue, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(f)
      })
        .then(async (response) => {

          this.updateProgress(f.uuid, 100);
          if (response.status === 200) {
            this.uploadProgress.find((up) => up.uuid === f.uuid).completed = true;
            const html = await response.text();
            renderStreamMessage(html);
          } else {
            this.uploadProgress.find((up) => up.uuid === f.uuid).completed = true;
            this.uploadProgress.find((up) => up.uuid === f.uuid).error = true;
            switch (response.status) {
              case 409: {
                const html = await response.text();
                renderStreamMessage(html);
                break;
              }
              default: {
                const message = await response.json();
                console.warn(`Error uploading ${f.name}: ${message.detail || message.title}`);
                fetch(`/dropin/files/error`, {
                  method: "POST",
                  body: JSON.stringify({ uuid: f.uuid, name: f.name, message: message.detail || message.title }),
                  headers: {
                    "Content-Type": "application/json",
                    "Accept": "text/vnd.turbo-stream.html"
                  }
                }).then((r) => r.text())
                  .then((html) => {
                    renderStreamMessage(html);
                  });
              }
            }
          }
        }).finally(() => {
          this.setUploadStatus();
        });
    });
  }

}
