// ─── Enums ───────────────────────────────────────────────────────────────────

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';
export type AuthProvider = 'email' | 'google' | 'microsoft';
export type InvoiceStatus =
  | 'draft'
  | 'pending_approval'
  | 'sent'
  | 'viewed'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'void';
export type EstimateStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'declined'
  | 'expired';
export type ProformaStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'converted'
  | 'expired';
export type OrgCategory = 'service' | 'trading';
export type TaxType = 'vat' | 'gst' | 'sales_tax' | 'none';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentMethod =
  | 'bank_transfer'
  | 'card'
  | 'cash'
  | 'check'
  | 'paypal'
  | 'crypto'
  | 'other';
export type PaymentGateway = 'stripe' | 'paypal' | 'razorpay' | 'manual';
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'unpaid';
export type BillingCycle = 'monthly' | 'annual';
export type EmailStatus =
  | 'queued'
  | 'sent'
  | 'failed'
  | 'bounced'
  | 'opened'
  | 'clicked';
export type AiFeature =
  | 'invoice_generation'
  | 'email_draft'
  | 'data_extraction'
  | 'line_item_suggestion'
  | 'payment_reminder'
  | 'analytics_summary';
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'restore'
  | 'send'
  | 'pay'
  | 'void'
  | 'cancel'
  | 'login'
  | 'logout';
export type ExpenseCategory =
  | 'software'
  | 'marketing'
  | 'salaries'
  | 'office'
  | 'travel'
  | 'professional_services'
  | 'equipment'
  | 'utilities'
  | 'other';

// ─── Row types ────────────────────────────────────────────────────────────────

