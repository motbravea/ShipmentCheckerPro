using Microsoft.AspNetCore.Mvc;
using ShipmentCheckerPro.Api.Data;

namespace ShipmentCheckerPro.Api.Controllers;

[ApiController]
[Route("api/v1/app")]
public class AppController : ControllerBase
{
    [HttpGet("health")]
    public ActionResult<object> Health()
    {
        return Ok(new
        {
            status = "ok",
            databasePath = AppDataPaths.DatabasePath,
            photosPath = AppDataPaths.PhotosPath,
            version = "0.4.0-desktop"
        });
    }
}
