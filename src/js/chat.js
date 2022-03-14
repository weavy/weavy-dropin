//import * as Turbo from "@hotwired/turbo";

import { Application } from "@hotwired/stimulus";

//import ChatController from "./controllers/chat-controller";
import TurboStreamController from "./controllers/turbo-stream-controller";
import AttachmentsController from "./controllers/attachments-controller";
import ModalController from "./controllers/modal-controller";
import PaginationController from "./controllers/pagination-controller";
import ScrollController from "./controllers/scroll-controller";
import MeetingsController from "./controllers/meetings-controller";
import EditorController from "./controllers/editor-controller";
import FilePickerController from "./controllers/file-picker-controller";
import 'bootstrap/js/dist/dropdown';

const application = Application.start();
application.register("turbo-stream", TurboStreamController);
//application.register("chat", ChatController);
application.register("attachments", AttachmentsController);
application.register("modal", ModalController);
application.register("pagination", PaginationController);
application.register("scroll", ScrollController);
application.register("meetings", MeetingsController);
application.register("editor", EditorController);
application.register("file-picker", FilePickerController);
