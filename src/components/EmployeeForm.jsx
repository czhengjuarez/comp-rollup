import { useState, useEffect } from 'react'

const EmployeeForm = ({ employee, onSubmit, onCancel, budgetSettings }) => {
  // Fixed exchange rates to USD
  const EXCHANGE_RATES = {
    USD: 1.0,
    GBP: 1.25,
    EUR: 1.08
  }

  // Currency conversion helpers
  const convertToUSD = (amount, currency) => {
    return amount * EXCHANGE_RATES[currency]
  }

  const formatCurrency = (amount, currency) => {
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
    const usdAmount = convertToUSD(amount, currency)
    return `${formatCurrency(amount, currency)} (~$${usdAmount.toLocaleString()})`
  }

  const [formData, setFormData] = useState({
    name: employee?.name || '',
    currency: employee?.currency || 'USD', // USD, GBP, EUR
    currentLevel: employee?.currentLevel || 'P1', // P1-P6, M2-M6
    nextLevel: employee?.nextLevel || 'P2', // P1-P6, M2-M6
    currentMarketingPosition: employee?.currentMarketingPosition || '', // Marketing position percentage for current level
    currentLevelMidpoint: employee?.currentLevelMidpoint || '', // 100% market position salary for current level
    nextLevelMidpoint: employee?.nextLevelMidpoint || '', // 100% market position salary for next level
    currentBaseSalary: employee?.currentBaseSalary || '',
    currentStock: employee?.currentStock || '',
    proposedIncrease: employee?.proposedIncrease || '', // The rounded increase amount
    proposedBaseSalary: employee?.proposedBaseSalary || '',
    proposedStock: employee?.proposedStock || '',
    meritIncrease: employee?.meritIncrease || budgetSettings.standardMeritPercentage,
    promotionIncrease: employee?.promotionIncrease || '',
    hasPromotion: employee?.hasPromotion || false
  })

  useEffect(() => {
    if (employee) {
      setFormData(employee)
    }
  }, [employee])

  // Auto-calculate when form loads with default merit percentage
  useEffect(() => {
    const currentBase = parseFloat(formData.currentBaseSalary) || 0
    const meritIncrease = parseFloat(formData.meritIncrease) || 0
    const promotionIncrease = formData.hasPromotion ? (parseFloat(formData.promotionIncrease) || 0) : 0
    
    // Calculate if we have a base salary and merit increase (even if proposed increase exists)
    if (currentBase > 0 && meritIncrease > 0) {
      const totalIncrease = meritIncrease + promotionIncrease
      const calculatedIncrease = currentBase * (totalIncrease / 100)
      const roundedIncrease = roundToNearest(calculatedIncrease)
      const proposedBase = currentBase + roundedIncrease
      
      // Only update if the calculated values are different from current values
      const currentProposedIncrease = parseFloat(formData.proposedIncrease) || 0
      const currentProposedBase = parseFloat(formData.proposedBaseSalary) || 0
      
      if (Math.abs(currentProposedIncrease - roundedIncrease) > 1 || 
          Math.abs(currentProposedBase - proposedBase) > 1) {
        setFormData(prev => ({
          ...prev,
          proposedIncrease: roundedIncrease.toFixed(0),
          proposedBaseSalary: proposedBase.toFixed(0)
        }))
      }
    }
  }, [formData.currentBaseSalary, formData.meritIncrease, formData.hasPromotion, formData.promotionIncrease])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    // If merit or promotion percentage changes, recalculate proposed increase
    if (name === 'meritIncrease' || name === 'promotionIncrease') {
      setTimeout(() => {
        const updatedFormData = { ...formData, [name]: value }
        const currentBase = parseFloat(updatedFormData.currentBaseSalary) || 0
        const meritIncrease = parseFloat(updatedFormData.meritIncrease) || 0
        const promotionIncrease = updatedFormData.hasPromotion ? (parseFloat(updatedFormData.promotionIncrease) || 0) : 0
        
        const totalIncrease = meritIncrease + promotionIncrease
        const calculatedIncrease = currentBase * (totalIncrease / 100)
        const roundedIncrease = roundToNearest(calculatedIncrease)
        const proposedBase = currentBase + roundedIncrease
        
        setFormData(prev => ({
          ...prev,
          proposedIncrease: roundedIncrease.toFixed(0),
          proposedBaseSalary: proposedBase.toFixed(0)
        }))
      }, 0)
    }

    // If proposed increase changes, recalculate proposed base salary and split percentages
    if (name === 'proposedIncrease') {
      setTimeout(() => {
        const currentBase = parseFloat(formData.currentBaseSalary) || 0
        const proposedIncrease = parseFloat(value) || 0
        const proposedBase = currentBase + proposedIncrease
        
        // Calculate total percentage and split between merit and promotion
        const totalPercent = currentBase > 0 ? (proposedIncrease / currentBase) * 100 : 0
        
        if (formData.hasPromotion) {
          // Split 50/50 between merit and promotion
          const halfPercent = totalPercent / 2
          setFormData(prev => ({
            ...prev,
            proposedBaseSalary: proposedBase.toFixed(0),
            meritIncrease: halfPercent.toFixed(1),
            promotionIncrease: halfPercent.toFixed(1)
          }))
        } else {
          // All goes to merit
          setFormData(prev => ({
            ...prev,
            proposedBaseSalary: proposedBase.toFixed(0),
            meritIncrease: totalPercent.toFixed(1)
          }))
        }
      }, 0)
    }
  }

  const roundToNearest = (amount) => {
    // Round increases to nearest $500 or $1000
    if (amount >= 5000) {
      return Math.round(amount / 1000) * 1000
    } else {
      return Math.round(amount / 500) * 500
    }
  }

  const calculateProposedIncrease = () => {
    const currentBase = parseFloat(formData.currentBaseSalary) || 0
    const meritIncrease = parseFloat(formData.meritIncrease) || budgetSettings.standardMeritPercentage
    const promotionIncrease = formData.hasPromotion ? (parseFloat(formData.promotionIncrease) || 0) : 0
    
    const totalIncrease = meritIncrease + promotionIncrease
    const calculatedIncrease = currentBase * (totalIncrease / 100)
    const roundedIncrease = roundToNearest(calculatedIncrease)
    const proposedBase = currentBase + roundedIncrease
    
    // When Calc is clicked, update both the increase amount AND recalculate the merit percentage
    const actualTotalPercent = currentBase > 0 ? (roundedIncrease / currentBase) * 100 : 0
    const actualMeritPercent = formData.hasPromotion ? 
      Math.max(0, actualTotalPercent - promotionIncrease) : 
      actualTotalPercent
    
    setFormData(prev => ({
      ...prev,
      proposedIncrease: roundedIncrease.toFixed(0),
      proposedBaseSalary: proposedBase.toFixed(0),
      meritIncrease: actualMeritPercent.toFixed(1)
    }))
  }

  const calculateFromProposedIncrease = () => {
    const currentBase = parseFloat(formData.currentBaseSalary) || 0
    const proposedIncrease = parseFloat(formData.proposedIncrease) || 0
    const proposedBase = currentBase + proposedIncrease
    
    setFormData(prev => ({
      ...prev,
      proposedBaseSalary: proposedBase.toFixed(0)
    }))
  }

  const calculatePercentageFromProposed = () => {
    const currentBase = parseFloat(formData.currentBaseSalary) || 0
    const proposedBase = parseFloat(formData.proposedBaseSalary) || 0
    
    if (currentBase > 0) {
      const totalIncreasePercent = ((proposedBase - currentBase) / currentBase) * 100
      
      if (formData.hasPromotion) {
        // Split the increase 50/50 between merit and promotion
        const halfIncrease = totalIncreasePercent / 2
        setFormData(prev => ({
          ...prev,
          meritIncrease: halfIncrease.toFixed(1),
          promotionIncrease: halfIncrease.toFixed(1)
        }))
      } else {
        // All increase goes to merit
        setFormData(prev => ({
          ...prev,
          meritIncrease: totalIncreasePercent.toFixed(1)
        }))
      }
    }
  }

  // Calculate marketing positions based on salary and midpoints
  const calculateMarketingPositions = () => {
    const currentSalary = parseFloat(formData.currentBaseSalary) || 0
    const proposedSalary = parseFloat(formData.proposedBaseSalary) || 0
    const currentMidpoint = parseFloat(formData.currentLevelMidpoint) || 0
    const nextMidpoint = parseFloat(formData.nextLevelMidpoint) || 0
    
    let afterIncreaseMarketPosition = null
    let nextLevelMarketPosition = null
    
    // Calculate after-increase market position based on current level
    if (proposedSalary && currentMidpoint) {
      afterIncreaseMarketPosition = ((proposedSalary / currentMidpoint) * 100).toFixed(1)
    }
    
    // Calculate next level market position if promotion
    if (formData.hasPromotion && proposedSalary && nextMidpoint) {
      nextLevelMarketPosition = ((proposedSalary / nextMidpoint) * 100).toFixed(1)
    }
    
    return { afterIncreaseMarketPosition, nextLevelMarketPosition }
  }
  
  const marketPositions = calculateMarketingPositions()
  const afterIncreaseMarketPosition = marketPositions.afterIncreaseMarketPosition
  const nextLevelMarketPosition = marketPositions.nextLevelMarketPosition

  const getCalculatedAmounts = () => {
    const currentBase = parseFloat(formData.currentBaseSalary) || 0
    const currentStock = parseFloat(formData.currentStock) || 0
    const proposedBase = parseFloat(formData.proposedBaseSalary) || 0
    const proposedStock = parseFloat(formData.proposedStock) || 0
    
    const meritIncrease = parseFloat(formData.meritIncrease) || budgetSettings.standardMeritPercentage
    const promotionIncrease = formData.hasPromotion ? (parseFloat(formData.promotionIncrease) || 0) : 0
    
    // Calculate dollar amounts from percentages
    const meritDollarAmount = currentBase * (meritIncrease / 100)
    const promotionDollarAmount = currentBase * (promotionIncrease / 100)
    const totalBaseDollarIncrease = proposedBase - currentBase
    const totalStockDollarIncrease = proposedStock - currentStock
    
    // Calculate percentages from proposed amounts
    const baseIncreasePercent = currentBase > 0 ? ((proposedBase - currentBase) / currentBase) * 100 : 0
    const stockIncreasePercent = currentStock > 0 ? ((proposedStock - currentStock) / currentStock) * 100 : 0
    
    return {
      meritDollarAmount,
      promotionDollarAmount,
      totalBaseDollarIncrease,
      totalStockDollarIncrease,
      baseIncreasePercent,
      stockIncreasePercent
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Calculate final values - only base salary for increase percentage
    const currentBase = parseFloat(formData.currentBaseSalary) || 0
    const proposedBase = parseFloat(formData.proposedBaseSalary) || 0
    const baseIncreasePercent = currentBase > 0 ? ((proposedBase - currentBase) / currentBase) * 100 : 0
    
    const employeeData = {
      ...formData,
      currentBaseSalary: parseFloat(formData.currentBaseSalary) || 0,
      currentStock: parseFloat(formData.currentStock) || 0,
      proposedIncrease: parseFloat(formData.proposedIncrease) || 0,
      proposedBaseSalary: parseFloat(formData.proposedBaseSalary) || 0,
      proposedStock: parseFloat(formData.proposedStock) || 0,
      promotionIncrease: parseFloat(formData.promotionIncrease) || 0,
      meritIncrease: parseFloat(formData.meritIncrease) || budgetSettings.standardMeritPercentage,
      totalIncreasePercent: baseIncreasePercent,
      flagged: baseIncreasePercent > 10,
      afterIncreaseMarketPosition: afterIncreaseMarketPosition,
      nextLevelMarketPosition: nextLevelMarketPosition
    }
    
    onSubmit(employeeData)
  }

  const totalIncreasePercent = () => {
    const currentBase = parseFloat(formData.currentBaseSalary) || 0
    const proposedBase = parseFloat(formData.proposedBaseSalary) || 0
    return currentBase > 0 ? ((proposedBase - currentBase) / currentBase) * 100 : 0
  }

  return (
    <div className="border rounded-lg p-6 bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">
        {employee ? 'Edit Employee' : 'Add New Employee'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-3">Basic Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency *
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
                <option value="EUR">EUR (€)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Exchange rates: GBP=1.25, EUR=1.08 to USD</p>
            </div>
          </div>
        </div>

        {/* Current Level Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-3">Current Level</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Level *
              </label>
              <select
                name="currentLevel"
                value={formData.currentLevel}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="P1">P1</option>
                <option value="P2">P2</option>
                <option value="P3">P3</option>
                <option value="P4">P4</option>
                <option value="P5">P5</option>
                <option value="P6">P6</option>
                <option value="M2">M2</option>
                <option value="M3">M3</option>
                <option value="M4">M4</option>
                <option value="M5">M5</option>
                <option value="M6">M6</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Marketing Position (%)
              </label>
              <input
                type="number"
                step="0.1"
                name="currentMarketingPosition"
                value={formData.currentMarketingPosition}
                onChange={handleChange}
                placeholder="e.g. 95.5 (100% = mid-point)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Level Midpoint Salary (100% market)
              </label>
              <input
                type="number"
                name="currentLevelMidpoint"
                value={formData.currentLevelMidpoint}
                onChange={handleChange}
                placeholder="e.g. 150000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Base Salary *
              </label>
              <input
                type="number"
                name="currentBaseSalary"
                value={formData.currentBaseSalary}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Merit Increase (%)
              </label>
              <input
                type="number"
                step="0.1"
                name="meritIncrease"
                value={formData.meritIncrease}
                onChange={handleChange}
                placeholder={`Default: ${budgetSettings.standardMeritPercentage}%`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proposed Merit Increase ($)
              </label>
              <input
                type="number"
                name="proposedMeritIncrease"
                value={formData.currentBaseSalary && formData.meritIncrease ? 
                  (parseFloat(formData.currentBaseSalary) * (parseFloat(formData.meritIncrease) / 100)).toFixed(0) : ''}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
              />
              <p className="text-xs text-gray-500 mt-1">Auto-calculated from Merit %</p>
            </div>
          </div>
        </div>

        {/* Next Level Section */}
        <div className={`border rounded-lg p-4 ${formData.hasPromotion ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center mb-3">
            <h4 className="font-medium text-gray-800 mr-4">Next Level</h4>
            <label className="flex items-center text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                name="hasPromotion"
                checked={formData.hasPromotion}
                onChange={handleChange}
                className="mr-2"
              />
              Promotion
            </label>
          </div>
          <div className="space-y-4">
            {/* First row: Next Level dropdown and Next Level Midpoint */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Next Level
                </label>
                <select
                  name="nextLevel"
                  value={formData.nextLevel}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="P1">P1</option>
                  <option value="P2">P2</option>
                  <option value="P3">P3</option>
                  <option value="P4">P4</option>
                  <option value="P5">P5</option>
                  <option value="P6">P6</option>
                  <option value="M2">M2</option>
                  <option value="M3">M3</option>
                  <option value="M4">M4</option>
                  <option value="M5">M5</option>
                  <option value="M6">M6</option>
                </select>
              </div>
              {formData.hasPromotion && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Next Level Midpoint Salary (100% market)
                  </label>
                  <input
                    type="number"
                    name="nextLevelMidpoint"
                    value={formData.nextLevelMidpoint}
                    onChange={handleChange}
                    placeholder="e.g. 180000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
            
            {/* Second row: Promotion Increase % and Promotion Increase $ */}
            {formData.hasPromotion && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Promotion Increase (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="promotionIncrease"
                    value={formData.promotionIncrease}
                    onChange={handleChange}
                    placeholder="Promotion increase %"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Promotion Increase ($)
                  </label>
                  <input
                    type="number"
                    name="promotionIncreaseAmount"
                    value={formData.currentBaseSalary && formData.promotionIncrease ? 
                      (parseFloat(formData.currentBaseSalary) * (parseFloat(formData.promotionIncrease) / 100)).toFixed(0) : ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                  />
                  <p className="text-xs text-gray-500 mt-1">Auto-calculated from Promotion %</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Proposed Changes Section */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-3">Proposed Changes</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proposed Increase (Rounded) - Total
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  name="proposedIncrease"
                  value={formData.proposedIncrease}
                  onChange={handleChange}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={calculateProposedIncrease}
                  className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                >
                  Calc
                </button>
              </div>
              {formData.currentBaseSalary && formData.proposedIncrease && (
                <div className="text-xs text-gray-600">
                  <p>Total Percentage: {((parseFloat(formData.proposedIncrease) / parseFloat(formData.currentBaseSalary)) * 100).toFixed(1)}%</p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proposed Base Salary
              </label>
              <input
                type="number"
                name="proposedBaseSalary"
                value={formData.proposedBaseSalary}
                onChange={handleChange}
                onBlur={calculatePercentageFromProposed}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">Auto-calculated: Current Base + Proposed Increase</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proposed Stock
              </label>
              <input
                type="number"
                name="proposedStock"
                value={formData.proposedStock}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {formData.currentStock && formData.proposedStock && (
                <div className="text-xs text-gray-600 mt-1">
                  <p>Increase: ${getCalculatedAmounts().totalStockDollarIncrease.toLocaleString()} ({getCalculatedAmounts().stockIncreasePercent.toFixed(1)}%)</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Market Position Analytics & Warning */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-3">Market Position Analytics & Warnings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium">Current Level ({formData.currentLevel})</div>
              <div>Market Position: {formData.currentMarketingPosition ? `${formData.currentMarketingPosition}%` : 'Not set'}</div>
              {afterIncreaseMarketPosition && (
                <div className="text-blue-600">After Increase: {afterIncreaseMarketPosition}%</div>
              )}
            </div>
            <div>
              <div className="font-medium">Next Level ({formData.nextLevel})</div>
              {formData.hasPromotion && nextLevelMarketPosition ? (
                <div className="text-green-600">Market Position: {nextLevelMarketPosition}%</div>
              ) : (
                <div className="text-gray-500">-</div>
              )}
            </div>
          </div>
        </div>

        {totalIncreasePercent() > 0 && (
          <div className={`p-3 rounded-md ${totalIncreasePercent() > 10 ? 'bg-red-100 border border-red-300' : 'bg-blue-100 border border-blue-300'}`}>
            <p className={`text-sm font-medium ${totalIncreasePercent() > 10 ? 'text-red-800' : 'text-blue-800'}`}>
              Total Increase: {totalIncreasePercent().toFixed(1)}% 
              {totalIncreasePercent() > 10 && ' ⚠️ Over 10% - Flagged for Review'}
            </p>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800"
          >
            {employee ? 'Update' : 'Add'} Employee
          </button>
        </div>
      </form>
    </div>
  )
}

export default EmployeeForm
