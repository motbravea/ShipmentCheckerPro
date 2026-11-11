export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:5085/api/v1";

export type EmployeeSummary = {
  id: number;
  name: string;
  role: "Employee" | "Manager";
  initials: string;
};

export type SessionUser = {
  id: number;
  name: string;
  role: "Employee" | "Manager";
};

export type SectionRule = {
  id: number;
  keyword: string;
  mainSection: string;
  category: string;
  subCategory: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  createdBy?: string;
};

export type UpsertSectionRule = {
  keyword: string;
  mainSection: string;
  category: string;
  subCategory: string;
  priority: number;
  isActive: boolean;
  createdBy?: string;
};

export type ClassificationResult = {
  mainSection: string;
  category: string;
  subCategory: string;
  matchedRuleId?: number;
  matchedKeyword?: string;
};

export type CreateShipment = {
  name: string;
  orderNumber?: string;
  orderReference?: string;
  storeName?: string;
  storeCode?: string;
  supplierName?: string;
  notes?: string;
  createdBy?: string;
};

export type ShipmentSummary = {
  totalItems: number;
  totalExpected: number;
  totalScanned: number;
  matchedUnits: number;
  missingUnits: number;
  extraUnits: number;
  unknownUnits: number;
  matchRate: number;
};

export type ShipmentListItem = {
  id: number;
  name: string;
  orderReference?: string;
  storeName?: string;
  createdAt: string;
  completedAt?: string;
  status: string;
  totalExpected: number;
  totalScanned: number;
  missingUnits: number;
  extraUnits: number;
  unknownUnits: number;
};

export type ShipmentItem = {
  id: number;
  boxNumber?: string;
  chineseProductName?: string;
  productName: string;
  sku: string;
  barcode: string;
  expectedQuantity: number;
  scannedQuantity: number;
  mainSection: string;
  category: string;
  subCategory: string;
  status: string;
  confidenceFlag: string;
  lastScannedAt?: string;
  notes?: string;
};

export type ShipmentDetail = {
  id: number;
  name: string;
  orderNumber?: string;
  orderReference?: string;
  storeName?: string;
  storeCode?: string;
  supplierName?: string;
  createdAt: string;
  completedAt?: string;
  status: string;
  notes?: string;
  currentBoxNumber?: string;
  summary: ShipmentSummary;
  items: ShipmentItem[];
};

export type ImportSummary = {
  shipmentId: number;
  rowsImported: number;
  rowsRejected: number;
  warningCount: number;
  totalProductsInShipment: number;
  totalExpectedQuantityInShipment: number;
  errors: string[];
  warnings: string[];
};

export type ScanHistory = {
  id: number;
  barcode: string;
  productName?: string;
  sku?: string;
  quantityAdded: number;
  scanTime: string;
  employeeName?: string;
  actionType: string;
  boxNumber?: string;
  wasUndo: boolean;
};

export type DiscrepancyResponse = {
  items: ShipmentItem[];
  unknownItems: UnknownItem[];
};

export type UnknownItem = {
  id: number;
  barcode: string;
  scannedQuantity: number;
  firstScannedAt: string;
  lastScannedAt: string;
};

export type ScanResponse = {
  outcome: "Matched" | "Extra" | "Unknown" | "SkuSuggestion" | "CatalogSuggestion" | "Error";
  message: string;
  item?: ShipmentItem;
  unknownItem?: UnknownItem;
  suggestedItem?: ShipmentItem;
  catalogSuggestion?: {
    barcode: string;
    sku?: string;
    productName: string;
    mainSection: string;
    category: string;
    subCategory: string;
  };
  summary: ShipmentSummary;
  recentScans: ScanHistory[];
};

export type BoxProgress = {
  id: number;
  boxNumber: string;
  expectedQuantity: number;
  scannedQuantity: number;
  matchedQuantity: number;
  missingQuantity: number;
  extraQuantity: number;
  isComplete: boolean;
  completedAt?: string;
};

export type ShipmentCompletion = {
  shipmentId: number;
  status: string;
  hasImportedProducts: boolean;
  totalBoxes: number;
  completedBoxes: number;
  allBoxesComplete: boolean;
  hasDiscrepancies: boolean;
  canComplete: boolean;
  summary: ShipmentSummary;
};

export type TesterListItem = {
  id: number;
  testerCode: string;
  productName: string;
  sku?: string;
  barcode: string;
  mainSection: string;
  category: string;
  subCategory: string;
  quantity: number;
  status: string;
  createdAt: string;
  lastSeenAt?: string;
  lastAuditAt?: string;
  missedAuditCount: number;
};

export type TesterHistory = {
  id: number;
  oldStatus?: string;
  newStatus: string;
  changedAt: string;
  changedBy?: string;
  reason: string;
  notes?: string;
};

export type TesterDetail = TesterListItem & {
  chineseProductName?: string;
  createdBy?: string;
  approvedBy?: string;
  lastStatusChangeAt?: string;
  notes?: string;
  photoPath?: string;
  history: TesterHistory[];
};

