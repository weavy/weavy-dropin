using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;
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
    /// Upload file to the app using multipart/form-data.
    /// </summary>
    /// <param name="id">App id</param>
    /// <returns></returns>
    [HttpPost("{id:int}")]
    [DisableFormValueModelBinding]
    public async Task<IActionResult> Upload(int id) {
        var app = AppService.Get<Files>(id);
        if (!app.HasPermission(Permission.Create)) {
            return Forbid();
        }

        // upload and try to insert blob
        var blob = await Request.SaveBlobAsync();
        return TryInsert(app, blob);
    }

    /// <summary>
    /// Replaces the content of an existing file with the specified blob.
    /// </summary>
    /// <param name="id">App id</param>    
    /// <param name="bid">Blob id</param>
    /// <returns></returns>
    [HttpPut("{id:int}/replace/{bid:int}")]
    public IActionResult Replace(int id, int bid) {
        var app = AppService.Get<Files>(id);
        var blob = BlobService.Get(bid);
        var file = FileService.Get(app, blob.Name, sudo: true, trashed: true);
        file.Blob = blob;
        file = FileService.Update(file, backup: true);

        blob.Metadata.TryGetValue("uuid", out var uuid);
        var layout = GetLayout(app.Id);
        var result = new TurboStreamsResult();
        result.Streams.Add(TurboStream.Remove($"upload-{uuid}"));
        result.Streams.Add(TurboStream.Replace($"~/Areas/Dropin/Views/File/_{layout}File.cshtml", file));        
        return result;
    }

    /// <summary>
    /// Add cloud file to the app.
    /// </summary>
    /// <param name="id">App id</param>
    /// <returns></returns>
    [HttpPost("{id:int}/external")]
    public IActionResult AddExternal(int id, [FromBody] ExternalBlob external) {
        var app = AppService.Get<Files>(id);
        if (!app.HasPermission(Permission.Create)) {
            return Forbid();
        }
        var blob = BlobService.Insert(external);
        return TryInsert(app, blob);
    }

    [HttpPost("error")]
    public ActionResult Error([FromBody] FileUploadErrorModel model) {
        return TurboStream.Replace($"upload-{model.Uuid}", "_Error", model);
    }

    /// <summary>
    /// Try to create and add a new file from the specified blob.
    /// </summary>
    /// <param name="app">The app</param>
    /// <param name="blob">The blob</param>
    /// <param name="uuid"></param>
    /// <returns></returns>
    private IActionResult TryInsert(Files app, Blob blob) {

        // get uuid from blob metadata so we can update the correct ui element
        blob.Metadata.TryGetValue("uuid", out var uuid);
        var layout = GetLayout(app.Id);

        // check if app already has a file with the same name
        var existing = FileService.Get(app, blob.Name, trashed: true);
        if (existing == null) {
            // insert new file
            var inserted = FileService.Insert(blob, app);
            var result = new TurboStreamsResult();
            result.Streams.Add(TurboStream.Replace($"upload-{uuid}", "_Uploaded", inserted));
            result.Streams.Add(TurboStream.Prepend("file-list", $"~/Areas/Dropin/Views/File/_{layout}File.cshtml", inserted));
            return result;
        } else if (existing.IsTrashed()) {
            // update and restore trashed file
            existing.Blob = blob;
            existing.TrashedAt = null;
            existing.TrashedById = null;
            var updated = FileService.Update(existing, backup: true);
            var result = new TurboStreamsResult();
            result.Streams.Add(TurboStream.Replace($"upload-{uuid}", "_Uploaded", updated));
            result.Streams.Add(TurboStream.Remove($"~/Areas/Dropin/Views/File/_{layout}File.cshtml", updated));
            result.Streams.Add(TurboStream.Prepend("file-list", $"~/Areas/Dropin/Views/File/_{layout}File.cshtml", updated));
            return result;
        } else { 
            // display file exists error
            var result = TurboStream.Replace($"upload-{uuid}", "_Conflict", blob);
            result.StatusCode = StatusCodes.Status409Conflict;
            return result;
        }
        
    }
}
