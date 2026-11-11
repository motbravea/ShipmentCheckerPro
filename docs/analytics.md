# Analytics semantics

The dedicated Analytics page calculates receiving results from stored shipment items. It provides a month selector for the latest 24 months; the API accepts a valid year/month pair independently of that UI list.

## Products received most

The **Top received products** list groups shipment items by barcode, sums `ScannedQuantity`, removes zero-unit groups, and ranks the top 10 by received units. Equal quantities are ordered by product name. The latest matching item supplies the displayed name, SKU, and classification.

This is a quantity ranking. It does not rank products by monetary value, sales, or number of deliveries. Unknown items are counted separately and do not appear as known-product receipt totals.

## Monthly scope

A shipment belongs to the month of `CompletedAt`, falling back to `CreatedAt` when not completed. The service uses UTC month boundaries. Item quantities can therefore include open shipments, and the period is not a filter over individual scan timestamps.

The completed-shipment metric counts completed or archived shipments from that selected set. Unknown units come from selected shipments' unknown records whose first scan falls within the month.

## Metrics and charts

| View | Calculation or content |
| --- | --- |
| Units received | Sum of scanned quantities on selected shipment items. |
| Missing / extra | Sum of positive expected-minus-scanned / scanned-minus-expected differences. |
| Match rate per shipment | `sum(min(expected, scanned)) / sum(expected) * 100`; zero when expected is zero. |
| Average match rate | Unweighted average of the selected shipments' match rates. |
| MainSection bars | Received, missing, and extra units grouped by primary section. |
| Discrepancy mix | Missing, extra, and unknown units. |
| Shipment match-rate line | Match rate for each selected shipment in date order, rather than a multi-month time series. |
| Classification table | MainSection > Category > SubCategory with item-row count, expected, received, missing, extra, and discrepancy rate. |
| Discrepancy rate | `(missing + extra) / expected * 100`; zero when expected is zero. |

The MainSection selector filters the classification table only. It does not filter the headline metrics, top-products ranking, other charts, or exported workbook. The table's product count is a count of shipment-item rows, not distinct catalog products.

## Historical problems and testers

**Chronic problem products** uses discrepant item rows from all completed or archived shipment history, independently of the chosen month. It groups by barcode, counts shortage and excess occurrences, keeps products with at least three of either, and shows at most 20 ordered by combined occurrence count.

Tester metrics have different scopes:

- Active tester units and the status chart summarize current tester records across the database.
- Tester losses count status-change records to Stolen, Damaged, or Lost during the selected month; they are event counts rather than quantities.
- Audit missed units sum the missed totals of audits completed during the month.
- Manual adjustments counts adjustment records dated in the month; this metric does not imply a completed adjustment-entry interface.

## Excel export

The monthly report contains six sheets:

1. **Overview:** month, headline metrics, tester audit missed units, and adjustment count.
2. **Sections:** classification hierarchy, item-row counts, quantities, and discrepancy rates.
3. **Shipment Accuracy:** dates, expected/received/missing/extra/unknown units, and match rates.
4. **Top Products:** ranked known products with barcode, SKU, hierarchy, and received units.
5. **Chronic Problems:** historical shortage/excess occurrences and trend label.
6. **Tester Status:** current tester status unit totals.

The per-shipment receiving workbook is separate. Its five sheets are Summary, Boxes, Products, Discrepancies, and Scan History; unknown items are included in Discrepancies.
