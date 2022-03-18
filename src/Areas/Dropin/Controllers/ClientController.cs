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
using Weavy.Core.Models;
using Weavy.Core.Services;
using Weavy.Core.Utils;
using Weavy.Dropin.Models;

namespace Weavy.Dropin.Controllers;

/// <summary>
/// Controller for drop-in ui clients.
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
    /// Called from client to login, i.e set auth cookie.
    /// The request should contain a JWT in the Authorization header using the Bearer authentication scheme.
    /// </summary>
    /// <returns></returns>
    [HttpPost("login")]
    public async Task<ActionResult> Login() {
        // set auth cookie needed by the drop-in ui
        if (await HttpContext.SignInAsync(WeavyContext.Current.User, false)) {
            // sign in succeeded and auth cookie was issued
            return Ok(WeavyContext.Current.User);
        }

        // return anonymous user if sign-in request failed
        return Unauthorized(UserService.Anonymous);
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
    /// Get the current user. Used to check authentication status etc. If the cookie user is not the same as the the user specified in the token a 409 conflict will be returned.
    /// </summary>
    /// <returns>Returns a <see cref="User"/> object.</returns>
    [AllowAnonymous]
    [HttpPost("user")]
    public ActionResult GetUser([FromBody] TokenIn token) {
        // TODO: test that this works as intended

        if (token != null && token.Jwt != null) {
            // NOTE: we just want to determine if cookie and token is different so we don't need to perform any validation or integrity checks
            var payload = JwtUtils.Payload(token.Jwt);
            var iss = payload[ClaimsUtils.ISS] as string;
            var sub = payload[ClaimsUtils.SUB] as string;
            var tokenUser = UserService.Get(iss, sub);

            // if the current (cookie) user is the same as the the user specified in the token, we return 200 OK
            if (tokenUser != null && tokenUser.Id == WeavyContext.Current.User.Id) {
                return Ok(WeavyContext.Current.User);
            }
        }

        // otherwise we return 409 Conflict
        return Conflict(WeavyContext.Current.User);
    }


    /// <summary>
    /// Get the number of unread notifications and conversations for the current user.
    /// </summary>
    /// <returns></returns>
    [HttpGet("badges")]
    public ActionResult Badges() {
        //var notifications = NotificationService.GetBadge(WeavyContext.Current.User.Id);
        //var conversations = ConversationService.GetBadge(WeavyContext.Current.User.Id);
        //var total = notifications + conversations;
        //return Ok(new { notifications, conversations, total });
        return Ok();
    }

    /// <summary>
    /// Called to initialize the Weavy client.
    /// </summary>
    /// <param name="options">Input options set by client.</param>        
    [HttpPost("init")]
    public ActionResult InitClient([FromBody] InitClientModel options) {
        var output = new ClientOutputModel();

        // check system status
        if (output.Status == SystemStatus.Ok) {

            // version check
            if (options?.Version == null) {
                _logger.LogWarning("Client version not specified");
            } else if (options?.Version != Application.SemVer) {
                _logger.LogWarning($"Client version {options.Version} does not match server version {Application.SemVer}");
            }

            // configure plugins
            // REVIEW: are there any other plugins we should consider?
            if (options?.Plugins.ContainsKey("theme") ?? false) {
                output.Plugins["theme"] = ConfigureTheme(options.Plugins["theme"]);
            }

            // app name mapping
            //output.Apps = AppService.GetApps().ToDictionary(app => app.GetType().Name, app => app.Guid);
        }

        // set language, timezone and theme cookies
        // REVIEW: set the cookie path to /dropin?
        Response.Cookies.Append("lang", options.Language ?? "", new CookieOptions() { Expires = options.Language == null ? DateTimeOffset.MinValue : DateTimeOffset.UtcNow.AddYears(1), Secure = true, SameSite = SameSiteMode.None });
        Response.Cookies.Append("tz", options.TimeZone ?? "", new CookieOptions() { Expires = options.TimeZone == null ? DateTimeOffset.MinValue : DateTimeOffset.UtcNow.AddYears(1), Secure = true, SameSite = SameSiteMode.None });
        Response.Cookies.Append("theme", options.Theme ?? "", new CookieOptions() { Expires = options.Theme == null ? DateTimeOffset.MinValue : DateTimeOffset.UtcNow.AddYears(1), Secure = true, SameSite = SameSiteMode.None });

        return Ok(output);
    }

    /// <summary>
    /// Called to initialize an app. The request body should contain app properties.
    /// </summary>
    [HttpPost("app")]
    public ActionResult InitApp([FromBody] InitAppModel model) {
        if (model.Id == null) {
            return Problem("Id is required.");
        }

        // try to locate app with specified identifier
        var app = AppService.Get(model.Id, trashed: true, sudo: true);
        if (app == null) {
            // create and insert new  app
            if (model.Type == null) {
                return Problem("Type is required.");
            }

            // init app of specified type
            app = AppService.New(model.Type);

            if (app == null) {
                return Problem($"Could not resolve type {model.Type}");
            } else if (app is not Messenger) {
                // HACK: disable all apps except messenger for now...
                return Problem($"Unable to init app {app.GetType().Name} ({app.GetType().GUID})");
            } else if (app is not IContextual) {
                return Problem($"Unable to init non contextual app {app.GetType().Name} ({app.GetType().GUID})");
            }

            // set well-known app properties
            // TODO: set additional (custom) app properties
            ((IContextual)app).Identifier = model.Id;
            app.Name = model.Name;
            app.Tags = model.Tags;

            // insert app
            app = AppService.Insert(app, sudo: true);

        } else if (app.IsTrashed()) {
            return Problem($"App {model.Id} is trashed.");
        } else {
            // we found a matching app
            if (model.Type != null) {
                // return error if expected type does not match actual type
                var fromType = app.GetType();
                var toType = AppService.New(model.Type)?.GetType();
                if (toType != null && toType != fromType) {
                    return Problem($"Cannot change type from {fromType.Name} ({fromType.GUID}) to {toType.Name} ({toType.GUID})");
                }
            }

            // set well-known app properties
            // TODO: set additional (custom) app properties
            var update = false;
            if (model.Name != null && model.Name != app.Name) {
                app.Name = model.Name;
                update = true;
            }
            if (model.Tags != null && CollectionUtils.AreTagsDifferent(model.Tags, app.Tags)) {
                app.Tags = model.Tags;
                update = true;
            }

            // update app (if needed)
            if (update) {
                app = AppService.Update(app, sudo: true);
            }
        }

        // make sure current user is member
        if (!app.MemberIds.Contains(WeavyContext.Current.User.Id)) {
            AppService.AddMember(app.Id, WeavyContext.Current.User.Id, sudo: true);
        }

        // set url that client library should use when loading app
        model.Url = $"{Application.Url}/{Constants.AREA_NAME}/{app.GetType().Name.ToLower()}/{app.Id}";

        // set appid that is used for identifying the app in navigation
        model.AppId = app.Id;

        // return 
        return Ok(model);
    }

    /// <summary>
    /// Configure the Theme plugin.
    /// </summary>
    /// <param name="options">Options for the Theme plugin</param>
    /// <returns>The configured plugin data</returns>
    private dynamic ConfigureTheme(dynamic options) {
        return new {
            Logo = Core.Utils.UrlUtils.IconUrl(size: 48, absolute: true),
            ThemeColor = ThemeService.Theme.Color
        };
    }

    /// <summary>
    /// Ping view for weavy client script.
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
