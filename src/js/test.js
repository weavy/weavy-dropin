import { Application } from "@hotwired/stimulus";
import ProgressController from "./controllers/progress-controller";
import 'bootstrap/js/dist/dropdown';
const application = Application.start();
application.register("progress", ProgressController);
