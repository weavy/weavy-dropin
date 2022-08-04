using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Serilog;
using Weavy.Core.Http;
using Weavy.Core.Models;
using Weavy.Core.Mvc;
using Weavy.Core.Services;
using Weavy.Core.Utils;

namespace Weavy.Dropin.Controllers;

/// <summary>
/// Controller for the <see cref="Files"/> app.
/// </summary>
public class FilesController : AreaController {

    private static readonly ILogger _log = Log.ForContext(typeof(HttpRequestExtensions));

    /// <summary>
    /// Gets or sets the preferred layout to use when rendering files.
    /// </summary>
    private Layout? Layout {
        get {
            // try to get preferred value from cookie            
            if (Request.Cookies.TryGetValue(nameof(Layout), out var s) && Enum.TryParse<Layout>(s, out var e)) {
                return e;
            }
            return null;
        }
        set {
            if (value == null) {
                // clear cookie
                Response.Cookies.Delete(nameof(Layout));
            } else {
                // store preferred layout in cookie
                Response.Cookies.Append(nameof(Layout), value.Value.ToString("D"), new CookieOptions {
                    Path = Request.Path.ToString(),
                    Expires = DateTime.UtcNow.AddYears(1)
                });
            }
        }
    }

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
            query.Layout = Layout;
        } else {
            Layout = query.Layout;
        }

        app.Items = FileService.Search(query);

        // TODO: use preferred (partial) view, i.e. list/grid when rendering the result
        if (Request.IsAjaxRequest()) {
            // infinite scroll, return partial view                
            return PartialView("_Files", app.Items);
        }

        return View(app);
    }

    /// <summary>
    /// Upload file(s) to the app using multipart/form-data.
    /// </summary>
    /// <param name="id">App id</param>
    /// <returns></returns>
    [HttpPost("{id:int}/upload")]
    [DisableFormValueModelBinding]
    public async Task<IActionResult> Upload(int id, bool force) {
        var app = AppService.Get<Files>(id);

        var blobs = await Request.SaveBlobsAsync();

        return HandleFiles(app, blobs.ToList(), force);
    }

    /// <summary>
    /// Add file(s) external cloud provider file(s) to the app.
    /// </summary>
    /// <param name="id">App id</param>
    /// <returns></returns>
    [HttpPost("{id:int}/external")]
    [DisableFormValueModelBinding]
    public IActionResult AddExternal(int id, bool force, [FromBody] IEnumerable<ExternalBlob> external) {
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

        return HandleFiles(app, blobs, force);
    }


    /// <summary>
    /// Display file rename form.
    /// </summary>
    /// <param name="id">Id of <see cref="File"/> to rename.</param>
    /// <returns></returns>
    [HttpGet("f{id:int}/rename")]
    public IActionResult Edit(int id) {
        var file = FileService.Get(id);
        if (file == null) {
            return BadRequest();
        }

        return PartialView("_Rename", file);
    }

    /// <summary>
    /// Rename file.
    /// </summary>
    /// <param name="id">Id of <see cref="File"/> to rename.</param>
    /// <param name="name">New file name.</param>
    /// <returns></returns>
    [HttpPost("f{id:int}/rename")]
    public IActionResult Update(int id, [FromForm] string name) {
        var file = FileService.Get(id);
        if (file == null) {
            return BadRequest();
        }

        var oldname = file.Name;

        try {
            // try updating name
            file.Name = name;
            file = FileService.Update(file);
        } catch (ValidationException vex) {
            ModelState.AddModelError(nameof(file.Name), vex.Message);
        }

        if (Request.IsTurboStream()) {
            if (ModelState.IsValid) {
                return TurboStream.Replace("_File", file);
            } else {
                // save "old" name in view data
                ViewData["Name"] = oldname;
                return TurboStream.Replace("_Rename", file);
            }
        }

        return SeeOtherAction(nameof(Get), new { id = EntityUtils.ResolveAppId(file) });
    }


    /// <summary>
    /// Trash a <see cref="File"/>.
    /// </summary>
    /// <param name="id">Id of <see cref="File"/> to trash.</param>
    /// <returns></returns>
    [HttpPost("f{id:int}/trash")]
    public IActionResult Trash(int id) {
        var file = FileService.Get(id);
        if (file == null) {
            return BadRequest();
        }

        file = FileService.Trash(id);

        if (Request.IsTurboStream()) {
            return TurboStream.Replace("_File", file);
        }

        return SeeOtherAction(nameof(Get), new { id = EntityUtils.ResolveAppId(file) });
    }

    /// <summary>
    /// Restore a trashed <see cref="File"/>.
    /// </summary>
    /// <param name="id">Id of <see cref="File"/> to restore.</param>
    /// <returns></returns>
    [HttpPost("f{id:int}/restore")]
    public IActionResult Restore(int id) {
        var file = FileService.Get(id, trashed: true);
        if (file == null) {
            return BadRequest();
        }

        file = FileService.Restore(id);

        if (Request.IsTurboStream()) {
            return TurboStream.Replace("_File", file);
        }

        return SeeOtherAction(nameof(Get), new { id = EntityUtils.ResolveAppId(file) });
    }

    /// <summary>
    /// Permanently delete an <see cref="File"/>.
    /// </summary>
    /// <param name="id">Id of <see cref="File"/> to delete.</param>
    /// <returns></returns>
    [HttpDelete("f{id:int}")]
    public IActionResult Delete(int id) {
        var file = FileService.Get(id, trashed: true);
        if (file == null) {
            return BadRequest();
        }

        file = FileService.Delete(id);

        if (Request.IsTurboStream()) {
            return TurboStream.Remove("_File", file);
        }

        return SeeOtherAction(nameof(Get), new { id = EntityUtils.ResolveAppId(file) });
    }


    /// <summary>
    /// Add or replace files
    /// </summary>
    /// <param name="app">The app to add the files to</param>
    /// <param name="blobs">The blobs to add</param>
    /// <param name="force"><c>true</c> to force replace of existing file, otherwise <c>false</c></param>
    /// <returns></returns>
    private IActionResult HandleFiles(Files app, List<Blob> blobs, bool force) {

        if (app == null) {
            return StatusCode(StatusCodes.Status400BadRequest);
        }

        if (!app.HasPermission(Permission.Create)) {
            return StatusCode(StatusCodes.Status403Forbidden);
        }

        var files = new List<File>();

        if (blobs.Any()) {
            foreach (var blob in blobs) {
                // check if app already has a file with the same name
                var existing = FileService.Get(app, blob.Name, sudo: true, trashed: true);

                if (existing != null && !force) {
                    return StatusCode(StatusCodes.Status409Conflict, blob.Name);
                }

                if (existing != null && force) {
                    existing.Blob = blob;
                    files.Add(FileService.Update(existing, backup: true));
                } else {
                    files.Add(FileService.Insert(blob, app));
                }
            }
            return PartialView("_Uploaded", files);
        } else {
            // most likely file type was not allowed...
            return StatusCode(StatusCodes.Status415UnsupportedMediaType);
        }
    }

}
