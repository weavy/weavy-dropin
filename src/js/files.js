//import * as Turbo from "@hotwired/turbo";

import { Application } from "@hotwired/stimulus";
import FilesController from "./controllers/files-controller";
import PreviewController from "./controllers/preview-controller";
import PaginationController from "./controllers/pagination-controller";
import FilePickerController from "./controllers/file-picker-controller";
import RenameController from "./controllers/rename-controller";
import 'bootstrap/js/dist/dropdown';

const application = Application.start();
application.register("files", FilesController);
application.register("preview", PreviewController);
application.register("pagination", PaginationController);
application.register("file-picker", FilePickerController);
application.register("rename", RenameController);

