import { Controller } from "@hotwired/stimulus"
import * as pdfjsLib from 'pdfjs-dist';
import * as pdfjsViewer from 'pdfjs-dist/web/pdf_viewer';


export default class extends Controller {

  eventBus = new pdfjsViewer.EventBus();
  pdfViewer;
  pdfDocument;    
  DEFAULT_SCALE_DELTA = 1.1;
  MAX_SCALE = 3.0;
  MIN_SCALE = 0.2;

  static values = {
    url: String    
  };

  static targets = ["zoomLevel", "pageNumber", "totalPages"]

  initialize() {
    console.debug("pdf:connected");

    const pdfPath = this.urlValue;
    const SEARCH_FOR = "";
    const ENABLE_XFA = true;
    
    const container = this.element.querySelector(".pdf-viewerContainer");
    const self = this;

    // (Optionally) enable hyperlinks within PDF files.
    const pdfLinkService = new pdfjsViewer.PDFLinkService({
      eventBus: this.eventBus,
    });

    // (Optionally) enable find controller.
    const pdfFindController = new pdfjsViewer.PDFFindController({
      eventBus: this.eventBus,
      linkService: pdfLinkService,
    });

    // Some PDFs need external cmaps.
    const CMAP_URL = "/cmaps/";
    const CMAP_PACKED = true;

    // Setting worker path to worker bundle.
    pdfjsLib.GlobalWorkerOptions.workerSrc =  "/js/preview.worker.js";

    this.pdfViewer = new pdfjsViewer.PDFViewer({
      container,
      eventBus: this.eventBus,
      linkService: pdfLinkService,
      findController: pdfFindController,
      defaultZoomValue: 1.0,
      //scriptingManager: pdfScriptingManager,
      enableScripting: true, // Only necessary in PDF.js version 2.10.377 and below.
    });
    this.pdfViewer.MAX_AUTO_SCALE = 1.0;
    pdfLinkService.setViewer(this.pdfViewer);

    this.eventBus.on("scalechanging", function (e) {
      console.debug("pdf:scalechanging")
      self.zoomLevelTarget.value = (Math.round(self.pdfViewer.currentScale * 100)).toFixed(0) + "%";
    });

    this.eventBus.on("pagechanging", function (e) {
      console.debug("pdf:pagechanging")      
      self.pageNumberTarget.value = self.pdfViewer.currentPageNumber;
    });

    this.eventBus.on("pagesinit", function (e) {
      
      // We can use pdfViewer now, e.g. let's change default scale.
      self.pdfViewer.currentScaleValue = "auto";
      self.pageNumberTarget.value = 1;
      self.totalPagesTarget.innerText = self.pdfViewer.pagesCount;

      // We can try searching for things.
      if (SEARCH_FOR) {
        if (!pdfFindController._onFind) {
          pdfFindController.executeCommand("find", { query: SEARCH_FOR });
        } else {
          this.eventBus.dispatch("find", { type: "", query: SEARCH_FOR });
        }
      }
    });


    const loadingTask = pdfjsLib.getDocument({
      url: pdfPath,
      enableXfa: ENABLE_XFA,
      cMapUrl: CMAP_URL,
      cMapPacked: CMAP_PACKED,
    });

    loadingTask.promise
      .then(function (doc) {
        self.pdfDocument = doc;
        self.pdfViewer.setDocument(doc);
        pdfLinkService.setDocument(doc, null);
      });
  }

  zoomIn() {
    console.debug("pdf:zoomIn");

    let newScale = this.pdfViewer.currentScale;
    let steps = 1;
    do {
      newScale = (newScale * this.DEFAULT_SCALE_DELTA).toFixed(2);
      newScale = Math.ceil(newScale * 10) / 10;
      newScale = Math.min(this.MAX_SCALE, newScale);
    } while (--steps > 0 && newScale < this.MAX_SCALE);

    this.setScale(newScale);
  }

  zoomOut() {
    console.debug("pdf:zoomOut");

    let newScale = this.pdfViewer.currentScale;
    let steps = 1;
    do {
      newScale = (newScale / this.DEFAULT_SCALE_DELTA).toFixed(2);
      newScale = Math.floor(newScale * 10) / 10;
      newScale = Math.max(this.MIN_SCALE, newScale);
    } while (--steps > 0 && newScale > this.MIN_SCALE);

    this.setScale(newScale);
  }

  updateZoom() {
    console.debug("pdf:updateZoom");
    let zoomValue = this.zoomLevelTarget.value.replace("%", "");
    if (isNaN(zoomValue)) {
      this.setScale((this.pdfViewer.currentScale+0.0001));
    } else {
      this.setScale(zoomValue/100);
    }
  }

  updatePage() {
    console.debug("pdf:updatePage");
    let pageNumber = this.pageNumberTarget.value;
    
    if (isNaN(pageNumber)) {
      this.setPage((this.pdfViewer.currentPageNumber));
    } else if (parseInt(pageNumber) > this.pdfViewer.pagesCount) {
      this.setPage(this.pdfViewer.pagesCount);
    } else if (parseInt(pageNumber) <=0 ) {
      this.setPage(1);    
    } else {
      this.setPage(parseInt(pageNumber));
    }
  }

  select(e) {
    console.debug("pdf:select");
    e.target.setSelectionRange(0, e.target.value.length);        
  }

  fitToPage() {
    this.setScale("page-fit");
  }

  fitToWidth() {
    this.setScale("page-width");
  }

  setScale(scale) {
    console.debug("pdf:setScale:", scale)
    this.pdfViewer.currentScaleValue = scale;
  }

  setPage(pageNumber) {
    console.debug("pdf:setPage:", pageNumber)
    this.pdfViewer.currentPageNumber = pageNumber;
  }

  disconnect() {
    console.debug("pdf:disconnected");
    //if (!this.pdfDocument) {
    //  return; // run cleanup when document is loaded 
    //}
    //this.pdfViewer.cleanup();
    ////this.pdfThumbnailViewer.cleanup();
        
    //this.pdfDocument.cleanup();
    
  }
}
