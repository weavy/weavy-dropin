//import * as Turbo from "@hotwired/turbo";

import { Application } from "@hotwired/stimulus";

import TurboStreamController from "./controllers/turbo-stream-controller";
import PaginationController from "./controllers/pagination-controller";
import 'bootstrap/js/dist/dropdown';

const application = Application.start();
application.register("turbo-stream", TurboStreamController);
application.register("pagination", PaginationController);
