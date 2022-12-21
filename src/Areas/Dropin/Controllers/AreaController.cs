using System;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Weavy.Core.Controllers;
using Weavy.Core.Models;
using Weavy.Core.Mvc;

namespace Weavy.Dropin.Controllers;

/// <summary>
/// Abstract base class for controllers in the area.
/// </summary>
[Area(Constants.AREA_NAME)]
[Route("[area]/[controller]")]
[TurboDrive]
public abstract class AreaController : WeavyController {

    /// <summary>
    /// Gets the preferred layout to use when rendering files.
    /// </summary>
    /// <param name="appId"></param>
    protected Layout GetLayout(int appId) {
        if (Request.Cookies.TryGetValue($"{nameof(Layout)}-{appId}", out var s) && Enum.TryParse<Layout>(s, out var e)) {
            return e;
        }
        return Layout.List;
    }

    /// <summary>
    /// Sets the preferred layout to use when rendering files.
    /// </summary>
    /// <param name="appId"></param>
    /// <param name="layout"></param>
    protected void SetLayout(int appId, Layout layout) {
        Response.Cookies.Append($"{nameof(Layout)}-{appId}", layout.ToString("D"), new CookieOptions {
            Path = "/dropin",
            Expires = DateTime.UtcNow.AddYears(1),
            Secure = true,
            SameSite = SameSiteMode.None
        });
    }

}
