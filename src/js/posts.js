import { Application } from "@hotwired/stimulus";

import TurboStreamController from "./controllers/turbo-stream-controller";
import AttachmentsController from "./controllers/attachments-controller";
import ModalController from "./controllers/modal-controller";
import PaginationController from "./controllers/pagination-controller";
import MeetingsController from "./controllers/meetings-controller";
import EditorController from "./controllers/editor-controller";

const application = Application.start();
application.register("turbo-stream", TurboStreamController);
application.register("attachments", AttachmentsController);
application.register("modal", ModalController);
application.register("pagination", PaginationController);
application.register("meetings", MeetingsController);
application.register("editor", EditorController);
