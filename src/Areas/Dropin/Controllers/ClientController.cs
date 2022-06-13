using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Logging;
using Weavy.Core;
using Weavy.Core.Authentication;
using Weavy.Core.DTO;
using Weavy.Core.Models;
using Weavy.Core.Services;
using Weavy.Core.Utils;
using Weavy.Dropin.Models;

namespace Weavy.Dropin.Controllers;

/// <summary>
/// Controller for the drop-in ui client library.
/// </summary>
[ApiExplorerSettings(IgnoreApi = true)]
public class ClientController : AreaController {

    private readonly ILogger<ClientController> _logger;

    /// <summary>
    /// 
    /// </summary>
    /// <param name="logger"></param>
    public ClientController(ILogger<ClientController> logger) {
        _logger = logger;
    }

    /// <summary>
    /// Called from client to set auth cookie.
    /// The request should contain a JWT in the Authorization header using the Bearer authentication scheme.
    /// </summary>
    /// <returns></returns>
    [HttpPost("login")]
    public async Task<ActionResult<UserOut>> Login() {
        // set auth cookie needed by the drop-in ui
        if (await HttpContext.SignInAsync(WeavyContext.Current.User, false)) {
            // sign in succeeded and auth cookie was issued
            return Ok(WeavyContext.Current.User.MapOut());
        }

        // return anonymous user if sign-in request failed
        return Unauthorized(UserService.Anonymous.MapOut());
    }

    /// <summary>
    /// Sign out, i.e. clear auth cookie.
    /// </summary>
    /// <returns></returns>
    [AllowAnonymous]
    [HttpPost("logout")]
    public async Task<ActionResult> Logout() {
        // clear auth cookie
        await HttpContext.SignOutAsync(Core.Authentication.Constants.COOKIE_SCHEME);
        return Ok();
    }

    /// <summary>
    /// Get the current user. Used to check authentication status etc. If the cookie-user is not the same as the the user specified in the token a 409 conflict will be returned.
    /// </summary>
    /// <returns>Returns a <see cref="User"/> object.</returns>
    [AllowAnonymous]
    [HttpPost("user")]
    public ActionResult<UserOut> GetUser([FromBody] TokenIn token) {
        if (token != null && token.Jwt != null) {
            // NOTE: we just want to determine if cookie and token is different so we don't need to perform any validation or integrity checks
            var payload = JwtUtils.Payload(token.Jwt);
            var iss = payload[ClaimsUtils.ISS] as string;
            var sub = payload[ClaimsUtils.SUB] as string;
            var tokenUser = UserService.Get(iss, sub);

            // if the current (cookie) user is the same as the the user specified in the token, we return 200 OK
            if (tokenUser != null && tokenUser.Id == WeavyContext.Current.User.Id) {
                return Ok(WeavyContext.Current.User.MapOut());
            }
        }

        // otherwise we return 409 Conflict
        return Conflict(WeavyContext.Current.User.MapOut());
    }

    /// <summary>
    /// Get the number of unread notifications and conversations for the current user.
    /// </summary>
    /// <returns></returns>
    [HttpGet("conversation-badge")]
    public ConversationsBadge ConversationBadge() {
        // REVIEW: also return number of unread notifications?
        return ConversationService.GetBadge(WeavyContext.Current.User.Id);
    }

    /// <summary>
    /// Called to initialize the Weavy client.
    /// </summary>
    /// <param name="options">Input options set by client.</param>        
    [HttpPost("init")]
    public ClientOutputModel InitClient([FromBody] InitClientModel options) {
        var output = new ClientOutputModel();

        // check system status
        if (Application.Status == SystemStatus.Ok) {

            // version check
            if (options?.Version == null) {
                _logger.LogWarning("Client version not specified");
            } else if (options?.Version != Application.SemVer) {
                _logger.LogWarning("Client version {clientver} does not match server version {appver}", options.Version, Application.SemVer);
            }
        }

        // set language and timezone cookies
        // REVIEW: set the cookie path to /dropin?
        Response.Cookies.Append("lang", options.Language ?? "", new CookieOptions() { Expires = options.Language == null ? DateTimeOffset.MinValue : DateTimeOffset.UtcNow.AddYears(1), Secure = true, SameSite = SameSiteMode.None });
        Response.Cookies.Append("tz", options.TimeZone ?? "", new CookieOptions() { Expires = options.TimeZone == null ? DateTimeOffset.MinValue : DateTimeOffset.UtcNow.AddYears(1), Secure = true, SameSite = SameSiteMode.None });

        return output;
    }

