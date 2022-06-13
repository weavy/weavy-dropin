import { Controller } from "@hotwired/stimulus"
import Modal from 'bootstrap/js/dist/modal';
import WeavyConsole from '../utils/console';

const console = new WeavyConsole("modal");

export default class extends Controller {

  connect() {
    console.debug("connected");

    var modal = new Modal(this.element);
    modal.show();

    this.element.addEventListener('hidden.bs.modal', function (event) {
      // remove modal on close
      event.target.remove();

      // clear src on #modal turbo-frame on close (so that we can load it again)
      document.getElementById("modal").src = null;
    });    
  }
}

