using Microsoft.AspNetCore.Mvc;
using Weavy.Core.Models;
using Weavy.Core.Services;
using Weavy.Dropin.Models;

namespace Weavy.Dropin.Controllers;

/// <summary>
/// Controller for file previews.
/// </summary>
public class PreviewController : AreaController {

    /// <summary>
    /// Display files for specified app.
    /// </summary>
    /// <param name="id">File id.</param>
    /// <returns></returns>
    [HttpGet("{id:int}")]
    public IActionResult Get(int id) {
        var file = FileService.Get(id);
        if (file == null) {
            return BadRequest();
        }

        (File prev, File next) = FileService.GetPreviousAndNextSiblings(file);

        var model = new PreviewModel {
            Current = file,
            Prev = prev,
            Next = next
        };

        return View(model);
    }
}
