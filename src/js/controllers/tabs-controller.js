import { Controller } from "@hotwired/stimulus";
import WeavyConsole from '../utils/console';

const console = new WeavyConsole("tabs");

export default class extends Controller {

  static classes = ["current"];
  static targets = ["tab", "toggle"];

  connect() {
    console.debug("connected");

    this.tabTargets.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        this.active(e);
      })
    });

    this.toggleTargets.forEach((toggle) => {
      toggle.addEventListener("click", (e) => {
        this.toggle(e);
      })
    });
  }

  active(e) {
    let activeTab = e.currentTarget;
    this.tabTargets.forEach((tab) => {
      if (tab === activeTab) {
        tab.classList.add(...this.currentClasses);
        Array.from(this.element.querySelectorAll(tab.dataset.tabsSelector)).forEach((target) => {
          target.hidden = false;
        });
      } else {
        tab.classList.remove(...this.currentClasses);
        Array.from(this.element.querySelectorAll(tab.dataset.tabsSelector)).forEach((target) => {
          target.hidden = true;
        });
      }
    })
  }

  toggle(e) {
    let toggleTab = e.currentTarget;
    this.toggleTargets.forEach((tab) => {
      if (tab === toggleTab) {
        tab.classList.toggle(...this.currentClasses);
        Array.from(this.element.querySelectorAll(tab.dataset.tabsSelector)).forEach((target) => {
          target.hidden = !target.hidden;
        });
      } else {
        tab.classList.remove(...this.currentClasses);
        Array.from(this.element.querySelectorAll(tab.dataset.tabsSelector)).forEach((target) => {
          target.hidden = true;
        });
      }
    })
  }

  close(e) {
    this.toggleTargets.forEach((tab) => {
      tab.classList.remove(...this.currentClasses);
      Array.from(this.element.querySelectorAll(tab.dataset.tabsSelector)).forEach((target) => {
        target.hidden = true;
      });
    })
  }

  disconnect() {
    console.debug("disconnected");
  }
}
