/**
 * calendarEngine.js
 * Pure function calendar engine — generates unified financial calendar events.
 */

const { isStatHoliday, getOntarioStatHolidays } = require("./canadaHolidays");

const EVENT_COLORS = {
  income:       "#e8a840",
  debt:         "#f06080",
  bill:         "#e8708a",
  subscription: "#c890b8",
  holiday:      "#b899a8",
};

let _idCounter = 0;
const makeId = (prefix) => `${prefix}-${++_idCounter}-${Math.random().toString(36).slice(2,7)}`;

function eventsFromShifts(shifts = []) {
  return shifts.filter(s => s && s.date).map(shift => {
    const amount = shift.amount != null ? shift.amount : (shift.hours ?? 0) * (shift.rate ?? 0);
    return {
      id: makeId("income"), title: shift.title || "Payday", date: shift.date,
      type: "income", amount: Number(amount) || 0, color: EVENT_COLORS.income,
      sourceId: shift.id ?? null, statHolidayBonus: isStatHoliday(shift.date),
    };
  });
}

function eventsFromDebts(debts = []) {
  const events = [];
  for (const debt of debts) {
    if (!debt) continue;
    const label    = debt.name || debt.title || "Debt Payment";
    const baseDate = debt.dueDate || debt.date;
    if (!baseDate) continue;
    if (!debt.recurring) {
      events.push({ id: makeId("debt"), title: label, date: baseDate, type: "debt",
        amount: Number(debt.amount) || 0, color: EVENT_COLORS.debt, sourceId: debt.id ?? null });
    } else {
      const start = new Date(debt.rangeStart || baseDate);
      const end   = new Date(debt.rangeEnd   || _defaultRangeEnd());
      const freq  = debt.frequency || "monthly";
      let cursor  = new Date(baseDate);
      while (cursor < start) cursor = _advance(cursor, freq);
      while (cursor <= end) {
        events.push({ id: makeId("debt"), title: label, date: _fmt(cursor), type: "debt",
          amount: Number(debt.amount) || 0, color: EVENT_COLORS.debt, sourceId: debt.id ?? null });
        cursor = _advance(cursor, freq);
      }
    }
  }
  return events;
}

function eventsFromExpenses(expenses = []) {
  const events = [];
  for (const expense of expenses) {
    if (!expense) continue;
    const label    = expense.name || expense.title || "Bill";
    const baseDate = expense.dueDate || expense.date;
    if (!baseDate) continue;
    if (!expense.recurring) {
      events.push({ id: makeId("bill"), title: label, date: baseDate, type: "bill",
        amount: Number(expense.amount) || 0, color: EVENT_COLORS.bill, sourceId: expense.id ?? null });
    } else {
      const start = new Date(expense.rangeStart || baseDate);
      const end   = new Date(expense.rangeEnd   || _defaultRangeEnd());
      const freq  = expense.frequency || "monthly";
      let cursor  = new Date(baseDate);
      while (cursor < start) cursor = _advance(cursor, freq);
      while (cursor <= end) {
        events.push({ id: makeId("bill"), title: label, date: _fmt(cursor), type: "bill",
          amount: Number(expense.amount) || 0, color: EVENT_COLORS.bill, sourceId: expense.id ?? null });
        cursor = _advance(cursor, freq);
      }
    }
  }
  return events;
}

function eventsFromSubscriptions(subscriptions = []) {
  const events = [];
  for (const sub of subscriptions) {
    if (!sub || sub.active === false) continue;
    const label    = sub.name || sub.title || "Subscription";
    const baseDate = sub.nextBillingDate || sub.billingDate || sub.date;
    if (!baseDate) continue;
    const freq  = sub.frequency || "monthly";
    const start = new Date(sub.rangeStart || baseDate);
    const end   = new Date(sub.rangeEnd   || _defaultRangeEnd());
    let cursor  = new Date(baseDate);
    while (cursor < start) cursor = _advance(cursor, freq);
    while (cursor <= end) {
      events.push({ id: makeId("subscription"), title: label, date: _fmt(cursor),
        type: "subscription", amount: Number(sub.amount) || 0,
        color: EVENT_COLORS.subscription, sourceId: sub.id ?? null });
      cursor = _advance(cursor, freq);
    }
  }
  return events;
}

function eventsFromStatHolidays(years = []) {
  const targetYears = years.length > 0 ? [...new Set(years.map(Number))] : [new Date().getFullYear()];
  const FIXED_NAMES = { "01-01":"New Year's Day","07-01":"Canada Day","11-11":"Remembrance Day","12-25":"Christmas Day","12-26":"Boxing Day" };
  const events = [];
  for (const year of targetYears) {
    for (const holidayDate of getOntarioStatHolidays(year)) {
      const dateStr = _fmt(holidayDate);
      const mmdd    = dateStr.slice(5);
      events.push({ id: makeId("holiday"), title: FIXED_NAMES[mmdd] || _resolveFloatingName(holidayDate),
        date: dateStr, type: "holiday", amount: 0, color: EVENT_COLORS.holiday, sourceId: null });
    }
  }
  return events;
}

function _resolveFloatingName(date) {
  const month = date.getUTCMonth(), day = date.getUTCDate(), dow = date.getUTCDay();
  if (month === 1 && dow === 1) return "Family Day";
  if ((month === 2 || month === 3) && dow === 5) return "Good Friday";
  if (month === 4 && dow === 1 && day <= 24) return "Victoria Day";
  if (month === 8 && dow === 1 && day <= 7)  return "Labour Day";
  if (month === 9 && dow === 1 && day >= 8 && day <= 14) return "Thanksgiving";
  return "Ontario Stat Holiday";
}

function generateCalendarEvents({ shifts=[], debts=[], expenses=[], subscriptions=[], options={} }={}) {
  _idCounter = 0;
  const { includeStatHolidays=true, rangeStart=null, rangeEnd=null } = options;

  let events = [
    ...eventsFromShifts(shifts),
    ...eventsFromDebts(debts),
    ...eventsFromExpenses(expenses),
    ...eventsFromSubscriptions(subscriptions),
  ];

  if (includeStatHolidays) {
    const years = [...new Set(events.map(e => e.date.slice(0,4)))];
    if (years.length === 0) years.push(String(new Date().getFullYear()));
    events = [...events, ...eventsFromStatHolidays(years)];
  }

  if (rangeStart) events = events.filter(e => e.date >= rangeStart);
  if (rangeEnd)   events = events.filter(e => e.date <= rangeEnd);

  const TYPE_ORDER = { income:0, debt:1, bill:2, subscription:3, holiday:4 };
  events.sort((a, b) => {
    if (a.date < b.date) return -1;
    if (a.date > b.date) return  1;
    return (TYPE_ORDER[a.type]??99) - (TYPE_ORDER[b.type]??99);
  });
  return events;
}

function _defaultRangeEnd() {
  const d = new Date(); d.setFullYear(d.getFullYear()+1); return _fmt(d);
}
function _fmt(d) { return d.toISOString().slice(0,10); }
function _advance(date, freq) {
  const d = new Date(date);
  if      (freq==="weekly")   d.setDate(d.getDate()+7);
  else if (freq==="biweekly") d.setDate(d.getDate()+14);
  else if (freq==="yearly")   d.setFullYear(d.getFullYear()+1);
  else                        d.setMonth(d.getMonth()+1);
  return d;
}

module.exports = { generateCalendarEvents, eventsFromShifts, eventsFromDebts,
  eventsFromExpenses, eventsFromSubscriptions, eventsFromStatHolidays, EVENT_COLORS };
