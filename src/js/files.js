//import * as Turbo from "@hotwired/turbo";

import { Application } from "@hotwired/stimulus";
import AuthenticateController from "./controllers/authenticate-controller";
import FilesController from "./controllers/files-controller";
import PreviewLinkController from "./controllers/preview-link-controller";
import PaginationController from "./controllers/pagination-controller";
import ProgressController from "./controllers/progress-controller";
import RenameController from "./controllers/rename-controller";
import SheetController from "./controllers/sheet-controller";
import 'bootstrap/js/dist/dropdown';

const application = Application.start();
application.register("authenticate", AuthenticateController);
application.register("files", FilesController);
application.register("preview-link", PreviewLinkController);
application.register("pagination", PaginationController);
application.register("progress", ProgressController);
application.register("rename", RenameController);
application.register("sheet", SheetController);

