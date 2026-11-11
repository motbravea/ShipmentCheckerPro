namespace ShipmentCheckerPro.Api.Models;

public sealed record EmployeeSummary(int Id, string Name, string Role, string Initials);

public sealed record LoginRequest(int EmployeeId, string Pin);

public sealed record LoginResponse(int Id, string Name, string Role);
