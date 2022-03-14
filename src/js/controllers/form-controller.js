import { Controller } from "@hotwired/stimulus"

export default class extends Controller {

  // REVIEW: use targets instead?
  form = null;
  submit = null;

  static values = { key: String }

  connect() {
    // REVIEW: use targets instead?
    this.form = this.element;
    this.submit = document.querySelector("[form="+this.form.id+"]");
  }

  // enable associated submit button when form contains specified key
  enable() {
    var data = new FormData(this.form);
    if (data.has(this.keyValue)) {
      this.submit.disabled = false;
    } else {
      this.submit.disabled = true;
    }
  }
}
