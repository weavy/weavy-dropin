import { Application } from "@hotwired/stimulus";
import AttachmentsController from "./controllers/attachments-controller";
import ChatController from "./controllers/chat-controller";
import EditorController from "./controllers/editor-controller";
import FilePickerController from "./controllers/file-picker-controller";
import FormController from "./controllers/form-controller";
import MeetingsController from "./controllers/meetings-controller";
import MessageToastController from "./controllers/message-toast-controller";
import ModalController from "./controllers/modal-controller";
import PaginationController from "./controllers/pagination-controller";
import PresenceController from "./controllers/presence-controller";
import ReadByController from "./controllers/readby-controller";
import ScrollController from "./controllers/scroll-controller";
import ToggleController from "./controllers/toggle-controller";
import TypingController from "./controllers/typing-controller";
import 'bootstrap/js/dist/dropdown';

const application = Application.start();
application.register("attachments", AttachmentsController);
application.register("chat", ChatController);
application.register("editor", EditorController);
application.register("file-picker", FilePickerController);
application.register("form", FormController);
application.register("meetings", MeetingsController);
application.register("message-toast", MessageToastController);
application.register("modal", ModalController);
application.register("pagination", PaginationController);
application.register("presence", PresenceController);
application.register("readby", ReadByController);
application.register("scroll", ScrollController);
application.register("toggle", ToggleController);
application.register("typing", TypingController);
