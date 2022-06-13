//import * as Turbo from "@hotwired/turbo";

import { Application } from "@hotwired/stimulus";

import PaginationController from "./controllers/pagination-controller";
import 'bootstrap/js/dist/dropdown';

const application = Application.start();
application.register("pagination", PaginationController);
