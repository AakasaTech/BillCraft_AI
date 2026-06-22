// ─── Enums ───────────────────────────────────────────────────────────────────

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';
export type AuthProvider = 'email' | 'google' | 'microsoft';
export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'void';
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

// ─── Row types ────────────────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  slug: string;
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
  next_invoice_number: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
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

// ─── Joined / derived types ───────────────────────────────────────────────────

export interface InvoiceWithClient extends Invoice {
  client: Pick<Client, 'id' | 'name' | 'email' | 'country_code'>;
}

export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[];
  client: Client;
}

// ─── Supabase Database type (used in client generics) ────────────────────────

export type Database = {
  public: {
    Tables: {
      organizations: { Row: Organization; Insert: Omit<Organization, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Organization> };
      users: { Row: User; Insert: Omit<User, 'created_at' | 'updated_at'>; Update: Partial<User> };
      clients: { Row: Client; Insert: Omit<Client, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Client> };
      invoices: { Row: Invoice; Insert: Omit<Invoice, 'id' | 'amount_due' | 'created_at' | 'updated_at'>; Update: Partial<Invoice> };
      invoice_items: { Row: InvoiceItem; Insert: Omit<InvoiceItem, 'id' | 'created_at' | 'updated_at'>; Update: Partial<InvoiceItem> };
      payments: { Row: Payment; Insert: Omit<Payment, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Payment> };
      subscriptions: { Row: Subscription; Insert: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Subscription> };
      email_logs: { Row: EmailLog; Insert: Omit<EmailLog, 'id' | 'created_at'>; Update: Partial<EmailLog> };
      ai_requests: { Row: AiRequest; Insert: Omit<AiRequest, 'id' | 'total_tokens' | 'created_at'>; Update: Partial<AiRequest> };
      audit_logs: { Row: AuditLog; Insert: Omit<AuditLog, 'id' | 'created_at'>; Update: never };
    };
    Views: Record<string, never>;
    Functions: {
      next_invoice_number: { Args: { p_org_id: string }; Returns: string };
      get_user_org_id: { Args: Record<string, never>; Returns: string | null };
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
  };
};
