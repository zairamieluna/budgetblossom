/**
 * ExpenseService.js
 *
 * Budget Blossom
 *
 * Central place for creating and
 * updating expense objects.
 */

export default class ExpenseService {
  /**
   * Creates a new expense object.
   */
  static create({
    name,
    amount,
    due,
    category = "other",
    card = "",
    payType = "banking",
    recur = "no",
    note = "",
    paid = false,
  }) {
    return {
      id: crypto.randomUUID(),

      name: name.trim(),

      amt: Number(amount),

      due,

      cat: category,

      card,

      payType,

      recur,

      note,

      paid,
    };
  }

  /**
   * Updates an existing expense.
   */
  static update(existing, changes) {
    return {
      ...existing,
      ...changes,
    };
  }

  /**
   * Toggles paid status.
   */
  static togglePaid(expense) {
    return {
      ...expense,
      paid: !expense.paid,
    };
  }
}
