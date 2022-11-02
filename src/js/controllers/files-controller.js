import { Controller } from "@hotwired/stimulus";
import WeavyConsole from '../utils/console';
import { S4 } from '../utils/utils';
import postal from "../utils/postal-child";
import { renderStreamMessage } from "@hotwired/turbo";
const console = new WeavyConsole("files");

export default class extends Controller {

  static values = {
    externalUrl: { type: String, default: "/dropin/externalblobs" },
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
    console.debug("connected");

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
    this.handleFiles(this.inputTarget.files);
    this.inputTarget.value = '';
  }

  // Dropped file(s)
  handleDrop(evt) {
    console.debug('File(s) dropped');

    let dt = evt.dataTransfer;
    let files = dt.files;

    if (!files.length) { return; }

    this.handleFiles(files);

  }

  // Pasted file(s)
  handlePaste(evt) {

    console.debug('File(s) pasted');

    let files = [];
    const items = (evt.clipboardData || evt.originalEvent.clipboardData).items;
    for (let index in items) {
      const item = items[index];
      if (item.kind === 'file') {
        files = [...files, item.getAsFile()];
      }
    }

    if (!files.length) { return; }

    this.handleFiles(files);

  }


  // Prepare for upload
  async handleFiles(files, force = false) {

    files = [...files];
    this.initProgress(files);

    try {
      await Promise.all(files.map(async (f, i) => {
        try {
          let response = await this.upload(f, force);
          renderStreamMessage(response.target.responseText);
          this.uploadProgress.find((up) => up.uuid === f.uuid).completed = true;
        } catch (error) {
          this.uploadProgress.find((up) => up.uuid === f.uuid).completed = true;
          this.uploadProgress.find((up) => up.uuid === error.uuid).error = true;

          switch (error.statuscode) {
            case 409:
              renderStreamMessage(error.message);
              break;

            default: {
              const message = JSON.parse(error.message);
              let response = await fetch(`/dropin/files/error`, {
                method: "POST",
                body: JSON.stringify({ uuid: error.uuid, name: f.name, message: message.detail || message.title }),
                headers: {
                  "Content-Type": "application/json",
                  "Accept": "text/vnd.turbo-stream.html"
                }
              });
              let html = await response.text();
              renderStreamMessage(html);
            }
          }
        } finally {
          this.setUploadStatus();
        }
      })
      );

    } catch (error) {
      console.error("Some files could not be uploaded:", error)
    }
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
      let uuid = S4();
      files[i].uuid = uuid;

      this.uploadProgress.push({ uuid: uuid, value: 0, completed: false, error: false });

      let div = document.createElement('div');
      div.innerHTML = `<div id="file-upload-progress-${uuid}" class="wy-upload-progress-item">
  <span class="wy-upload-progress-item-content">${files[i].name}</span>
  <div class="wy-upload-progress">
      <progress value="0" max="100" data-files-target="progressItem" data-uuid="${uuid}"></progress>
    </div>
</div>`.trim();
      this.progressContainerTarget.append(div.firstElementChild)
    }

    //this.updateUploadCounter();

