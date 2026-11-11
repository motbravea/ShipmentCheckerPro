using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShipmentCheckerPro.Api.Data;
using ShipmentCheckerPro.Api.Models;

namespace ShipmentCheckerPro.Api.Controllers;

[ApiController]
[Route("api/v1/tester-audits")]
public class TesterAuditsController(ShipmentCheckerDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TesterAuditListItemDto>>> List(CancellationToken cancellationToken)
    {
        var sessions = await context.TesterAuditSessions
            .AsNoTracking()
            .OrderByDescending(session => session.StartedAt)
            .Select(session => new TesterAuditListItemDto(
                session.Id,
                session.StartedAt,
                session.CompletedAt,
                session.CreatedBy,
                session.TotalExpected,
                session.TotalScanned,
                session.TotalMissed,
                session.Notes))
            .ToListAsync(cancellationToken);

        return Ok(sessions);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TesterAuditDetailDto>> Get(int id, CancellationToken cancellationToken)
    {
        var detail = await ToDetailAsync(id, cancellationToken);
        return detail is null ? NotFound(new { message = "Tester audit not found." }) : Ok(detail);
    }

    [HttpPost]
    public async Task<ActionResult<TesterAuditDetailDto>> Start(
        StartTesterAuditRequest request,
        CancellationToken cancellationToken)
    {
        if (await context.TesterAuditSessions.AnyAsync(session => session.CompletedAt == null, cancellationToken))
        {
            return BadRequest(new { message = "Complete the current tester audit before starting another." });
        }

        var testers = await context.Testers
            .Where(tester => tester.Status == TesterStatuses.Active)
            .OrderBy(tester => tester.ProductName)
            .ToListAsync(cancellationToken);

        if (testers.Count == 0)
        {
            return BadRequest(new { message = "There are no active testers to audit." });
        }

        var session = new TesterAuditSession
        {
            StartedAt = DateTime.UtcNow,
            CreatedBy = request.CreatedBy?.Trim(),
            TotalExpected = testers.Sum(tester => tester.Quantity),
            Notes = request.Notes?.Trim()
        };

        context.TesterAuditSessions.Add(session);
        await context.SaveChangesAsync(cancellationToken);

        context.TesterAuditResults.AddRange(testers.Select(tester => new TesterAuditResult
        {
            AuditSessionId = session.Id,
            TesterId = tester.Id,
            WasFound = false
        }));
        await context.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(Get), new { id = session.Id }, await ToDetailAsync(session.Id, cancellationToken));
    }

    [HttpPost("{id:int}/scan")]
    public async Task<ActionResult<TesterAuditDetailDto>> Scan(
        int id,
        ScanTesterAuditRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
        {
            return BadRequest(new { message = "Tester code or barcode is required." });
        }

        var session = await context.TesterAuditSessions.FindAsync([id], cancellationToken);
        if (session is null)
        {
            return NotFound(new { message = "Tester audit not found." });
        }

        if (session.CompletedAt is not null)
        {
            return BadRequest(new { message = "This tester audit is already completed." });
        }

        var code = request.Code.Trim();
        var tester = await context.Testers
            .FirstOrDefaultAsync(candidate => candidate.TesterCode == code, cancellationToken);

        if (tester is null)
        {
            var barcodeMatches = await (
                from candidate in context.Testers
                join auditResult in context.TesterAuditResults on candidate.Id equals auditResult.TesterId
                where auditResult.AuditSessionId == id && candidate.Barcode == code && !auditResult.WasFound
                select candidate)
                .Take(2)
                .ToListAsync(cancellationToken);

            if (barcodeMatches.Count > 1)
            {
                return BadRequest(new { message = "Multiple testers use this product barcode. Scan the unique tester code." });
            }

            tester = barcodeMatches.SingleOrDefault();
        }

        if (tester is null)
        {
            return NotFound(new { message = "Tester code or product barcode was not found." });
        }

        var result = await context.TesterAuditResults
            .FirstOrDefaultAsync(candidate => candidate.AuditSessionId == id && candidate.TesterId == tester.Id, cancellationToken);

        if (result is null)
        {
            return BadRequest(new { message = "This tester was not active when the audit started." });
        }

        if (!result.WasFound)
        {
            result.WasFound = true;
            result.ScannedAt = DateTime.UtcNow;
            result.Notes = string.IsNullOrWhiteSpace(request.EmployeeName) ? null : $"Scanned by {request.EmployeeName.Trim()}";
            tester.LastSeenAt = result.ScannedAt;
            tester.LastAuditAt = result.ScannedAt;
            session.TotalScanned += tester.Quantity;
            await context.SaveChangesAsync(cancellationToken);
        }

        return Ok(await ToDetailAsync(id, cancellationToken));
    }

    [HttpPost("{id:int}/complete")]
    public async Task<ActionResult<TesterAuditDetailDto>> Complete(int id, CancellationToken cancellationToken)
    {
        var session = await context.TesterAuditSessions.FindAsync([id], cancellationToken);
        if (session is null)
        {
            return NotFound(new { message = "Tester audit not found." });
        }

        if (session.CompletedAt is not null)
        {
            return BadRequest(new { message = "This tester audit is already completed." });
        }

        var results = await context.TesterAuditResults
            .Where(result => result.AuditSessionId == id)
            .ToListAsync(cancellationToken);
        var testerIds = results.Select(result => result.TesterId).ToHashSet();
        var testers = await context.Testers
            .Where(tester => testerIds.Contains(tester.Id))
            .ToListAsync(cancellationToken);

        foreach (var tester in testers)
        {
            var result = results.First(candidate => candidate.TesterId == tester.Id);
            tester.LastAuditAt = DateTime.UtcNow;
            if (result.WasFound)
            {
                tester.MissedAuditCount = 0;
            }
            else
            {
                tester.MissedAuditCount++;
            }
        }

        session.CompletedAt = DateTime.UtcNow;
        session.TotalScanned = testers
            .Where(tester => results.First(result => result.TesterId == tester.Id).WasFound)
            .Sum(tester => tester.Quantity);
        session.TotalMissed = session.TotalExpected - session.TotalScanned;
        await context.SaveChangesAsync(cancellationToken);

        return Ok(await ToDetailAsync(id, cancellationToken));
    }

    private async Task<TesterAuditDetailDto?> ToDetailAsync(int id, CancellationToken cancellationToken)
    {
        var session = await context.TesterAuditSessions
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);

        if (session is null)
        {
            return null;
        }

        var results = await (
            from result in context.TesterAuditResults.AsNoTracking()
            join tester in context.Testers.AsNoTracking() on result.TesterId equals tester.Id
            where result.AuditSessionId == id
            orderby result.WasFound, tester.ProductName
            select new TesterAuditResultDto(
                tester.Id,
                tester.TesterCode,
                tester.ProductName,
                tester.Barcode,
                tester.Quantity,
                result.WasFound,
                result.ScannedAt,
                result.Notes))
            .ToListAsync(cancellationToken);

        return new TesterAuditDetailDto(
            session.Id,
            session.StartedAt,
            session.CompletedAt,
            session.CreatedBy,
            session.TotalExpected,
            session.TotalScanned,
            session.TotalMissed,
            session.Notes,
            results);
    }
}
