using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShipmentCheckerPro.Api.Data;
using ShipmentCheckerPro.Api.Models;

namespace ShipmentCheckerPro.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController(ShipmentCheckerDbContext context) : ControllerBase
{
    [HttpGet("employees")]
    public async Task<ActionResult<IReadOnlyList<EmployeeSummary>>> Employees()
    {
        var employees = await context.Employees
            .AsNoTracking()
            .Where(employee => employee.IsActive)
            .OrderBy(employee => employee.Name)
            .Select(employee => new EmployeeSummary(
                employee.Id,
                employee.Name,
                employee.Role,
                employee.Name.Substring(0, 1).ToUpper()))
            .ToListAsync();

        return Ok(employees);
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
    {
        var employee = await context.Employees
            .FirstOrDefaultAsync(candidate => candidate.Id == request.EmployeeId && candidate.IsActive);

        if (employee is null || employee.PIN != request.Pin)
        {
            return Unauthorized(new { message = "Incorrect PIN. Please try again." });
        }

        employee.LastLoginAt = DateTime.UtcNow;
        await context.SaveChangesAsync();

        return Ok(new LoginResponse(employee.Id, employee.Name, employee.Role));
    }
}