    this.uploadButtonTarget.hidden = false;
    // cannot toggle svg.hidden property so we add/remove attribute instead
    //this.iconCompleteTarget.hidden = true;
    //this.iconErrorTarget.hidden = true;
    //this.iconUploadingTarget.hidden = false;
    this.iconCompleteTarget.setAttribute("hidden", "");
    this.iconErrorTarget.setAttribute("hidden", "");
    this.iconUploadingTarget.removeAttribute("hidden");
    
  }

  //updateUploadCounter() {
    //let uploadsInProgress = this.uploadProgress.filter((u) => u.value < 100 && !u.error);
    //this.progressCountTarget.innerHTML = `(${uploadsInProgress.length})`
  //}

  // update progress bar
  updateProgress(uuid, progress) {
    this.uploadProgress.find((up) => up.uuid === uuid).value = progress
    //let total = this.uploadProgress.reduce((tot, curr) => tot + curr, 0) / this.uploadProgress.length;    
    this.progressItemTargets.find((pi) => pi.dataset.uuid === uuid).value = progress;
  }

  upload(file, force = false) {
    let that = this;

    return new Promise(function (resolve, reject) {

      let xhr = new XMLHttpRequest();
      let url = `/dropin/files/${that.appValue}/upload?force=${force}&uuid=${file.uuid}`;
      let data = new FormData();
      data.append("blob", file);
      xhr.open('POST', url, true);
      xhr.setRequestHeader("Accept", "text/vnd.turbo-stream.html");
      xhr.upload.addEventListener("progress", function (e) {
        that.updateProgress(file.uuid, (e.loaded * 100.0 / e.total) || 100)
      })

      xhr.onload = (evt) => {
        if (evt.target.status === 200) { resolve(evt); }
        else { reject({ uuid: file.uuid, message: evt.target.responseText, blob: file, statuscode: evt.target.status }); }
      };
      xhr.onerror = reject;
      xhr.send(data);
    });
  }

  async replaceFile(id, uuid) {
    let response = await fetch(`/dropin/files/${this.appValue}/replace/${id}?uuid=${uuid}`, {
      method: "PUT",
      headers: {
        "Accept": "text/vnd.turbo-stream.html"
      }
    });
    let html = await response.text();
    renderStreamMessage(html);
  }

  replace(evt) {
    this.replaceFile(evt.params.id, evt.params.uuid);

    // remove item
    this.removeProgressItem(evt)
  }

  skip(evt) {
    // remove item
    this.removeProgressItem(evt)
  }

  removeProgressItem(evt) {
    let item = evt.target.parentElement.parentElement;
    item.remove();

    let errors = this.uploadErrorTargets.length;

    if (this.progressContainerTarget.children.length === 0) {
      const sheetController = this.application.getControllerForElementAndIdentifier(this.uploadSheetTarget, 'sheet')
      sheetController.close();
      this.clearUploadProgress();
    } else if (errors === 0) {
      this.uploadButtonTarget.hidden = false;

      // cannot toggle svg.hidden property so we add/remove attribute instead
      //this.iconUploadingTarget.hidden = true;
      //this.iconErrorTarget.hidden = true;
      //this.iconCompleteTarget.hidden = false;
      this.iconUploadingTarget.setAttribute("hidden", "");
      this.iconErrorTarget.setAttribute("hidden", "");
      this.iconCompleteTarget.removeAttribute("hidden");
    }
  }

  clearUploadProgress() {

    let completed = this.uploadSuccessTargets;
    let errorsOrCompleted = false;

    if (completed.length > 0) {
      //this.iconCompleteTarget.hidden = true;
      this.iconCompleteTarget.setAttribute("hidden", "");
      errorsOrCompleted = true;
      for (var i = 0; i < completed.length; i++) {
        completed[i].remove();
      }
    }
    
    let errors = this.uploadErrorTargets;
    if (errors.length === 0) {
      //this.iconErrorTarget.hidden = true;
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
    //this.updateUploadCounter();

    // set upload finished          
    let completed = this.uploadProgress.filter((up) => up.completed);
    let errors = this.uploadProgress.filter((up) => up.error);

    // update upload status
    if (completed.length === this.uploadProgress.length) {
      // check if uploadProgress contains errors

      if (errors.length > 0) {        
        //this.iconErrorTarget.hidden = false;
        this.iconErrorTarget.removeAttribute("hidden");
        const sheetController = this.application.getControllerForElementAndIdentifier(this.uploadSheetTarget, 'sheet');
        sheetController.open();        
        
      } else {
        //this.iconCompleteTarget.hidden = false;
        this.iconCompleteTarget.removeAttribute("hidden");
      }
      //this.iconUploadingTarget.hidden = true;
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
    console.debug("Files received from client: ", e.data, "Picker active = ", this.isActive);

    if (!this.isActiveExteralPicker) return;

    this.attachExternalFiles(e.data.blobs, e.data.open);

    // close file browser
    postal.postToParent({ name: "request:file-browser-close" });

    // reset active state    
    this.isActiveExteralPicker = false;

  }

  async attachExternalFiles(blobs, open = false, force = false) {

    let files = [...blobs];
    this.initProgress(files);
    
    await Promise.all(files.map(async (f, i) => {
      try {
        let data = JSON.stringify([f]);
        let response = await fetch(`${this.externalUrlValue}?force=${force}&uuid=${f.uuid}`, {
          method: "POST", body: data, headers: {
            'Content-Type': 'application/json'
          }
        });

        this.updateProgress(f.uuid, 100);
        
        if (response.status === 200) {
          var html = await response.text();    
          renderStreamMessage(html);
          this.uploadProgress.find((up) => up.uuid === f.uuid).completed = true;
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
              const message = "Error uploading the file";
              let response = await fetch(`/dropin/files/error`, {
                method: "POST",
                body: JSON.stringify({ uuid: f.uuid, name: f.name, message: message}),
                headers: {
                  "Content-Type": "application/json",
                  "Accept": "text/vnd.turbo-stream.html"
                }
              });
              let html = await response.text();
              renderStreamMessage(html);
            }
          }
        }
        
      } catch (error) {
        console.error("Error uploding file...")
      } finally {
        this.setUploadStatus();
      }
    }));
  }

  isJsonString(str) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  }
}
