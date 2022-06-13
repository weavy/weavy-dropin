//import * as Turbo from "@hotwired/turbo";

import { Application } from "@hotwired/stimulus";

import AttachmentsController from "./controllers/attachments-controller";
import ModalController from "./controllers/modal-controller";
import PaginationController from "./controllers/pagination-controller";
import MeetingsController from "./controllers/meetings-controller";
import EditorController from "./controllers/editor-controller";
import 'bootstrap/js/dist/dropdown';

const application = Application.start();
application.register("attachments", AttachmentsController);
application.register("modal", ModalController);
application.register("pagination", PaginationController);
application.register("meetings", MeetingsController);
application.register("editor", EditorController);

