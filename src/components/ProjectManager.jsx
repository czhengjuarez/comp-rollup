import { useState } from 'react'

const ProjectManager = ({ onProjectLoad, currentProject, onSaveProject, onDeleteProject, autoSaveStatus, onClearAllEmployees, employees, budgetSettings }) => {
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('') // 'create' or 'load'
  const [showWarning, setShowWarning] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false)
  const [formData, setFormData] = useState({
    projectName: '',
    accessKey: '',
    confirmAccessKey: ''
  })
  const [warningAcknowledged, setWarningAcknowledged] = useState(false)

  const handleInputChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const openCreateModal = () => {
    setModalType('create')
    setShowWarning(true)
    setWarningAcknowledged(false)
    setFormData({ projectName: '', accessKey: '', confirmAccessKey: '' })
  }

  const openLoadModal = () => {
    setModalType('load')
    setShowModal(true)
    setFormData({ projectName: '', accessKey: '', confirmAccessKey: '' })
  }

  const handleWarningAcknowledge = () => {
    setWarningAcknowledged(true)
    setShowWarning(false)
    setShowModal(true)
  }

  const generateAccessKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData(prev => ({
      ...prev,
      accessKey: result,
      confirmAccessKey: result
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (modalType === 'create' && formData.accessKey !== formData.confirmAccessKey) {
      alert('Access keys do not match!')
      return
    }

    if (!formData.projectName.trim() || !formData.accessKey.trim()) {
      alert('Please fill in all fields')
      return
    }

    try {
      if (modalType === 'create') {
        // Create new project
        await onProjectLoad({
          projectName: formData.projectName.trim(),
          accessKey: formData.accessKey.trim(),
          isNew: true
        })
      } else {
        // Load existing project
        await onProjectLoad({
          projectName: formData.projectName.trim(),
          accessKey: formData.accessKey.trim(),
          isNew: false
        })
      }
      
      setShowModal(false)
      setFormData({ projectName: '', accessKey: '', confirmAccessKey: '' })
    } catch (error) {
      alert(`Error ${modalType === 'create' ? 'creating' : 'loading'} project: ${error.message}`)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setShowWarning(false)
    setShowDropdown(false)
    setFormData({ projectName: '', accessKey: '', confirmAccessKey: '' })
  }

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown)
  }

  const handleDropdownAction = (action) => {
    setShowDropdown(false)
    
    if (action === 'create') {
      setModalType('create')
      setShowModal(true)
    } else if (action === 'load') {
      setModalType('load')
      setShowModal(true)
    } else if (action === 'save') {
      if (onSaveProject) onSaveProject()
    } else if (action === 'clear') {
      setShowWarning(true)
    } else if (action === 'delete') {
      if (onDeleteProject) onDeleteProject()
    }
  }

  const handleDownloadPDF = async () => {
    setShowDownloadDropdown(false)
    
    try {
      // Import html2canvas and jsPDF dynamically
      const html2canvas = (await import('html2canvas')).default
      const jsPDF = (await import('jspdf')).default
      
      // Hide the download dropdown and manage project dropdown temporarily
      setShowDownloadDropdown(false)
      setShowDropdown(false)
      
      // Wait a moment for dropdowns to close
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Capture the entire page content
      const element = document.body
      
      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#f3f4f6', // Match the page background
        width: window.innerWidth,
        height: document.documentElement.scrollHeight,
        scrollX: 0,
        scrollY: 0
      })
      
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 210
      const pageHeight = 295
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      
      let position = 0
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }
      
      pdf.save(`${currentProject.projectName}_compensation_rollup.pdf`)
    } catch (error) {
      console.error('PDF generation failed:', error)
      alert('PDF generation failed. Please try again.')
    }
  }

  const handleDownloadCSV = () => {
    setShowDownloadDropdown(false)
    
    const csvContent = generateCSVContent()
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${currentProject.projectName}_compensation_rollup.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const generatePDFContent = () => {
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount)
    }

    const EXCHANGE_RATES = { USD: 1.0, GBP: 1.25, EUR: 1.08 }
    const convertToUSD = (amount, currency) => amount * (EXCHANGE_RATES[currency] || 1.0)

    return `
      <div style="max-width: 800px; margin: 0 auto;">
        <h1 style="text-align: center; color: #1f2937; margin-bottom: 30px;">
          Compensation Roll-Up Report
        </h1>
        <h2 style="color: #374151; margin-bottom: 20px;">
          Project: ${currentProject.projectName}
        </h2>
        
        <div style="margin-bottom: 30px;">
          <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
            Budget Summary
          </h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px;">
            <div>
              <p><strong>Base Salary Allowance:</strong> ${formatCurrency(budgetSettings.baseSalaryIncreaseAllowance)}</p>
              <p><strong>Stock Allowance:</strong> ${formatCurrency(budgetSettings.stockIncreaseAllowance)}</p>
            </div>
            <div>
              <p><strong>Standard Merit:</strong> ${budgetSettings.standardMeritPercentage}%</p>
              <p><strong>Max Over Budget:</strong> ${budgetSettings.maxOverBudget}%</p>
            </div>
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
            Employee Details
          </h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <thead>
              <tr style="background-color: #f9fafb;">
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Name</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Level</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">Current Base</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">Proposed Base</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">Increase %</th>
              </tr>
            </thead>
            <tbody>
              ${employees.map(emp => `
                <tr>
                  <td style="border: 1px solid #d1d5db; padding: 8px;">${emp.name}</td>
                  <td style="border: 1px solid #d1d5db; padding: 8px;">${emp.currentLevel || 'N/A'}</td>
                  <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">
                    ${formatCurrency(convertToUSD(emp.currentBaseSalary || 0, emp.currency || 'USD'))}
                  </td>
                  <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">
                    ${formatCurrency(convertToUSD(emp.proposedBaseSalary || 0, emp.currency || 'USD'))}
                  </td>
                  <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right; ${emp.flagged ? 'color: #dc2626; font-weight: bold;' : ''}">
                    ${emp.totalIncreasePercent ? emp.totalIncreasePercent.toFixed(1) : '0.0'}%
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div style="margin-top: 30px; text-align: center; color: #6b7280; font-size: 12px;">
          Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
        </div>
      </div>
    `
  }

  const generateCSVContent = () => {
    const headers = [
      'Name',
      'Current Level',
      'Next Level',
      'Currency',
      'Current Base Salary',
      'Current Stock',
      'Proposed Base Salary',
      'Proposed Stock',
      'Base Increase %',
      'Total Increase %',
      'Has Promotion',
      'Flagged'
    ]

    const rows = employees.map(emp => [
      emp.name || '',
      emp.currentLevel || '',
      emp.nextLevel || '',
      emp.currency || 'USD',
      emp.currentBaseSalary || 0,
      emp.currentStock || 0,
      emp.proposedBaseSalary || 0,
      emp.proposedStock || 0,
      emp.meritIncrease || 0,
      emp.totalIncreasePercent || 0,
      emp.hasPromotion ? 'Yes' : 'No',
      emp.flagged ? 'Yes' : 'No'
    ])

    return [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {currentProject ? `Project: ${currentProject.projectName}` : 'No Project Selected'}
          </h2>
          {currentProject && (
            <div className="flex items-center space-x-3">
              <p className="text-sm text-gray-600">
                Last saved: {currentProject.lastSaved ? new Date(currentProject.lastSaved).toLocaleString() : 'Never'}
              </p>
              {autoSaveStatus && (
                <span className="text-sm text-gray-500">
                  {autoSaveStatus}
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className="flex space-x-4">
          {/* Download Link */}
          {currentProject && (
            <div className="relative">
              <button
                onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                className="text-gray-600 hover:text-gray-800 underline text-sm flex items-center space-x-1"
              >
                <span>Download</span>
                <svg className={`w-3 h-3 transition-transform ${showDownloadDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showDownloadDropdown && (
                <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                  <div className="py-1">
                    <button
                      onClick={handleDownloadPDF}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      PDF
                    </button>
                    <button
                      onClick={handleDownloadCSV}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      CSV
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="relative">
            <button
              onClick={toggleDropdown}
              className="text-gray-600 hover:text-gray-800 underline text-sm flex items-center space-x-1"
            >
              <span>Manage Project</span>
              <svg className={`w-3 h-3 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                <div className="py-1">
                  <button
                    onClick={() => handleDropdownAction('create')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Create Project
                  </button>
                  <button
                    onClick={() => handleDropdownAction('load')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Load Project
                  </button>
                  {currentProject && onSaveProject && (
                    <button
                      onClick={() => handleDropdownAction('save')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Save Project
                    </button>
                  )}
                  {currentProject && (onClearAllEmployees || onDeleteProject) && (
                    <>
                      <hr className="my-1" />
                      {onClearAllEmployees && (
                        <button
                          onClick={() => handleDropdownAction('clear')}
                          className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                        >
                          Clear All Employees
                        </button>
                      )}
                      {onDeleteProject && (
                        <button
                          onClick={() => handleDropdownAction('delete')}
                          className="block w-full text-left px-4 py-2 text-sm text-red-800 hover:bg-red-100 font-semibold"
                        >
                          🗑️ Delete Project
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="bg-red-100 rounded-full p-2 mr-3">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-red-800">⚠️ CRITICAL WARNING</h3>
            </div>
            
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-2">NO PASSWORD RECOVERY AVAILABLE</h4>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>• If you forget your project name or access key, your data is <strong>PERMANENTLY LOST</strong></li>
                <li>• We do not store any personal information and cannot recover access</li>
                <li>• Please save your project name and access key in a secure location</li>
                <li>• Share these credentials only with trusted team members</li>
                <li>• Anyone with these credentials has full read/write access</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleWarningAcknowledge}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
              >
                I Understand - Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Load Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {modalType === 'create' ? 'Create New Project' : 'Load Existing Project'}
            </h3>

            {modalType === 'create' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-yellow-800">
                  <strong>Remember:</strong> Save your project name and access key securely. 
                  There is no way to recover them if lost.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  name="projectName"
                  value={formData.projectName}
                  onChange={handleInputChange}
                  placeholder="e.g., Q1-2024-Comp-Planning"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Access Key *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    name="accessKey"
                    value={formData.accessKey}
                    onChange={handleInputChange}
                    placeholder="Enter or generate access key"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  {modalType === 'create' && (
                    <button
                      type="button"
                      onClick={generateAccessKey}
                      className="bg-gray-500 text-white px-3 py-2 rounded-md hover:bg-gray-600 text-sm"
                    >
                      Generate
                    </button>
                  )}
                </div>
              </div>

              {modalType === 'create' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Access Key *
                  </label>
                  <input
                    type="text"
                    name="confirmAccessKey"
                    value={formData.confirmAccessKey}
                    onChange={handleInputChange}
                    placeholder="Re-enter access key"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
                >
                  {modalType === 'create' ? 'Create Project' : 'Load Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectManager
