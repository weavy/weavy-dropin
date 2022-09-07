import { Application } from "@hotwired/stimulus";

import AttachmentsController from "./controllers/attachments-controller";
import AuthenticateController from "./controllers/authenticate-controller";
import ModalController from "./controllers/modal-controller";
import PaginationController from "./controllers/pagination-controller";
import MeetingsController from "./controllers/meetings-controller";
import EditorController from "./controllers/editor-controller";

const application = Application.start();
application.register("attachments", AttachmentsController);
application.register("authenticate", AuthenticateController);
application.register("modal", ModalController);
application.register("pagination", PaginationController);
application.register("meetings", MeetingsController);
application.register("editor", EditorController);