export interface OrgPaymentInstruction {
  name:    string;
  content: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  category: OrgCategory;
  default_currency: string;
  timezone: string;
  locale: string;
  tax_registration_number: string | null;
  logo_url: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country_code: string | null;
  website: string | null;
  invoice_prefix: string;
  invoice_number_format: string;
  email_prefix: string | null;
  next_invoice_number: number;
  next_proforma_number: number;
  payment_instructions: OrgPaymentInstruction[];
  trial_ends_at: string | null;
  freepass_plan: string | null;
  freepass_until: string | null;
  auto_reminders_enabled: boolean;
  reminder_offsets: number[];
  late_fee_enabled: boolean;
  late_fee_percentage: number;
  late_fee_after_days: number;
  active_email_provider: EmailConnectionProvider | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type EmailConnectionProvider = 'google' | 'microsoft';
export type EmailConnectionStatus   = 'pending' | 'connected' | 'error' | 'revoked';

export interface OrgEmailConnection {
  id: string;
  organization_id: string;
  provider: EmailConnectionProvider;
  client_id: string;
  client_secret: string; // encrypted at rest — never send to the client
  tenant_id: string | null;
  connected_email: string | null;
  from_email: string | null; // optional override for the send-as address; null = use connected_email
  refresh_token: string | null; // encrypted at rest — never send to the client
  access_token: string | null;  // encrypted at rest — never send to the client
  access_token_expires_at: string | null;
  status: EmailConnectionStatus;
  last_error: string | null;
  oauth_state: string | null;
  oauth_state_expires_at: string | null;
  connected_by: string | null;
  connected_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string; // references auth.users(id)
  organization_id: string | null; // null until onboarding complete
  email: string;
  name: string;
  role: UserRole;
  auth_provider: AuthProvider;
  avatar_url: string | null;
  is_active: boolean;
  is_invoice_approver: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Client {
  id: string;
  organization_id: string;
  created_by: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country_code: string | null;
  preferred_currency: string | null;
  preferred_language: string | null;
  tax_registration_number: string | null;
  notes: string | null;
  cc_emails: string[];
  portal_token: string | null;
  portal_otp: string | null;
  portal_otp_expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Invoice {
  id: string;
  organization_id: string;
  client_id: string;
  created_by: string | null;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  currency: string;
  exchange_rate: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  amount_due: number;
  tax_type: TaxType;
  tax_rate: number;
  tax_registration_number: string | null;
  payment_instructions: string | null;
  locale: string | null;
  notes: string | null;
  terms: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  paid_at: string | null;
  last_reminder_sent_at: string | null;
  late_fee_applied_at: string | null;
  share_token: string | null;
  // Trading-category fields
  shipping_terms: string | null;
  po_reference: string | null;
  local_transport_amount: number;
  is_simplified: boolean;
  source_proforma_id: string | null;
  client_subunit_id: string | null;
  // Approval workflow (Agency plan)
  submitted_for_approval_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_note: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  organization_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number | null;
  tax_amount: number;
  discount_amount: number;
  subtotal: number;
  total: number;
  sort_order: number;
  // Trading-category fields
  hs_code: string | null;
  country_of_origin: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  organization_id: string;
  invoice_id: string;
  client_id: string;
  created_by: string | null;
  amount: number;
  currency: string;
  exchange_rate: number;
  payment_method: PaymentMethod;
  payment_date: string;
  reference: string | null;
  notes: string | null;
  status: PaymentStatus;
  gateway: PaymentGateway;
  gateway_transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  organization_id: string;
  plan_name: string;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  trial_end: string | null;
  billing_cycle: BillingCycle;
  amount: number;
  currency: string;
  gateway: PaymentGateway;
  gateway_subscription_id: string | null;
  gateway_customer_id: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailLog {
  id: string;
  organization_id: string;
  invoice_id: string | null;
  client_id: string | null;
  user_id: string | null;
  to_email: string;
  cc_emails: string[];
  subject: string;
  body: string;
  status: EmailStatus;
  provider: string | null;
  provider_message_id: string | null;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface AiRequest {
  id: string;
  organization_id: string;
  user_id: string | null;
  feature: AiFeature;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost: number;
  request_payload: unknown | null;
  response_payload: unknown | null;
  status: string;
  duration_ms: number | null;
  error_message: string | null;
  created_at: string;
}

export interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  role: UserRole;
  token: string;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  deleted_at: string | null;
}

export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurringInvoiceItem {
  description: string;
  quantity:    number;
  unit_price:  number;
}

export interface RecurringInvoice {
  id:                   string;
  organization_id:      string;
  client_id:            string;
  title:                string;
  frequency:            RecurringFrequency;
  next_issue_date:      string;
  due_days:             number;
  currency:             string;
  tax_type:             TaxType;
  tax_rate:             number;
  discount_amount:      number;
  notes:                string | null;
  payment_instructions: string | null;
  items:                RecurringInvoiceItem[];
  is_active:            boolean;
  last_issued_at:       string | null;
  total_issued:         number;
  created_at:           string;
  updated_at:           string;
  deleted_at:           string | null;
}

export interface Expense {
  id: string;
  organization_id: string;
  created_by: string | null;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: string;
  vendor: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface InvoiceTemplate {
  id: string;
  organization_id: string;
  created_by: string | null;
  name: string;
  currency: string;
  tax_type: TaxType;
  tax_rate: number;
  discount_amount: number;
  due_days: number | null;
  notes: string | null;
  payment_instructions: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface InvoiceTemplateItem {
  id: string;
  template_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  sort_order: number;
}

export interface Estimate {
  id: string;
  organization_id: string;
  client_id: string;
  created_by: string | null;
  estimate_number: string;
  status: EstimateStatus;
  issue_date: string;
  expiry_date: string | null;
  currency: string;
  subtotal: number;
  discount_amount: number;
  tax_type: TaxType;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  terms: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  responded_at: string | null;
  response_note: string | null;
  share_token: string | null;
  converted_invoice_id: string | null;
  converted_proforma_id: string | null;
  client_subunit_id: string | null;
  is_simplified: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EstimateItem {
  id: string;
  estimate_id: string;
  organization_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  total: number;
  sort_order: number;
}

export interface Proforma {
  id: string;
  organization_id: string;
  client_id: string;
  created_by: string | null;
  proforma_number: string;
  status: ProformaStatus;
  issue_date: string;
  expiry_date: string | null;
  currency: string;
  exchange_rate: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  tax_type: TaxType;
  tax_rate: number;
  shipping_terms: string | null;
  local_transport_amount: number;
  client_subunit_id: string | null;
  is_simplified: boolean;
  notes: string | null;
  terms: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  responded_at: string | null;
  response_note: string | null;
  share_token: string | null;
  converted_invoice_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProformaItem {
  id: string;
  proforma_id: string;
  organization_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  hs_code: string | null;
  country_of_origin: string | null;
  subtotal: number;
  total: number;
  sort_order: number;
}

export interface ClientSubunit {
  id: string;
  client_id: string;
  organization_id: string;
  name: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country_code: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Product {
  id: string;
  organization_id: string;
  created_by: string | null;
  name: string;
  description: string | null;
  unit_price: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AuditLog {
  id: string;
  organization_id: string;
  user_id: string | null;
  entity_type: string;
  entity_id: string;
  action: AuditAction;
  old_values: unknown | null;
  new_values: unknown | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export type EmailTemplateType = 'invoice' | 'reminder' | 'estimate';

export interface EmailTemplate {
  id:              string;
  organization_id: string;
  type:            EmailTemplateType;
  subject:         string;
  body:            string;
  created_at:      string;
  updated_at:      string;
}

// ─── Joined / derived types ───────────────────────────────────────────────────

export interface InvoiceWithClient extends Invoice {
  client: Pick<Client, 'id' | 'name' | 'email' | 'country_code'>;
}

export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[];
  client: Client;
}

// ─── Supabase Database type (used in client generics) ────────────────────────

// Row types use Record<string, any> so Supabase's postgrest-js v2 type machinery
// (GetResult / ProcessSimpleField) can resolve without hitting TypeScript's
// instantiation-depth limit. Insert/Update remain strongly typed via our interfaces.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>

export type Database = {
  public: {
    Tables: {
      organizations:         { Row: AnyRow; Insert: Omit<Organization,         'id' | 'created_at' | 'updated_at'>;             Update: Partial<Organization>;         Relationships: [] };
      users:                 { Row: AnyRow; Insert: Omit<User,                 'created_at' | 'updated_at'>;                    Update: Partial<User>;                 Relationships: [] };
      clients:               { Row: AnyRow; Insert: Omit<Client,               'id' | 'created_at' | 'updated_at'>;             Update: Partial<Client>;               Relationships: [] };
      invoices:              { Row: AnyRow; Insert: Omit<Invoice,              'id' | 'amount_due' | 'created_at' | 'updated_at'>; Update: Partial<Invoice>;           Relationships: [] };
      invoice_items:         { Row: AnyRow; Insert: Omit<InvoiceItem,          'id' | 'created_at' | 'updated_at'>;             Update: Partial<InvoiceItem>;          Relationships: [] };
      payments:              { Row: AnyRow; Insert: Omit<Payment,              'id' | 'created_at' | 'updated_at'>;             Update: Partial<Payment>;              Relationships: [] };
      subscriptions:         { Row: AnyRow; Insert: Omit<Subscription,         'id' | 'created_at' | 'updated_at'>;             Update: Partial<Subscription>;         Relationships: [] };
      email_logs:            { Row: AnyRow; Insert: Omit<EmailLog,             'id' | 'created_at'>;                            Update: Partial<EmailLog>;             Relationships: [] };
      ai_requests:           { Row: AnyRow; Insert: Omit<AiRequest,            'id' | 'total_tokens' | 'created_at'>;           Update: Partial<AiRequest>;            Relationships: [] };
      audit_logs:            { Row: AnyRow; Insert: Omit<AuditLog,             'id' | 'created_at'>;                            Update: never;                         Relationships: [] };
      invitations:           { Row: AnyRow; Insert: Omit<Invitation,           'id' | 'created_at'>;                            Update: Partial<Invitation>;           Relationships: [] };
      recurring_invoices:    { Row: AnyRow; Insert: Omit<RecurringInvoice,     'id' | 'created_at' | 'updated_at'>;             Update: Partial<RecurringInvoice>;     Relationships: [] };
      expenses:              { Row: AnyRow; Insert: Omit<Expense,              'id' | 'created_at' | 'updated_at'>;             Update: Partial<Expense>;              Relationships: [] };
      invoice_templates:     { Row: AnyRow; Insert: Omit<InvoiceTemplate,      'id' | 'created_at' | 'updated_at'>;             Update: Partial<InvoiceTemplate>;      Relationships: [] };
      invoice_template_items:{ Row: AnyRow; Insert: Omit<InvoiceTemplateItem,  'id'>;                                           Update: Partial<InvoiceTemplateItem>;  Relationships: [] };
      products:              { Row: AnyRow; Insert: Omit<Product,              'id' | 'created_at' | 'updated_at'>;             Update: Partial<Product>;              Relationships: [] };
      estimates:             { Row: AnyRow; Insert: Omit<Estimate,             'id' | 'created_at' | 'updated_at'>;             Update: Partial<Estimate>;             Relationships: [] };
      estimate_items:        { Row: AnyRow; Insert: Omit<EstimateItem,         'id'>;                                           Update: Partial<EstimateItem>;         Relationships: [] };
      email_templates:       { Row: AnyRow; Insert: Omit<EmailTemplate,        'id' | 'created_at' | 'updated_at'>;             Update: Partial<EmailTemplate>;        Relationships: [] };
    };
    Views: {};
    Functions: {
      next_invoice_number:  { Args: { p_org_id: string }; Returns: string };
      peek_invoice_number:  { Args: { p_org_id: string }; Returns: string };
      next_estimate_number: { Args: { p_org_id: string }; Returns: string };
      peek_estimate_number: { Args: { p_org_id: string }; Returns: string };
      get_user_org_id:      { Args: Record<string, never>; Returns: string | null };
    };
    Enums: {
      user_role: UserRole;
      invoice_status: InvoiceStatus;
      tax_type: TaxType;
      payment_status: PaymentStatus;
      payment_method: PaymentMethod;
      payment_gateway: PaymentGateway;
      subscription_status: SubscriptionStatus;
      billing_cycle: BillingCycle;
      email_status: EmailStatus;
      ai_feature: AiFeature;
      audit_action: AuditAction;
    };
    CompositeTypes: {};
  };
};
