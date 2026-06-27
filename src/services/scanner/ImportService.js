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
   * Converts a scanned credit card
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
}
