import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  
  static targets = ["form", "button", "input"];

  connect() {
    console.debug("add-member:connected");

    this.inputTarget.addEventListener("keyup", () => {
      this.buttonTarget.click();
    });
  }

  insert() {
    this.formTarget.setAttribute("data-turbo-frame", "_top");   
  }
}
