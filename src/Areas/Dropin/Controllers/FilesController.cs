using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Weavy.Core.Http;
using Weavy.Core.Models;
using Weavy.Core.Mvc;
using Weavy.Core.Services;

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
        app.Items = FileService.Search(query);

        if (Request.IsAjaxRequest()) {
            // infinite scroll, return partial view                
            return PartialView("_Files", app.Items);
        }

        return View(app);
    }

    /// <summary>
    /// Upload new file(s) into the specified app.
    /// </summary>
    /// <param name="id">App id.</param>
    /// <returns></returns>
    [HttpPost("{id:int}")]
    [DisableFormValueModelBinding]
    public async Task<IActionResult> Upload(int id) {
        var app = AppService.Get<Files>(id);
        if (app == null) {
            return BadRequest();
        }

        // upload and insert files
        var blobs = await Request.SaveBlobsAsync();
        if (blobs.Any()) {
            foreach (var blob in blobs) {
                // TODO: check if file(s) exist and pop-up modal asking if we should skip or replace the existing files
                FileService.Insert(blob, app);
            }
        }

        return SeeOtherAction(nameof(Get), new { id });
    }
}
