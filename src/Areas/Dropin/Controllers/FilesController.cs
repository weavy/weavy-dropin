using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;
using Serilog;
using Weavy.Core.Http;
using Weavy.Core.Models;
using Weavy.Core.Mvc;
using Weavy.Core.Services;
using Weavy.Core.Utils;
using Weavy.Dropin.Models;

namespace Weavy.Dropin.Controllers;

/// <summary>
/// Controller for the <see cref="Files"/> app.
/// </summary>
public class FilesController : AreaController {

    private static readonly ILogger _log = Log.ForContext(typeof(HttpRequestExtensions));

    /// <summary>
    /// Display files for specified app.
    /// </summary>
    /// <param name="id">App id.</param>
    /// <param name="query"></param>
    /// <returns></returns>
    [HttpGet("{id:int}")]
    public IActionResult Get(int id, FileQuery query) {
        var app = AppService.Get<Files>(id);
        if (app == null) {
            return BadRequest();
        }

        query.AppId = app.Id;
        query.Parent = app;
        query.OrderBy ??= nameof(Files.Name);
        query.Top = Math.Clamp(query.Top ?? PageSizeMedium, 1, PageSizeMedium);

        // get/set preferred layout
        if (query.Layout == null) {
            query.Layout = GetLayout(id);
        } else {
            SetLayout(id, query.Layout.Value);
        }

        app.Items = FileService.Search(query);

        if (Request.IsAjaxRequest()) {
            // infinite scroll, return partial view                
            return PartialView("_" + GetLayout(id), app.Items);
        }

        return View(app);
    }

    /// <summary>
    /// Upload file(s) to the app using multipart/form-data.
    /// </summary>
    /// <param name="id">App id</param>    
    /// <param name="force"></param>
    /// <returns></returns>
    [HttpPost("{id:int}/upload")]
    [DisableFormValueModelBinding]
    public async Task<IActionResult> Upload(int id, string uuid, bool force) {
        var app = AppService.Get<Files>(id);

        var blobs = await Request.SaveBlobsAsync();

        return HandleFiles(app, blobs.ToList(), uuid, force);
    }

    /// <summary>
    /// Replaces an existing blob.
    /// </summary>
    /// <param name="id">App id</param>    
    /// <param name="bid">Blob id</param>
    /// <returns></returns>
    [HttpPut("{id:int}/replace/{bid:int}")]
    [DisableFormValueModelBinding]
    public IActionResult Replace(int id, int bid, string uuid) {
        var app = AppService.Get<Files>(id);
        var layout = GetLayout(app.Id);

        var files = new List<File>();
        var blob = BlobService.Get(bid);
        var existing = FileService.Get(app, blob.Name, sudo: true, trashed: true);
        existing.Blob = blob;
        existing = FileService.Update(existing, backup: true);
        files.Add(existing);

        var result = new TurboStreamsResult();
        result.Streams.Add(TurboStream.Replace($"~/Areas/Dropin/Views/File/_{layout}File.cshtml", existing));
        result.Streams.Add(TurboStream.Replace($"file-upload-progress-{uuid}", "_UploadProgress", files));
        return result;
    }

    /// <summary>
    /// Add file(s) external cloud provider file(s) to the app.
    /// </summary>
    /// <param name="id">App id</param>
    /// <returns></returns>
    [HttpPost("{id:int}/external")]
    [DisableFormValueModelBinding]
    public IActionResult AddExternal(int id, bool force, string uuid, [FromBody] IEnumerable<ExternalBlob> external) {
        var app = AppService.Get<Files>(id);

        var blobs = new List<Blob>();
        foreach (var eb in external) {
            try {
                var blob = BlobService.Insert(eb);
                blobs.Add(blob);
            } catch (Exception ex) {
                _log.Warning("Failed to insert external blob {name}: {msg}", eb.Name, ex.Message);
            }
        }
        return HandleFiles(app, blobs, uuid, force);
    }

    /// <summary>
    /// Creates and returns a zip file with all the local files attached to this <see cref="App"/>.
    /// </summary>
    /// <param name="id">The id of the <see cref="App"/> to get files for.</param>
    /// <returns></returns>
    [HttpGet("{id:int}/archive")]
    public IActionResult GetArchive(int id) {
        var app = AppService.Get(id);

        if (app == null || !app.CanDownloadChildrenAsArchive()) {
            return BadRequest();
        }

        var archive = FileService.GetArchive(app);

        if (archive == null) {
            return NotFound();
        }

        var file = new System.IO.FileInfo(archive);

        if (file == null || !file.Exists) {
            return NotFound();
        }

        var contentType = FileUtils.GetMediaType(file.Name);
        var modified = new DateTimeOffset(file.LastWriteTimeUtc);
        var entityTag = new EntityTagHeaderValue("\"" + (file.ETag()) + "\"");
        Response.Headers.Append(HeaderNames.CacheControl, "private, no-cache");
        return PhysicalFile(file.FullName, contentType, FileUtils.SafeName(app.DisplayName + file.Extension), modified, entityTag, true);
    }

    [HttpPost("error")]
    public ActionResult Error([FromBody] FileUploadErrorModel model) {
        var result = new TurboStreamsResult();
        result.Streams.Add(TurboStream.Replace($"file-upload-progress-{model.Uuid}", "_UploadError", model));
        return result;
    }

    /// <summary>
    /// Add or replace files
    /// </summary>
    /// <param name="app">The app to add the files to</param>
    /// <param name="blobs">The blobs to add</param>
    /// <param name="index">The index of the blob to add</param>
    /// <param name="force"><c>true</c> to force replace of existing file, otherwise <c>false</c></param>
    /// <returns></returns>
    private IActionResult HandleFiles(Files app, List<Blob> blobs, string uuid, bool force) {

        if (app == null) {
            return BadRequest();
        }

        if (!app.HasPermission(Permission.Create)) {
            return Forbid();
        }

        var files = new List<File>();

        if (blobs.Any()) {

            var result = new TurboStreamsResult();

            foreach (var blob in blobs) {
                // check if app already has a file with the same name
                var existing = FileService.Get(app, blob.Name, sudo: true, trashed: true);

                var layout = GetLayout(app.Id);

                if (existing != null && !force) {
                    ViewData["uuid"] = uuid;
                    result.Streams.Add(TurboStream.Replace($"file-upload-progress-{uuid}", "_FileExistError", blob));
                    result.StatusCode = 409;                    
                } else if (existing != null && force) {
                    existing.Blob = blob;
                    files.Add(FileService.Update(existing, backup: true));
                    existing = FileService.Get(app, blob.Name, sudo: true, trashed: true);
                    result.Streams.Add(TurboStream.Replace($"~/Areas/Dropin/Views/File/_{layout}File.cshtml", existing));
                    result.Streams.Add(TurboStream.Replace($"file-upload-progress-{uuid}", "_UploadProgress", files));
                } else {
                    files.Add(FileService.Insert(blob, app));
                    ViewData["Layout"] = layout;
                    result.Streams.Add(TurboStream.Prepend("file-list", "_Uploaded", files));
                    result.Streams.Add(TurboStream.Replace($"file-upload-progress-{uuid}", "_UploadProgress", files));
                }
            }
            return result;

        } else {
            // most likely file type was not allowed...
            return StatusCode(StatusCodes.Status415UnsupportedMediaType);
        }
    }
}
