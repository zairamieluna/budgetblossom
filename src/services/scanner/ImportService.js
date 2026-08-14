/**
 * ImportService.js
 *
 * Budget Blossom
 * Converts OCR results into
 * Budget Blossom objects.
 */

export default class ImportService {
  /**
   * Converts a scanned receipt
   * into an Expense.
   */
  static receiptToExpense(document) {
    const fields = document?.fields ?? {};

    return {
      id: crypto.randomUUID(),

      title:
        fields.merchant ||
        "Scanned Receipt",

      category: "Uncategorized",

      amount:
        Number(fields.total) || 0,

      due:
        fields.date || "",

      paid: true,

      notes:
        "Imported using Smart Scan",

      createdAt:
        new Date().toISOString(),
    };
  }

  /**
   * Converts a scanned credit card statement
   * into updated card values.
   */
  static receiptToCard(document) {
    const fields = document?.fields ?? {};

    return {
      balance:
        Number(fields.balance) || 0,

      creditLimit:
        Number(fields.creditLimit) || 0,

      availableCredit:
        Number(fields.availableCredit) || 0,

      minimumPayment:
        Number(fields.minimumPayment) || 0,

      dueDate:
        fields.dueDate || "",
    };
  }

  /**
   * Converts a scanned income/paystub
   * into the SAME pooled-income structure
   * used by Income.jsx.
   *
   * Income.jsx stores pool entries as:
   *
   * {
   *   src,
   *   amt,
   *   gross,
   *   date,
   *   person
   * }
   */
  static incomeToIncome(document) {
    const fields = document?.fields ?? {};

    const netPay =
      Number(fields.netPay) ||
      Number(fields.amount) ||
      Number(fields.total) ||
      0;

    const grossPay =
      Number(fields.grossPay) ||
      netPay;

    const source =
      fields.employer ||
      fields.source ||
      "Imported Income";

    const person =
      fields.employee ||
      fields.person ||
      "Zai";

    const date =
      fields.payDate ||
      fields.date ||
      new Date().toISOString().split("T")[0];

    return {
      src: `${person} — ${source} (Smart Scan)`,

      amt: netPay,

      gross: grossPay,

      date,

      person,
    };
  }
}
