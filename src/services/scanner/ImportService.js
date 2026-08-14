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
    const fields = document.fields ?? {};

    return {
      id: crypto.randomUUID(),

      title:
        fields.merchant ||
        "Scanned Receipt",

      category: "Uncategorized",

      amount:
        Number(fields.total) || 0,

      due: fields.date || "",

      paid: true,

      notes: "Imported using Smart Scan",

      createdAt:
        new Date().toISOString(),
    };
  }

  /**
   * Converts a scanned credit card statement
   * into updated card values.
   */
  static receiptToCard(document) {
    const fields = document.fields ?? {};

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
   * into a Budget Blossom Income object.
   */
  static incomeToIncome(document) {
    const fields = document.fields ?? {};

    return {
      id: crypto.randomUUID(),

      source:
        fields.employer ||
        fields.source ||
        "Imported Income",

      amount:
        Number(
          fields.amount ??
          fields.netPay ??
          fields.total
        ) || 0,

      date:
        fields.date ||
        fields.payDate ||
        new Date().toISOString().split("T")[0],

      type: "Income",

      notes: "Imported using Smart Scan",

      createdAt:
        new Date().toISOString(),
    };
  }
}
