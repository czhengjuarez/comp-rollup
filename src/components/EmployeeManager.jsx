import { useState } from 'react'
import EmployeeForm from './EmployeeForm'
import EmployeeList from './EmployeeList'

const EmployeeManager = ({ employees, onAddEmployee, onUpdateEmployee, onDeleteEmployee, budgetSettings }) => {
  const [showForm, setShowForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)

  const handleAddEmployee = (employee) => {
    onAddEmployee(employee)
    setShowForm(false)
  }

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee)
    setShowForm(true)
  }

  const handleUpdateEmployee = (employee) => {
    onUpdateEmployee(editingEmployee.id, employee)
    setEditingEmployee(null)
    setShowForm(false)
  }

  const handleCancelEdit = () => {
    setEditingEmployee(null)
    setShowForm(false)
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Employee Management</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 font-medium"
        >
          Add Employee
        </button>
      </div>

      {showForm && (
        <div className="mb-6">
          <EmployeeForm
            employee={editingEmployee}
            onSubmit={editingEmployee ? handleUpdateEmployee : handleAddEmployee}
            onCancel={handleCancelEdit}
            budgetSettings={budgetSettings}
          />
        </div>
      )}

      <EmployeeList
        employees={employees}
        onEdit={handleEditEmployee}
        onDelete={onDeleteEmployee}
        budgetSettings={budgetSettings}
      />
    </div>
  )
}

export default EmployeeManager
