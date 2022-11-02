import { Application } from "@hotwired/stimulus";

import AttachmentsController from "./controllers/attachments-controller";
import AuthenticateController from "./controllers/authenticate-controller";
import CommentController from "./controllers/comment-controller";
import EditorController from "./controllers/editor-controller";
import EmbedController from "./controllers/embed-controller";
import FilePickerController from "./controllers/file-picker-controller";
import MeetingsController from "./controllers/meetings-controller";
import ModalController from "./controllers/modal-controller";
import PaginationController from "./controllers/pagination-controller";
import PollsController from "./controllers/polls-controller";
import PostController from "./controllers/post-controller";
import PresenceController from "./controllers/presence-controller";
import SheetController from "./controllers/sheet-controller";
import 'bootstrap/js/dist/dropdown';

const application = Application.start();
application.register("attachments", AttachmentsController);
application.register("authenticate", AuthenticateController);
application.register("comment", CommentController);
application.register("editor", EditorController);
application.register("embed", EmbedController);
application.register("file-picker", FilePickerController);
application.register("meetings", MeetingsController);
application.register("modal", ModalController);
application.register("pagination", PaginationController);
application.register("polls", PollsController);
application.register("post", PostController);
application.register("presence", PresenceController);
application.register("sheet", SheetController);


