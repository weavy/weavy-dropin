import { Controller } from "@hotwired/stimulus"

export default class extends Controller {

  click(event) {
    // stop click from bubbling up
    event.preventDefault();
    event.stopPropagation();
  }

  toggle(event) {
    // find checkbox
    var checkboxes = event.currentTarget.querySelectorAll("[type='checkbox']:enabled");
    if (checkboxes.length > 0) {
      // toggle checkbox and trigger change event
      checkboxes[0].checked = !checkboxes[0].checked;
      checkboxes[0].dispatchEvent(new Event('change'));
    }
  }

}
