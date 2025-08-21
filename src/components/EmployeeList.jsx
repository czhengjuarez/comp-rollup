import { useState } from 'react'

const EmployeeList = ({ employees, onEdit, onDelete, budgetSettings }) => {
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
              <tr key={employee.id} className={employee.flagged ? 'bg-red-50' : ''}>
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
                    <div>Stock: {formatWithUSDConversion(employee.proposedStock, employee.currency || 'USD')}</div>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-xs">
                    <div className={`font-medium ${
                      (employee.proposedIncrease / employee.currentBaseSalary * 100) > 10 ? 'text-red-600' : 
                      (employee.proposedIncrease / employee.currentBaseSalary * 100) > 5 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {((employee.proposedIncrease || 0) / employee.currentBaseSalary * 100).toFixed(1)}%
                    </div>
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
                      onClick={() => onEdit(employee)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(employee.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default EmployeeList
