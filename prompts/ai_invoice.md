You are a senior AI engineer.

Design the AI workflow for converting natural language into structured invoice data.

Input example:

"Create an invoice for Acme Inc. for website redesign services, 20 hours at $75 per hour, due in 14 days."

Output schema:

{
  "client_name": "",
  "invoice_date": "",
  "due_date": "",
  "currency": "",
  "items": [
    {
      "description": "",
      "quantity": 0,
      "unit_price": 0,
      "tax_rate": 0
    }
  ],
  "payment_terms": "",
  "notes": ""
}

Requirements:

- Use OpenAI structured outputs
- Validate extracted data
- Handle missing information
- Support multiple currencies
- Support VAT and sales tax
- Support hourly and fixed-price billing
- Detect ambiguous requests
- Generate user clarification questions
- Detect currencies from natural language
- Infer country-specific tax requirements
- Suggest appropriate payment terms by region
- Generate invoice text in multiple languages
- Validate international invoice requirements


Create:

1. Prompt engineering strategy
2. Validation workflow
3. Error handling
4. Confidence scoring
5. Example prompts
6. Edge cases
7. API design