export type ProductLookup = {
  barcode: string;
  sku?: string;
  productName: string;
  chineseProductName?: string;
  mainSection: string;
  category: string;
  subCategory: string;
};

export type CreateTester = {
  testerCode: string;
  barcode: string;
  productName?: string;
  chineseProductName?: string;
  sku?: string;
  quantity: number;
  notes?: string;
  createdBy?: string;
};

export type TesterAuditListItem = {
  id: number;
  startedAt: string;
  completedAt?: string;
  createdBy?: string;
  totalExpected: number;
  totalScanned: number;
  totalMissed: number;
  notes?: string;
};

export type TesterAuditResult = {
  testerId: number;
  testerCode: string;
  productName: string;
  barcode: string;
  quantity: number;
  wasFound: boolean;
  scannedAt?: string;
  notes?: string;
};

export type TesterAuditDetail = TesterAuditListItem & {
  results: TesterAuditResult[];
};

export type SectionAnalytics = {
  mainSection: string;
  category: string;
  subCategory: string;
  productCount: number;
  expectedUnits: number;
  receivedUnits: number;
  missingUnits: number;
  extraUnits: number;
  discrepancyRate: number;
};

export type ShipmentAccuracy = {
  shipmentId: number;
  shipmentName: string;
  date: string;
  expectedUnits: number;
  receivedUnits: number;
  missingUnits: number;
  extraUnits: number;
  unknownUnits: number;
  matchRate: number;
};

export type ProductAnalytics = {
  barcode: string;
  sku?: string;
  productName: string;
  mainSection: string;
  category: string;
  subCategory: string;
  receivedUnits: number;
};

export type ChronicProduct = {
  barcode: string;
  sku?: string;
  productName: string;
  mainSection: string;
  missingOccurrences: number;
  extraOccurrences: number;
  trend: string;
};

export type MonthlyAnalytics = {
  month: string;
  totalUnitsReceived: number;
  completedShipments: number;
  averageMatchRate: number;
  activeTesters: number;
  chronicProblemProducts: number;
  testerLosses: number;
  unknownUnits: number;
  manualAdjustments: number;
  testerAuditMissedUnits: number;
  sections: SectionAnalytics[];
  shipmentAccuracy: ShipmentAccuracy[];
  discrepancies: Array<{ type: string; units: number }>;
  topProducts: ProductAnalytics[];
  chronicProducts: ChronicProduct[];
  testerStatuses: Array<{ status: string; units: number }>;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: isFormData
      ? init?.headers
      : {
          "Content-Type": "application/json",
          ...init?.headers,
        },
    ...init,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message ?? "Something went wrong. Please try again.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function download(path: string, fallbackFileName: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message ?? "Export failed. Please try again.");
  }

  const blob = await response.blob();
  const fileName = readContentDispositionFileName(response.headers.get("content-disposition")) ?? fallbackFileName;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function readContentDispositionFileName(header: string | null): string | null {
  if (!header) {
    return null;
  }

  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header);
  return match ? decodeURIComponent(match[1]) : null;
}

