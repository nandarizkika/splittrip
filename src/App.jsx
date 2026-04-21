import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import IdentitySelection from './pages/IdentitySelection'
import ExpenseList from './pages/ExpenseList'
import TripSettings from './pages/TripSettings'
import AddEditExpense from './pages/AddEditExpense'
import Settlement from './pages/Settlement'
import SplitBill from './pages/SplitBill'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/trip/:tripId/identity" element={<IdentitySelection />} />
      <Route path="/trip/:tripId" element={<ExpenseList />} />
      <Route path="/trip/:tripId/settings" element={<TripSettings />} />
      <Route path="/trip/:tripId/add" element={<AddEditExpense />} />
      <Route path="/trip/:tripId/edit/:expenseId" element={<AddEditExpense />} />
      <Route path="/trip/:tripId/settlement" element={<Settlement />} />
      <Route path="/trip/:tripId/splitbill" element={<SplitBill />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
