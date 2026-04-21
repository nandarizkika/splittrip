export function computeSettlements(expenses) {
  const balance = {}

  for (const expense of expenses) {
    const { amount, paidBy, payerIncluded, splitAmong, perPersonAmounts } = expense

    balance[paidBy] = (balance[paidBy] || 0) + amount

    if (perPersonAmounts && Object.keys(perPersonAmounts).length > 0) {
      for (const [person, personAmount] of Object.entries(perPersonAmounts)) {
        balance[person] = (balance[person] || 0) - personAmount
      }
    } else {
      const people = payerIncluded
        ? [...new Set([paidBy, ...splitAmong])]
        : [...splitAmong]
      const baseShare = Math.floor(amount / people.length)
      const remainder = amount - baseShare * people.length
      for (let k = 0; k < people.length; k++) {
        const personShare = k === 0 ? baseShare + remainder : baseShare
        balance[people[k]] = (balance[people[k]] || 0) - personShare
      }
    }
  }

  const creditors = Object.entries(balance)
    .filter(([, b]) => b > 0)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)

  const debtors = Object.entries(balance)
    .filter(([, b]) => b < 0)
    .map(([name, amount]) => ({ name, amount: -amount }))
    .sort((a, b) => b.amount - a.amount)

  const settlements = []
  let i = 0
  let j = 0

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i]
    const debtor = debtors[j]
    const amount = Math.min(creditor.amount, debtor.amount)
    settlements.push({ from: debtor.name, to: creditor.name, amount })
    creditor.amount -= amount
    debtor.amount -= amount
    if (creditor.amount === 0) i++
    if (debtor.amount === 0) j++
  }

  return settlements
}
