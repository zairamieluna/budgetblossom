function extractCreditCardFields(text) {
  const normalized = normalizeText(text);

  /*
   * -------------------------------------------------------
   * BALANCE
   * -------------------------------------------------------
   *
   * Different banks/cards use different labels:
   *
   * CIBC:
   *   Amount Due $2,032.49
   *
   * Other cards:
   *   Current balance $1,170.89
   *
   * Statements:
   *   Statement balance $1,441.49
   */

  const balance = extractMoneyNearLabels(normalized, [
    "amount due",
    "statement balance",
    "statement amount",
    "statement total",
    "current balance",
    "balance owing",
    "amount owing",
    "total balance",
    "balance due",
    "new balance",
  ]);


  /*
   * -------------------------------------------------------
   * CREDIT LIMIT
   * -------------------------------------------------------
   */

  const creditLimit = extractMoneyNearLabels(normalized, [
    "credit limit",
    "total credit limit",
    "authorized credit limit",
    "approved credit limit",
    "card limit",
  ]);


  /*
   * -------------------------------------------------------
   * AVAILABLE CREDIT
   * -------------------------------------------------------
   *
   * CIBC uses:
   *   Credit Available
   *
   * Other cards may use:
   *   Available Credit
   */

  const availableCredit = extractMoneyNearLabels(normalized, [
    "credit available",
    "available credit",
    "available amount",
    "remaining credit",
    "remaining available credit",
  ]);


  /*
   * -------------------------------------------------------
   * MINIMUM PAYMENT
   * -------------------------------------------------------
   */

  const minimumPayment = extractMoneyNearLabels(normalized, [
    "minimum payment",
    "minimum payment amount",
    "minimum amount due",
    "minimum due",
    "payment due amount",
  ]);


  /*
   * -------------------------------------------------------
   * DUE DATE
   * -------------------------------------------------------
   */

  const dueDate = extractDateNearLabels(normalized, [
    "minimum payment due",
    "payment due date",
    "payment due",
    "due date",
    "due on",
  ]);


  return {
    bank: null,
    cardName: null,
    balance,
    creditLimit,
    availableCredit,
    minimumPayment,
    dueDate,
  };
}