export const api = {
  employees: () => request<EmployeeSummary[]>("/auth/employees"),
  login: (employeeId: number, pin: string) =>
    request<SessionUser>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ employeeId, pin }),
    }),
  health: () => request<{ status: string; databasePath: string; photosPath: string; version: string }>("/app/health"),
  shipments: () => request<ShipmentListItem[]>("/shipments"),
  archivedShipments: () => request<ShipmentListItem[]>("/shipments/archive"),
  createShipment: (shipment: CreateShipment) =>
    request<ShipmentDetail>("/shipments", {
      method: "POST",
      body: JSON.stringify(shipment),
    }),
  shipment: (id: number) => request<ShipmentDetail>(`/shipments/${id}`),
  shipmentCompletion: (id: number) => request<ShipmentCompletion>(`/shipments/${id}/completion`),
  completeShipment: (id: number, employeeName: string | undefined, acknowledgeDiscrepancies: boolean) =>
    request<ShipmentCompletion>(`/shipments/${id}/complete`, {
      method: "POST",
      body: JSON.stringify({ employeeName, acknowledgeDiscrepancies }),
    }),
  archiveShipment: (id: number) =>
    request<void>(`/shipments/${id}/archive`, {
      method: "POST",
    }),
  restoreShipment: (id: number) =>
    request<void>(`/shipments/${id}/restore`, {
      method: "POST",
    }),
  discrepancies: (id: number) => request<DiscrepancyResponse>(`/shipments/${id}/discrepancies`),
  downloadShipmentReport: (id: number) => download(`/shipments/${id}/export-excel`, `shipment-${id}-report.xlsx`),
  scanHistory: (id: number) => request<ScanHistory[]>(`/shipments/${id}/scan-history`),
  importShipmentExcel: (id: number, file: File, employeeName?: string) => {
    const body = new FormData();
    body.append("file", file);
    if (employeeName) {
      body.append("employeeName", employeeName);
    }

    return request<ImportSummary>(`/shipments/${id}/import-excel`, {
      method: "POST",
      body,
    });
  },
  scanShipment: (
    id: number,
    payload: {
      barcode: string;
      employeeName?: string;
      boxNumber?: string;
      quantity?: number;
      confirmShipmentItemId?: number;
      confirmLogUnknown?: boolean;
    },
  ) =>
    request<ScanResponse>(`/shipments/${id}/scan`, {
      method: "POST",
      body: JSON.stringify({ quantity: 1, confirmLogUnknown: false, ...payload }),
    }),
  undoLastScan: (id: number, employeeName?: string) =>
    request<ScanResponse>(`/shipments/${id}/undo-last-scan`, {
      method: "POST",
      body: JSON.stringify({ employeeName }),
    }),
  boxes: (id: number) => request<BoxProgress[]>(`/shipments/${id}/boxes`),
  createBox: (id: number, boxNumber: string) =>
    request<void>(`/shipments/${id}/boxes`, {
      method: "POST",
      body: JSON.stringify({ boxNumber }),
    }),
  setCurrentBox: (id: number, boxNumber: string) =>
    request<void>(`/shipments/${id}/current-box`, {
      method: "PUT",
      body: JSON.stringify({ boxNumber }),
    }),
  completeBox: (id: number, boxNumber: string, employeeName?: string) =>
    request<void>(`/shipments/${id}/boxes/${encodeURIComponent(boxNumber)}/complete`, {
      method: "POST",
      body: JSON.stringify({ employeeName }),
    }),
  testers: (filters?: { search?: string; status?: string; mainSection?: string }) => {
    const params = new URLSearchParams();
    if (filters?.search) params.set("search", filters.search);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.mainSection) params.set("mainSection", filters.mainSection);
    const query = params.toString();
    return request<TesterListItem[]>(`/testers${query ? `?${query}` : ""}`);
  },
  tester: (id: number) => request<TesterDetail>(`/testers/${id}`),
  lookupTesterProduct: (barcode: string) =>
    request<ProductLookup>(`/testers/product-lookup/${encodeURIComponent(barcode)}`),
  createTester: (tester: CreateTester) =>
    request<TesterDetail>("/testers", {
      method: "POST",
      body: JSON.stringify(tester),
    }),
  approveTester: (id: number, approvedBy?: string) =>
    request<TesterDetail>(`/testers/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ approvedBy }),
    }),
  updateTesterStatus: (
    id: number,
    payload: { status: string; changedBy?: string; reason: string; notes?: string },
  ) =>
    request<TesterDetail>(`/testers/${id}/status`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  testerAudits: () => request<TesterAuditListItem[]>("/tester-audits"),
  testerAudit: (id: number) => request<TesterAuditDetail>(`/tester-audits/${id}`),
  startTesterAudit: (createdBy?: string, notes?: string) =>
    request<TesterAuditDetail>("/tester-audits", {
      method: "POST",
      body: JSON.stringify({ createdBy, notes }),
    }),
  scanTesterAudit: (id: number, code: string, employeeName?: string) =>
    request<TesterAuditDetail>(`/tester-audits/${id}/scan`, {
      method: "POST",
      body: JSON.stringify({ code, employeeName }),
    }),
  completeTesterAudit: (id: number) =>
    request<TesterAuditDetail>(`/tester-audits/${id}/complete`, {
      method: "POST",
    }),
  monthlyAnalytics: (year: number, month: number) =>
    request<MonthlyAnalytics>(`/analytics/monthly?year=${year}&month=${month}`),
  downloadMonthlyAnalytics: (year: number, month: number) =>
    download(
      `/analytics/monthly/export-excel?year=${year}&month=${month}`,
      `ShipmentCheckerPro_Analytics_${year}-${String(month).padStart(2, "0")}.xlsx`,
    ),
  sectionRules: () => request<SectionRule[]>("/settings/section-rules"),
  createSectionRule: (rule: UpsertSectionRule) =>
    request<SectionRule>("/settings/section-rules", {
      method: "POST",
      body: JSON.stringify(rule),
    }),
  updateSectionRule: (id: number, rule: UpsertSectionRule) =>
    request<SectionRule>(`/settings/section-rules/${id}`, {
      method: "PUT",
      body: JSON.stringify(rule),
    }),
  deleteSectionRule: (id: number) =>
    request<void>(`/settings/section-rules/${id}`, {
      method: "DELETE",
    }),
  reorderSectionRules: (items: Array<{ id: number; priority: number }>) =>
    request<void>("/settings/section-rules/reorder", {
      method: "PUT",
      body: JSON.stringify(items),
    }),
  testClassification: (productName: string, productType?: string) =>
    request<ClassificationResult>("/settings/section-rules/test", {
      method: "POST",
      body: JSON.stringify({ productName, productType }),
    }),
};
