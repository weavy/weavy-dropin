using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Weavy.Core;
using Weavy.Core.Models;
using Weavy.Core.Services;
using Weavy.Core.Utils;

namespace Weavy.Dropin.Controllers;

/// <summary>
/// Controller for handling meetings (Zoom, Teams etc). 
/// </summary>    
public class MeetingsController : AreaController {
    
    /// <summary>
    /// Redirect route from Zoom Oauth2 authentication.
    /// </summary>
    /// <returns></returns>
    [HttpGet]
    [AllowAnonymous]
    [Route("~/meetings/zoom/auth")]
    public ActionResult ZoomAuthorization(string code, string state) {

        // state = userId...
        if (int.TryParse(state, out int id)) {
            var user = UserService.Get(id, sudo:true);
            if (user != null) {
                WeavyContext.Current.User = user;
            }
        }

        var token = ZoomApiUtils.Authorize(code);

        var model = new MeetingAuthentication {
            State = state,
            Authenticated = token != null
        };

        return View(model);
    }

    /// <summary>
    /// Redirect route from Teams Oauth2 authentication.
    /// </summary>
    /// <returns></returns>
    [HttpGet]
    [AllowAnonymous]
    [Route("~/meetings/teams/auth")]
    public ActionResult TeamsAuthorization(string code, string state) {

        var token = TeamsApiUtils.Authorize(code);

        var model = new MeetingAuthentication {
            State = state,
            Authenticated = token != null
        };

        return View(model);
    }
}
