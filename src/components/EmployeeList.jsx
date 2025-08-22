import React, { useState } from 'react'
import EmployeeForm from './EmployeeForm'

const EmployeeList = ({ employees, onEdit, onDelete, budgetSettings, onUpdateEmployee }) => {
  // Fixed exchange rates to USD
  const EXCHANGE_RATES = {
    USD: 1.0,
    GBP: 1.25,
    EUR: 1.08
  }

  const formatCurrency = (amount, currency = 'USD') => {
    const symbols = { USD: '$', GBP: '£', EUR: '€' }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace(/[A-Z]{3}/, symbols[currency])
  }

  const formatWithUSDConversion = (amount, currency) => {
    if (currency === 'USD') {
      return formatCurrency(amount, currency)
    }
    const usdAmount = amount * EXCHANGE_RATES[currency]
    return `${formatCurrency(amount, currency)} (~$${usdAmount.toLocaleString()})`
  }
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [editingField, setEditingField] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [expandedEmployeeId, setExpandedEmployeeId] = useState(null)

  const sortedEmployees = [...employees].sort((a, b) => {
    let aValue = a[sortBy]
    let bValue = b[sortBy]
    
    if (sortBy === 'totalIncreasePercent') {
      aValue = a.totalIncreasePercent || 0
      bValue = b.totalIncreasePercent || 0
    }
    
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase()
      bValue = bValue.toLowerCase()
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }


  const handlePercentageEdit = (employee) => {
    const currentPercentage = ((employee.proposedIncrease || 0) / employee.currentBaseSalary * 100).toFixed(1)
    setEditingField(`percentage-${employee.id}`)
    setEditValue(currentPercentage)
  }

  const handlePercentageSave = (employee) => {
    const newPercentage = parseFloat(editValue)
    if (!isNaN(newPercentage) && newPercentage >= 0) {
      const newProposedIncrease = (employee.currentBaseSalary * newPercentage) / 100
      const newProposedBaseSalary = employee.currentBaseSalary + newProposedIncrease
      
      // Calculate market positions
      let afterIncreaseMarketPosition = null
      let nextLevelMarketPosition = null
      
      if (newProposedBaseSalary && employee.currentLevelMidpoint) {
        afterIncreaseMarketPosition = ((newProposedBaseSalary / employee.currentLevelMidpoint) * 100).toFixed(1)
      }
      
      if (employee.hasPromotion && newProposedBaseSalary && employee.nextLevelMidpoint) {
        nextLevelMarketPosition = ((newProposedBaseSalary / employee.nextLevelMidpoint) * 100).toFixed(1)
      }
      
      let updatedEmployee = {
        ...employee,
        proposedBaseSalary: newProposedBaseSalary,
        proposedIncrease: newProposedIncrease,
        totalIncreasePercent: newPercentage,
        afterIncreaseMarketPosition: afterIncreaseMarketPosition,
        nextLevelMarketPosition: nextLevelMarketPosition
      }
      
      // Split percentage between merit and promotion if employee has promotion
      if (employee.hasPromotion) {
        const halfPercent = newPercentage / 2
        updatedEmployee = {
          ...updatedEmployee,
          meritIncrease: halfPercent,
          promotionIncrease: halfPercent,
          meritPercent: halfPercent,
          promotionPercent: halfPercent
        }
      } else {
        updatedEmployee = {
          ...updatedEmployee,
          meritIncrease: newPercentage,
          meritPercent: newPercentage,
          promotionIncrease: 0,
          promotionPercent: 0
        }
      }
      
      onUpdateEmployee(updatedEmployee)
    }
    setEditingField(null)
    setEditValue('')
  }

  const handleStockEdit = (employee) => {
    setEditingField(`stock-${employee.id}`)
    setEditValue(employee.proposedStock.toString())
  }

  const handleStockSave = (employee) => {
    const newStock = parseFloat(editValue)
    if (!isNaN(newStock) && newStock >= 0) {
      const updatedEmployee = {
        ...employee,
        proposedStock: newStock
      }
      
      onUpdateEmployee(updatedEmployee)
    }
    setEditingField(null)
    setEditValue('')
  }

  const handleInlineEdit = (employee) => {
    if (expandedEmployeeId === employee.id) {
      setExpandedEmployeeId(null) // Close if already open
    } else {
      setExpandedEmployeeId(employee.id) // Open inline edit
    }
  }

  const handleInlineUpdate = (updatedEmployee) => {
    onUpdateEmployee(updatedEmployee)
    setExpandedEmployeeId(null) // Close after update
  }

  const handleInlineCancel = () => {
    setExpandedEmployeeId(null)
  }

  const SortButton = ({ field, children }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center space-x-1 text-left font-medium text-gray-700 hover:text-gray-900"
    >
      <span>{children}</span>
      {sortBy === field && (
        <span className="text-xs">
          {sortOrder === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </button>
  )

  if (employees.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No employees added yet. Click "Add Employee" to get started.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <SortButton field="name">Name</SortButton>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <SortButton field="currentLevel">Current Level</SortButton>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Next Level
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Current Comp
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Proposed Increase
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Proposed Comp
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <SortButton field="totalIncreasePercent">Increase %</SortButton>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedEmployees.map((employee) => {
            const currentTotal = employee.currentBaseSalary + employee.currentStock
            const proposedTotal = employee.proposedBaseSalary + employee.proposedStock
            const increase = proposedTotal - currentTotal
            
            return (
              <React.Fragment key={employee.id}>
                <tr className={employee.flagged ? 'bg-red-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-xs font-medium text-gray-900">
                        {employee.name}
                      </div>
                      {employee.hasPromotion && (
                        <div className="text-xs text-blue-600">
                          🎉 Total Increase: {((employee.proposedIncrease || 0) / employee.currentBaseSalary * 100).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-xs text-gray-900">
                    <div className="font-medium">{employee.currentLevel || 'P1'}</div>
                    {employee.currentMarketingPosition && (
                      <div className="text-xs text-gray-500">
                        Current: {employee.currentMarketingPosition}% market
                      </div>
                    )}
                    {employee.afterIncreaseMarketPosition && (
                      <div className="text-xs text-blue-600">
                        After: {employee.afterIncreaseMarketPosition}% market
                      </div>
                    )}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={`text-sm ${employee.hasPromotion ? 'bg-yellow-50 border border-yellow-200 rounded px-2 py-1' : 'text-gray-900'}`}>
                    {employee.hasPromotion ? (
                      <>
                        <div className="font-medium">{employee.nextLevel || 'P2'}</div>
                        {employee.nextLevelMarketPosition && (
                          <div className="text-xs text-green-600">
                            {employee.nextLevelMarketPosition}% market
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-gray-500">-</div>
                    )}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-900">
                  <div>
                    {formatWithUSDConversion(employee.currentBaseSalary, employee.currency || 'USD')}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-900">
                  <div>
                    <div className="font-medium text-blue-600">
                      {formatWithUSDConversion(employee.proposedIncrease || 0, employee.currency || 'USD')}
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-900">
                  <div>
                    <div>Base: {formatWithUSDConversion(employee.proposedBaseSalary, employee.currency || 'USD')}</div>
                    <div className="flex items-center">
                      <span>Stock: </span>
                      {editingField === `stock-${employee.id}` ? (
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleStockSave(employee)}
                          onKeyPress={(e) => e.key === 'Enter' && handleStockSave(employee)}
                          className="ml-1 w-20 px-1 py-0.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                        />
                      ) : (
                        <span 
                          className="ml-1 cursor-pointer hover:bg-blue-50 hover:text-blue-700 px-1 py-0.5 rounded transition-colors"
                          onClick={() => handleStockEdit(employee)}
                          title="Click to edit stock amount"
                        >
                          {formatWithUSDConversion(employee.proposedStock, employee.currency || 'USD')}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-xs">
                    {editingField === `percentage-${employee.id}` ? (
                      <input
                        type="number"
                        step="0.1"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handlePercentageSave(employee)}
                        onKeyPress={(e) => e.key === 'Enter' && handlePercentageSave(employee)}
                        className="w-16 px-1 py-0.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <div 
                        className={`font-medium cursor-pointer hover:bg-blue-50 px-1 py-0.5 rounded transition-colors ${
                          (employee.proposedIncrease / employee.currentBaseSalary * 100) > 10 ? 'text-red-600 hover:text-red-700' : 
                          (employee.proposedIncrease / employee.currentBaseSalary * 100) > 5 ? 'text-yellow-600 hover:text-yellow-700' : 'text-green-600 hover:text-green-700'
                        }`}
                        onClick={() => handlePercentageEdit(employee)}
                        title="Click to edit increase percentage"
                      >
                        {((employee.proposedIncrease || 0) / employee.currentBaseSalary * 100).toFixed(1)}%
                      </div>
                    )}
                    {employee.meritPercent > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        Merit: {employee.meritPercent.toFixed(1)}%
                        {employee.promotionPercent > 0 && (
                          <span className="ml-1">
                            | Promotion: {employee.promotionPercent.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-xs font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleInlineEdit(employee)}
                      className="text-indigo-600 hover:text-indigo-900 cursor-pointer"
                    >
                      {expandedEmployeeId === employee.id ? 'Close' : 'Edit'}
                    </button>
                    <button
                      onClick={() => onDelete(employee.id)}
                      className="text-red-600 hover:text-red-900 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </td>
                </tr>
                {expandedEmployeeId === employee.id && (
                  <tr>
                    <td colSpan="8" className="px-0 py-0">
                      <div className="bg-gray-50 border-t border-gray-200">
                        <EmployeeForm
                          employee={employee}
                          onSubmit={handleInlineUpdate}
                          onCancel={handleInlineCancel}
                          budgetSettings={budgetSettings}
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default EmployeeList