    /// <summary>
    /// Called to initialize an app.
    /// </summary>
    [HttpPost("app")]
    public ActionResult<InitAppModel> InitApp([FromBody] InitAppModel model) {

        // NOTE: some types aren't really apps so we need to handle them specially
        if (model.Type != null && model.Type.Equals("messenger", StringComparison.OrdinalIgnoreCase)) {
            model.Url = Application.Url + Url.Action(nameof(MessengerController.Index), typeof(MessengerController).ControllerName());
        //} else if (model.Type.Equals("notifications", StringComparison.OrdinalIgnoreCase)) {
        //    model.Url = Application.Url + Url.Action(nameof(NotificationsController.Get), typeof(NotificationsController).ControllerName());
        } else {
            if (model.Id == null) {
                // apps must have identifiers
                return Problem("Id is required.");
            }

            // try to locate app with specified identifier
            var app = AppService.Get(model.Id, trashed: true, sudo: true);

            if (app == null) {
                return Problem($"App {model.Id} was not found.");
            } else if (app.IsTrashed()) {
                return Problem($"App {model.Id} is trashed.");
            } else if (!app.HasPermission(Permission.Read)) {
                return Problem($"Access denied for app {model.Id}.");
            }

            // set url that dropin-js should use when loading app,
            model.Url = $"{Application.Url}/{Constants.AREA_NAME}/{app.GetType().Name.ToLower()}/{app.Id}";
        }

        // return 
        return Ok(model);
    }

    /// <summary>
    /// Ping view for testing client connection.
    /// </summary>        
    /// <returns></returns>
    [AllowAnonymous]
    [HttpGet("ping")]
    public ActionResult Ping() {
        // Enable one of these to test blocking
        //Response.Headers.Append("Content-Security-Policy", "frame-ancestors 'none'");
        //Response.Headers.Append("X-Frame-Options", "DENY");
        //Response.Headers.Append("X-Frame-Options", "SAMEORIGIN");

        // Enable client to detect frame blocking errors
        Response.Headers.Append("Access-Control-Expose-Headers", "X-Frame-Options, Content-Security-Policy");

        return View();
    }

    /// <summary>
    /// A view to request cookie access in the client.
    /// </summary>
    /// <returns></returns>
    [AllowAnonymous]
    [HttpGet("cookie-access")]
    public ActionResult CookieAccess() {
        return View();
    }

    /// <summary>
    /// A view used to set cookie access in the client.
    /// </summary>
    /// <returns></returns>
    [AllowAnonymous]
    [HttpGet("cookie-access-notify")]
    public ActionResult CookieAccessNotify() {
        if (!Request.Cookies.ContainsKey(Weavy.Core.Authentication.Constants.COOKIE_NAME)) {
            Response.Cookies.Append(Weavy.Core.Authentication.Constants.COOKIE_NAME, "", new CookieOptions() { HttpOnly = true, Secure = true, SameSite = SameSiteMode.None });
        }
        return View();
    }

    /// <summary>
    /// Creates an ActionResult that produces a 400 BadRequest response with the specified error message.
    /// </summary>
    /// <param name="error">The error message to return</param>
    /// <returns></returns>
    private ActionResult Problem(string error) {
        return Problem(statusCode: StatusCodes.Status400BadRequest, title: ReasonPhrases.GetReasonPhrase(StatusCodes.Status400BadRequest), detail: error);
    }

}
