// ─── UI pricing plans (landing page & billing UI) ─────────────────────────────

export interface PricingPlan {
  id:            string;
  name:          string;
  badge:         string | null;
  monthlyPrice:  number;
  yearlyPrice:   number | null;
  yearlySavings: number | null;
  description:   string;
  features:      string[];
  cta:           string;
  ctaHref:       string;
  highlighted:   boolean;
  free:          boolean;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id:            "basic",
    name:          "Basic",
    badge:         null,
    monthlyPrice:  9,
    yearlyPrice:   79,
    yearlySavings: 29,
    description:   "For freelancers just getting started.",
    features: [
      "5 clients",
      "20 invoices per month",
      "PDF download & email",
      "Payment tracking",
      "Basic support",
    ],
    cta:         "Start free trial",
    ctaHref:     "/register",
    highlighted: false,
    free:        false,
  },
  {
    id:            "pro",
    name:          "Pro",
    badge:         "Most popular",
    monthlyPrice:  19,
    yearlyPrice:   190,
    yearlySavings: 38,
    description:   "For active freelancers and solo consultants.",
    features: [
      "Unlimited clients",
      "Unlimited invoices",
      "AI invoice generation",
      "Expense tracking & P&L reports",
      "Recurring invoices",
      "Invoice templates",
      "Multi-currency support",
      "PDF branded with your logo",
      "Email delivery + tracking",
      "Overdue reminders",
      "Revenue analytics",
    ],
    cta:         "Start free trial",
    ctaHref:     "/register",
    highlighted: true,
    free:        false,
  },
  {
    id:            "agency",
    name:          "Agency",
    badge:         "For Teams",
    monthlyPrice:  39,
    yearlyPrice:   390,
    yearlySavings: 78,
    description:   "For agencies and teams billing multiple clients.",
    features: [
      "Everything in Pro",
      "Multiple team members",
      "Multi-org management",
      "White-label PDFs",
      "API access",
      "Dedicated support",
    ],
    cta:         "Start free trial",
    ctaHref:     "/register",
    highlighted: false,
    free:        false,
  },
];
