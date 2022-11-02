import { Controller } from "@hotwired/stimulus"
import { subscribe, unsubscribe } from "../utils/connection-helpers.js"

export default class extends Controller {

  static values = { app: Number };
  static targets = ["element", "indicator"]
  static classes = ["isTyping"]

  typingHandler = this.typing.bind(this);
  stopTypingHandler = this.stopTyping.bind(this)

  activeTypers = [];
  typingTimeout = null;

  typing(data) {
    if (data.conversation.id === this.appValue && data.actor.id.toString() !== document.querySelector("body").dataset.userId) {
      let typers = this.activeTypers;
      // remove existing typing events by this user (can only type in one conversation at a time)
      typers.forEach(function (item, index) {
        if (item.member.id === data.actor.id) {
          typers.splice(index, 1);
        }
      });
     
      let typingEvent = { member: data.actor };

      // track time when we received this event
      typingEvent.time = Date.now();
      typers.push(typingEvent);

      this.updateTyping();
    }
  }

  stopTyping(data) {

    if (data.message.app_id === this.appValue) {
      let typers = this.activeTypers;

      // remove typing indicator for message sender
      typers.forEach(function (item, index) {
        if (item.member.id === data.message.created_by_id) {
          typers.splice(index, 1);
        }
      });

      this.updateTyping();
    }
  }

  updateTyping() {

    let typers = this.activeTypers;
    
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }

    // discard typing events older than 5 seconds
    var now = Date.now();
    typers.forEach(function (item, index) {
      if (now - item.time > 5 * 1000) {
        typers.splice(index, 1);
      }
    });

    // remove old typing indicators
    this.elementTarget.classList.remove(this.isTypingClass);
    
    if (typers.length) {
      // use age of typing event to animate ellipsis...
      var dots = (Math.round((now - Math.max.apply(null, typers.map(function (x) { return x.time; }))) / 1000) % 3) + 1;
      var ellipsis = (".").repeat(dots) + "<span style=\"visibility: hidden;\">" + (".").repeat(3 - dots) + "</span>";

      // merge names of people typing
      var names = typers.map((item) => item.member.display_name).sort();

      var text = "";
      for (var i = 0; i < names.length; i++) {
        if (i > 0) {
          if (i === (names.length - 1)) {
            text += " " + "and" + " ";
          } else {
            text += ", ";
          }
        }
        text += names[i];
      }
      if (names.length === 1) {
        text += " " + "is typing";
      } else {
        text += " " + "are typing";
      }

       // update gui
      this.indicatorTarget.innerHTML = text + ellipsis;
      this.elementTarget.classList.add(this.isTypingClass);

      // schedule another call to updateTyping in 1 second
      this.typingTimeout = setTimeout(this.updateTyping.bind(this), 1000);
    }
  }

  connect() {
    subscribe("a" + this.appValue, "typing", this.typingHandler);
    subscribe("a" + this.appValue, "message_created", this.stopTypingHandler);
  }

  disconnect() {
    unsubscribe("a" + this.appValue, "typing", this.typingHandler);
    unsubscribe("a" + this.appValue, "message_created", this.stopTypingHandler);
  }
}
