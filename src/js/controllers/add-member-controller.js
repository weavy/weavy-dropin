import { Controller } from "@hotwired/stimulus";
import WeavyConsole from '../utils/console';

const console = new WeavyConsole("add-member");

export default class extends Controller {
  
  static targets = ["form", "button", "input"];

  connect() {
    console.debug("connected");

    this.inputTarget.addEventListener("keyup", () => {
      this.buttonTarget.click();
    });
  }

  insert() {
    this.formTarget.setAttribute("data-turbo-frame", "_top");   
  }
}
