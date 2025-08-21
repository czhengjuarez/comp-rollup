import { useState, useEffect } from 'react'

const BudgetSummary = ({ employees, budgetSettings, onUpdateBudgetSettings, showOnlyBudgetAndStatus, showOnlyLevelAndFlagged }) => {
  const [isEditingBudget, setIsEditingBudget] = useState(false)
  const [tempBudgetSettings, setTempBudgetSettings] = useState(budgetSettings)

  // Update tempBudgetSettings when budgetSettings changes
  useEffect(() => {
    setTempBudgetSettings(budgetSettings)
  }, [budgetSettings])

  // Fixed exchange rates to USD
  const EXCHANGE_RATES = {
    USD: 1.0,
    GBP: 1.25,
    EUR: 1.08
  }

  // Convert amount to USD based on employee's currency
  const convertToUSD = (amount, currency) => {
    return amount * (EXCHANGE_RATES[currency] || 1.0)
  }

  // Calculate totals - separate base and stock, converted to USD
  const currentBaseTotal = employees.reduce((sum, emp) => 
    sum + convertToUSD(emp.currentBaseSalary || 0, emp.currency || 'USD'), 0)
  const currentStockTotal = employees.reduce((sum, emp) => 
    sum + convertToUSD(emp.currentStock || 0, emp.currency || 'USD'), 0)
  const proposedBaseTotal = employees.reduce((sum, emp) => 
    sum + convertToUSD(emp.proposedBaseSalary || 0, emp.currency || 'USD'), 0)
  const proposedStockTotal = employees.reduce((sum, emp) => 
    sum + convertToUSD(emp.proposedStock || 0, emp.currency || 'USD'), 0)
  
  // Calculate individual increases (using proposedIncrease field), converted to USD
  const totalIndividualBaseIncreases = employees.reduce((sum, emp) => 
    sum + convertToUSD(emp.proposedIncrease || 0, emp.currency || 'USD'), 0)
  const stockIncrease = proposedStockTotal - currentStockTotal
  const totalIncrease = totalIndividualBaseIncreases + stockIncrease
  
  // Budget calculations - based on individual increases
  const baseBudgetUsed = (totalIndividualBaseIncreases / budgetSettings.baseSalaryIncreaseAllowance) * 100
  const stockBudgetUsed = (stockIncrease / budgetSettings.stockIncreaseAllowance) * 100
  
  const maxAllowedBaseIncrease = budgetSettings.baseSalaryIncreaseAllowance * (1 + budgetSettings.maxOverBudget / 100)
  const maxAllowedStockIncrease = budgetSettings.stockIncreaseAllowance * (1 + budgetSettings.maxOverBudget / 100)
  
  const isBaseOverBudget = totalIndividualBaseIncreases > maxAllowedBaseIncrease
  const isStockOverBudget = stockIncrease > maxAllowedStockIncrease
  const isOverBudget = isBaseOverBudget || isStockOverBudget
  
  const baseBudgetRemaining = budgetSettings.baseSalaryIncreaseAllowance - totalIndividualBaseIncreases
  const stockBudgetRemaining = budgetSettings.stockIncreaseAllowance - stockIncrease

  // Employee level breakdown - fix field reference, convert to USD
  const levelBreakdown = employees.reduce((acc, emp) => {
    const level = emp.currentLevel || 'undefined'
    if (!acc[level]) {
      acc[level] = { count: 0, current: 0, proposed: 0, totalIncreasePercent: 0 }
    }
    acc[level].count++
    // Only use base salary for calculations
    acc[level].current += convertToUSD(emp.currentBaseSalary || 0, emp.currency || 'USD')
    acc[level].proposed += convertToUSD(emp.proposedBaseSalary || 0, emp.currency || 'USD')
    
    // Add individual employee's base salary increase percentage
    const currentBase = convertToUSD(emp.currentBaseSalary || 0, emp.currency || 'USD')
    const proposedBase = convertToUSD(emp.proposedBaseSalary || 0, emp.currency || 'USD')
    const individualIncreasePercent = currentBase > 0 ? ((proposedBase - currentBase) / currentBase) * 100 : 0
    acc[level].totalIncreasePercent += individualIncreasePercent
    
    return acc
  }, {})

  // Flagged employees (over 10% increase)
  const flaggedEmployees = employees.filter(emp => emp.flagged)

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const handleBudgetUpdate = () => {
    onUpdateBudgetSettings(tempBudgetSettings)
    setIsEditingBudget(false)
  }

  const handleBudgetChange = (field, value) => {
    setTempBudgetSettings(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }))
  }

  // Conditional rendering for Budget Settings and Status only
  if (showOnlyBudgetAndStatus) {
    return (
      <div className="space-y-6">
        {/* Budget Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Budget Settings</h3>
            <button
              onClick={() => setIsEditingBudget(!isEditingBudget)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {isEditingBudget ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {isEditingBudget ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base Salary Increase Allowance
                </label>
                <input
                  type="number"
                  value={tempBudgetSettings.baseSalaryIncreaseAllowance}
                  onChange={(e) => handleBudgetChange('baseSalaryIncreaseAllowance', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Increase Allowance
                </label>
                <input
                  type="number"
                  value={tempBudgetSettings.stockIncreaseAllowance}
                  onChange={(e) => handleBudgetChange('stockIncreaseAllowance', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Standard Merit %
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={tempBudgetSettings.standardMeritPercentage}
                  onChange={(e) => handleBudgetChange('standardMeritPercentage', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Over Budget %
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={tempBudgetSettings.maxOverBudget}
                  onChange={(e) => handleBudgetChange('maxOverBudget', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-3">
                <button
                  onClick={() => setIsEditingBudget(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBudgetUpdate}
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
                >
                  Update
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Base Salary Increase Allowance:</span>
                <p className="font-medium">{formatCurrency(budgetSettings.baseSalaryIncreaseAllowance)}</p>
              </div>
              <div>
                <span className="text-gray-600">Stock Increase Allowance:</span>
                <p className="font-medium">{formatCurrency(budgetSettings.stockIncreaseAllowance)}</p>
              </div>
              <div>
                <span className="text-gray-600">Standard Merit:</span>
                <p className="font-medium">{budgetSettings.standardMeritPercentage}%</p>
              </div>
              <div>
                <span className="text-gray-600">Max Over Budget:</span>
                <p className="font-medium">{budgetSettings.maxOverBudget}%</p>
              </div>
            </div>
          )}
        </div>

        {/* Budget Status */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Status</h3>
          
          {/* Exchange Rate Disclaimer */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-gray-600">
              <strong>Multi-Currency Note:</strong> All budget calculations use approximate USD conversions with fixed rates: 
              GBP = $1.25, EUR = $1.08. Individual employee displays show native currency amounts.
            </p>
          </div>
          
          <div className="space-y-4">
            {/* Base Salary Budget */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium text-gray-700">Base Salary Increase Budget</h4>
                <span className={`text-sm font-medium ${isBaseOverBudget ? 'text-red-600' : baseBudgetUsed > 90 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {baseBudgetUsed.toFixed(1)}%
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Max Total ({budgetSettings.maxOverBudget}% over):</span>
                  <span className="font-medium">{formatCurrency(maxAllowedBaseIncrease)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Allowance:</span>
                  <span className="font-medium">{formatCurrency(budgetSettings.baseSalaryIncreaseAllowance)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Used:</span>
                  <span className={`font-medium ${totalIndividualBaseIncreases < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(totalIndividualBaseIncreases)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Remaining:</span>
                  <span className={`font-medium ${baseBudgetRemaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(baseBudgetRemaining)}
                  </span>
                </div>
              </div>
              
              {isBaseOverBudget && (
                <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-md">
                  <p className="text-sm text-red-800 font-medium">
                    ⚠️ Base salary increases exceed maximum allowed budget by {formatCurrency(totalIndividualBaseIncreases - maxAllowedBaseIncrease)}
                  </p>
                </div>
              )}
            </div>

            {/* Stock Increase Budget */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium text-gray-700">Stock Increase Budget</h4>
                <span className={`text-sm font-medium ${isStockOverBudget ? 'text-red-600' : stockBudgetUsed > 90 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {stockBudgetUsed.toFixed(1)}%
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Max Total ({budgetSettings.maxOverBudget}% over):</span>
                  <span className="font-medium">{formatCurrency(maxAllowedStockIncrease)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Allowance:</span>
                  <span className="font-medium">{formatCurrency(budgetSettings.stockIncreaseAllowance)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Used:</span>
                  <span className={`font-medium ${stockIncrease < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(stockIncrease)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Remaining:</span>
                  <span className={`font-medium ${stockBudgetRemaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(stockBudgetRemaining)}
                  </span>
                </div>
              </div>
              
              {isStockOverBudget && (
                <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-md">
                  <p className="text-sm text-red-800 font-medium">
                    ⚠️ Stock increases exceed maximum allowed budget by {formatCurrency(stockIncrease - maxAllowedStockIncrease)}
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    )
  }

  // Conditional rendering for Level Breakdown and Flagged Employees only
  if (showOnlyLevelAndFlagged) {
    return (
      <div className="space-y-6">
        {/* Current Level Breakdown */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Current Level Breakdown</h3>
          
          <div className="space-y-3">
            {Object.entries(levelBreakdown).map(([level, data]) => {
              const levelIncrease = data.proposed - data.current
              const levelIncreasePercent = data.current > 0 ? (levelIncrease / data.current) * 100 : 0
              const averageIncreasePercent = data.count > 0 ? data.totalIncreasePercent / data.count : 0
              
              return (
                <div key={level} className="border rounded-md p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium capitalize">
                      {level.replace('_', ' ')} ({data.count})
                    </span>
                    <span className={`text-sm font-medium ${
                      averageIncreasePercent > 10 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      +{levelIncreasePercent.toFixed(1)}% <span className="text-xs text-gray-500">(avg)</span>
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Current:</span>
                      <span>{formatCurrency(data.current)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Proposed:</span>
                      <span>{formatCurrency(data.proposed)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Promotion Proposed */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            🎉 Promotion Proposed ({employees.filter(emp => emp.hasPromotion).length})
          </h3>
          
          {employees.filter(emp => emp.hasPromotion).length > 0 ? (
            <div className="space-y-2">
              {employees.filter(emp => emp.hasPromotion)
                .sort((a, b) => {
                  // Extract numeric part from current level (P3 -> 3, M4 -> 4)
                  const aLevel = parseInt(a.currentLevel?.replace(/[PM]/, '') || '0')
                  const bLevel = parseInt(b.currentLevel?.replace(/[PM]/, '') || '0')
                  // Sort by higher level first (descending)
                  return bLevel - aLevel
                })
                .map(emp => (
                <div key={emp.id} className="flex justify-between items-center text-sm">
                  <span className="font-medium">{emp.name}</span>
                  <div className="text-right">
                    <div className="text-gray-700">
                      {emp.currentLevel} → {emp.nextLevel}
                    </div>
                    <div className="text-xs text-gray-600">
                      (+{emp.meritIncrease || 0}% base + {emp.promotionIncrease}% promotion)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No promotions proposed.</p>
          )}
        </div>

        {/* Flagged Employees */}
        {flaggedEmployees.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-red-800 mb-4">
              ⚠️ Flagged Employees ({flaggedEmployees.length})
            </h3>
            
            <div className="space-y-2">
              {flaggedEmployees.map(emp => (
                <div key={emp.id} className="flex justify-between items-center text-sm">
                  <span className="font-medium">{emp.name}</span>
                  <span className="text-red-600">
                    +{emp.totalIncreasePercent.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
            
            <p className="text-xs text-red-600 mt-3">
              These employees have increases over 10% and require special attention.
            </p>
          </div>
        )}
      </div>
    )
  }

  // This should never be reached with the current props, but keeping as fallback
  return null
}

export default BudgetSummary
