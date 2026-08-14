/**
 * FieldExtractor.js
 *
 * Budget Blossom
 * Smart Field Extraction Engine
 *
 * V2
 *
 * Supports:
 *   • Credit card
 *   • Receipt
 *   • Income / pay stub
 *   • Statement
 */

function extractMoney(text, label) {
  const regex = new RegExp(
    `${label}[\\s:$]*([0-9,]+\\.?[0-9]*)`,
    "i"
  );

  const match = text.match(regex);

  if (!match) return null;

  return Number(
    match[1].replace(/,/g, "")
  );
}

function extractDate(text, label) {
  const regex = new RegExp(
    `${label}[\\s:]*([A-Za-z0-9 ,/\\-]+)`,
    "i"
  );

  const match = text.match(regex);

  return match ? match[1].trim() : null;
}

function extractText(text, labels) {
  for (const label of labels) {
    const regex = new RegExp(
      `${label}[\\s:]+([^\\n\\r]+)`,
      "i"
    );

    const match = text.match(regex);

    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

function extractFirstMoney(text, labels) {
  for (const label of labels) {
    const value = extractMoney(text, label);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function extractIncomeFields(text) {
  /*
   * Net income is the most useful number for Budget Blossom
   * because this is the amount that actually enters the
   * Budget Pool.
   *
   * We try several common pay-stub labels.
   */

  const netPay = extractFirstMoney(text, [
    "net pay",
    "net earnings",
    "take home pay",
    "take-home pay",
    "net amount",
    "net income",
  ]);

  const grossPay = extractFirstMoney(text, [
    "gross pay",
    "gross earnings",
    "gross amount",
    "total earnings",
    "regular earnings",
  ]);

  const hourlyRate = extractFirstMoney(text, [
    "hourly rate",
    "pay rate",
    "rate",
  ]);

  const employer = extractText(text, [
    "employer",
    "company",
  ]);

  const employee = extractText(text, [
    "employee name",
    "employee",
    "name",
  ]);

  const payDate =
    extractDate(text, "pay date") ||
    extractDate(text, "payment date") ||
    extractDate(text, "date paid");

  const payPeriod =
    extractText(text, [
      "pay period",
      "pay period ending",
      "period ending",
    ]);

  return {
    employer,
    employee,

    /*
     * This is the amount that should normally be imported
     * into Budget Blossom's income pool.
     */
    amount: netPay ?? grossPay ?? 0,

    netPay,
    grossPay,
    hourlyRate,

    payDate,
    payPeriod,

    source: "Smart Scan",
  };
}

export function extractFields(
  documentType,
  text = ""
) {
  switch (documentType) {

    case "credit-card":
      return {
        bank: null,

        cardName: null,

        balance: extractMoney(
          text,
          "statement balance"
        ),

        creditLimit: extractMoney(
          text,
          "credit limit"
        ),

        availableCredit: extractMoney(
          text,
          "available credit"
        ),

        minimumPayment: extractMoney(
          text,
          "minimum payment"
        ),

        dueDate: extractDate(
          text,
          "payment due"
        ),
      };

    case "receipt":
      return {
        merchant: null,

        subtotal: extractMoney(
          text,
          "subtotal"
        ),

        tax: extractMoney(
          text,
          "tax"
        ),

        total: extractMoney(
          text,
          "total"
        ),

        date: extractDate(
          text,
          "date"
        ),
      };

    case "income":
      return extractIncomeFields(text);

    case "statement":
      return {
        openingBalance: extractMoney(
          text,
          "opening balance"
        ),

        closingBalance: extractMoney(
          text,
          "closing balance"
        ),

        transactions: [],
      };

    case "bank-account":
      return {
        account: null,

        balance:
          extractMoney(text, "balance") ??
          extractMoney(text, "available balance"),

        deposit: extractMoney(
          text,
          "deposit"
        ),

        withdrawal: extractMoney(
          text,
          "withdrawal"
        ),
      };

    default:
      return {};
  }
}
