# Receiving and tester workflows

## Receive a shipment

Create a shipment, then import a workbook using [the documented format](workbook-format.md). Import establishes expected quantities, creates box records from supplied box numbers, classifies product names, and updates the local catalog.

Choose the current box and scan or type a barcode with a quantity. An exact current-shipment barcode updates that product immediately. A unique SKU-based suggestion asks you to confirm the proposed product. A barcode present in the local catalog but absent from the current shipment produces a catalog suggestion before it is recorded as unknown. Other unmatched barcodes are recorded in the unknown-item workflow.

The scan response refreshes shipment totals and recent history. Quantity differences produce matched, in-progress, missing, or extra item states. Use box progress and discrepancy views to investigate incomplete receiving.

### Keyboard controls

| Key | Action on the scan page |
| --- | --- |
| Enter | Submit a typed barcode or a completed scanner input. |
| Ctrl+Z | Undo the last scan through the shipment API. |
| F11 | Toggle the scan page's focus mode. |

The page accepts scanner-style keyboard input; it also has a normal barcode field for manual entry. Physical scanner timing and browser behavior should be checked with the hardware you intend to use.

## Complete and retain records

Review box progress, unknowns, and quantity discrepancies before marking boxes or the shipment complete. Completion records a receiving snapshot and locks further scanning. Archiving moves a shipment out of the active list, and restore brings it back to the visible shipment list without reopening completed receiving.

The Export Center downloads a shipment workbook with Summary, Boxes, Products, Discrepancies, and Scan History sheets. Unknown items appear within Discrepancies. Monthly analytics reports are described [separately](analytics.md).

## Classification rules

Products use a MainSection > Category > SubCategory hierarchy. Active keyword rules are evaluated in priority order; product classification also supports a manual MainSection choice. The section-rule interface allows rule maintenance and reclassification of stored products. Generic demonstration rules are seeded locally.

Classification is deterministic rule matching, not a trained prediction service. Review assignments when names are ambiguous or a rule set changes.

## Register and track testers

A tester record has a unique tester code, product barcode, quantity, classification, creator, notes, and lifecycle history. Catalog lookup can fill product details; a new product requires a name. New testers begin in **PendingApproval**, and approval activates them.

Available lifecycle statuses are PendingApproval, Active, Inactive, Stolen, Damaged, Lost, and Replaced. A status change requires a reason and records who made it plus optional notes. The tester list supports status/search filtering, and the detail page shows current state and history.

## Perform a physical tester audit

1. Start an audit. Only one incomplete audit may exist, and at least one active tester is required.
2. The audit includes testers active at its start and their expected unit quantities.
3. Scan the unique tester code to mark that tester found. A product barcode is accepted only when it identifies one unresolved tester; ambiguous barcodes require the unique tester code.
4. A repeated scan does not count the same tester twice. Finding a tester adds its record's full quantity rather than incrementing by one per scan.
5. Complete the audit to calculate found and missed units. Found testers reset their consecutive missed-audit counter; missed testers increment it.

Audit results and last-seen/audit timestamps support physical follow-up. An audit miss does not automatically change a tester's lifecycle status to Lost or Stolen.

The interface restricts some controls by the selected user role, but the API currently has no server-side role authorization. Treat those controls as prototype workflow guidance.
