// ─── Document Types ───────────────────────────────────────────────────────────
export const DOCUMENT_TYPES = {
  ELECTRICITY_BILL:    'electricity_bill',
  DIESEL_INVOICE:      'diesel_invoice',
  COAL_INVOICE:        'coal_invoice',
  WATER_BILL:          'water_bill',
  GAS_BILL:            'gas_bill',
  LPG_BILL:            'lpg_bill',
  STEAM_BILL:          'steam_bill',
  REC:                 'rec',
  TRANSPORT_INVOICE:   'transport_invoice',
  MATERIAL_INVOICE:    'material_invoice',
  UNKNOWN:             'unknown',
};

export const DOCUMENT_TYPE_LIST = Object.values(DOCUMENT_TYPES);

// ─── Document Pipeline Statuses ───────────────────────────────────────────────
export const DOC_STATUS = {
  QUEUED:        'queued',
  OCR:           'ocr_processing',
  EXTRACTING:    'ai_extracting',
  DONE:          'done',
  FAILED:        'failed',
};

// ─── Approval Statuses ────────────────────────────────────────────────────────
export const APPROVAL_STATUS = {
  PENDING:   'pending',
  APPROVED:  'approved',
  REJECTED:  'rejected',
};

// ─── OCR Methods ──────────────────────────────────────────────────────────────
export const OCR_METHOD = {
  PDF_PARSE:  'pdf-parse',
  TESSERACT:  'tesseract',
  PADDLE:     'paddle',
};

// ─── Known Vendors ────────────────────────────────────────────────────────────
export const KNOWN_VENDORS = {
  ELECTRICITY: [
    'Tata Power', 'Adani Electricity', 'BSES Rajdhani', 'BSES Yamuna',
    'MSEDCL', 'BESCOM', 'TNEB', 'WBSEDCL', 'PSPCL', 'UPPCL',
    'Reliance Energy', 'Torrent Power', 'CESC', 'DHBVN', 'UHBVN',
  ],
  DIESEL: ['IOCL', 'BPCL', 'HPCL', 'Essar Oil', 'Reliance Petroleum', 'Shell'],
  COAL:   ['Coal India', 'Singareni', 'SECL', 'MCL', 'WCL', 'ECL', 'BCCL', 'CCL', 'NCL'],
  WATER:  ['Delhi Jal Board', 'BMC Water', 'MCGM', 'BWSSB', 'CMWSSB'],
  GAS:    ['IGL', 'MGL', 'GAIL', 'Adani Gas', 'Torrent Gas', 'Gujarat Gas'],
};

// ─── Mandatory Fields Per Document Type ───────────────────────────────────────
export const MANDATORY_FIELDS = {
  electricity_bill: [
    'utility_provider', 'consumer_number', 'billing_period',
    'bill_date', 'units_kwh', 'total_amount',
  ],
  diesel_invoice: [
    'supplier_name', 'invoice_number', 'invoice_date',
    'quantity_litres', 'rate_per_litre', 'total_amount',
  ],
  coal_invoice: [
    'supplier_name', 'invoice_number', 'invoice_date',
    'coal_grade', 'quantity_tonnes', 'total_amount',
  ],
  water_bill: [
    'supplier_name', 'billing_period', 'consumption_volume', 'unit', 'total_amount',
  ],
  gas_bill: [
    'supplier_name', 'billing_period', 'consumption_scm', 'total_amount',
  ],
  lpg_bill: [
    'supplier_name', 'invoice_number', 'invoice_date', 'quantity_kg', 'total_amount',
  ],
  steam_bill: ['supplier_name', 'billing_period', 'consumption_mt', 'total_amount'],
  rec:        ['certificate_number', 'issue_date', 'energy_kwh', 'total_amount'],
  transport_invoice: ['supplier_name', 'invoice_number', 'invoice_date', 'total_amount'],
  material_invoice: ['supplier_name', 'invoice_number', 'invoice_date', 'total_amount'],
};

// ─── Allowed MIME types ───────────────────────────────────────────────────────
export const ALLOWED_MIME_TYPES = [
  'application/pdf', 'image/png', 'image/jpeg', 'image/jpg',
];

export const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'];

// ─── Roles ────────────────────────────────────────────────────────────────────
export const ROLES = { ADMIN: 'admin', USER: 'user' };

// ─── OCR Quality Threshold ────────────────────────────────────────────────────
export const OCR_MIN_CHAR_THRESHOLD = 100;