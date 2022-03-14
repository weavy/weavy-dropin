import { Application } from "@hotwired/stimulus";
import PdfController from "../js/controllers/pdf-controller";
import MediaController from "../js/controllers/media-controller";
import EmbedController from "../js/controllers/embed-controller";
import ImageController from "../js/controllers/image-controller";
import HighlightController from "../js/controllers/highlight-controller";
import TurboStreamController from "../js/controllers/turbo-stream-controller";

const application = Application.start();
application.register("turbo-stream", TurboStreamController);
application.register("pdf", PdfController);
application.register("media", MediaController);
application.register("embed", EmbedController);
application.register("image", ImageController);
application.register("highlight", HighlightController);
