import { useState, useEffect, useRef } from 'react'
import EmployeeManager from './components/EmployeeManager'
import BudgetSummary from './components/BudgetSummary'
import ProjectManager from './components/ProjectManager'
import { saveProject, loadProject, deleteProject, debugLocalStorage } from './utils/projectStorage'
import './App.css'

function App() {
  const [employees, setEmployees] = useState([])
  const [budgetSettings, setBudgetSettings] = useState({
    baseSalaryIncreaseAllowance: 50000, // Base salary increase budget allowance
    stockIncreaseAllowance: 25000, // Stock increase budget allowance
    standardMeritPercentage: 4.0, // Standard merit increase percentage
    maxOverBudget: 5 // Maximum percentage over budget allowed
  })
  const [currentProject, setCurrentProject] = useState(null)
  const [autoSaveStatus, setAutoSaveStatus] = useState('')
  const autoSaveTimeoutRef = useRef(null)

  // Debug: Track all employee state changes
  useEffect(() => {
    console.log('🔄 APP DEBUG - Employees state changed:', employees.length, employees.map(emp => ({ id: emp.id, name: emp.name })))
  }, [employees])

  // Auto-save function
  const performAutoSave = async () => {
    if (!currentProject) return

    try {
      setAutoSaveStatus('Saving...')
      const projectToSave = {
        projectName: currentProject.projectName,
        accessKey: currentProject.accessKey,
        employees: employees,
        budgetSettings: budgetSettings
      }
      
      await saveProject(projectToSave)
      
      setCurrentProject(prev => ({
        ...prev,
        lastSaved: new Date().toISOString()
      }))
      
      setAutoSaveStatus('Auto-saved')
      
      // Clear status after 2 seconds
      setTimeout(() => setAutoSaveStatus(''), 2000)
    } catch (error) {
      setAutoSaveStatus('Auto-save failed')
      setTimeout(() => setAutoSaveStatus(''), 3000)
    }
  }

  // Auto-save functionality - triggers on any data changes
  useEffect(() => {
    if (!currentProject || !currentProject.projectName) return

    // Don't auto-save if there are no employees and no budget changes from defaults
    const hasData = employees.length > 0 || 
      budgetSettings.baseSalaryIncreaseAllowance !== 50000 ||
      budgetSettings.stockIncreaseAllowance !== 25000 ||
      budgetSettings.standardMeritPercentage !== 4.0 ||
      budgetSettings.maxOverBudget !== 5

    if (!hasData) return

    console.log('🔄 AUTO-SAVE - Triggering auto-save due to data changes')

    // Clear any existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    // Set new timeout for auto-save (debounced)
    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave()
    }, 3000)

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [employees, budgetSettings])

  const handleProjectLoad = async (projectData) => {
    try {
      console.log('🔄 APP DEBUG - handleProjectLoad called with:', projectData)
      console.log('🔄 APP DEBUG - Current employees before load:', employees.length)
      
      if (projectData.isNew) {
        // Create new project
        console.log('🔄 APP DEBUG - Creating new project')
        const newProject = {
          projectName: projectData.projectName,
          accessKey: projectData.accessKey,
          lastSaved: null,
          employees: [],
          budgetSettings: budgetSettings
        }
        setCurrentProject(newProject)
        setEmployees([])
        console.log('🔄 APP DEBUG - New project created, employees set to empty array')
      } else {
        // Load existing project
        console.log('🔄 APP DEBUG - Loading existing project')
        const result = await loadProject(projectData.projectName, projectData.accessKey)
        console.log('🔄 APP DEBUG - Raw load result:', result)
        console.log('🔄 APP DEBUG - Employees from API:', result.data.employees)
        console.log('🔄 APP DEBUG - Employee count from API:', result.data.employees?.length || 0)
        
        const projectToSet = {
          projectName: projectData.projectName,
          accessKey: projectData.accessKey,
          lastSaved: result.data.lastSaved
        }
        const employeesToSet = result.data.employees || []
        const budgetToSet = result.data.budgetSettings || budgetSettings
        
        console.log('🔄 APP DEBUG - About to set project:', projectToSet)
        console.log('🔄 APP DEBUG - About to set employees:', employeesToSet)
        console.log('🔄 APP DEBUG - About to set budget:', budgetToSet)
        
        setCurrentProject(projectToSet)
        setEmployees(employeesToSet)
        setBudgetSettings(budgetToSet)
        
        console.log('🔄 APP DEBUG - State setters called')
        
        // Check state immediately after setting
        setTimeout(() => {
          console.log('🔄 APP DEBUG - Employees state after 100ms:', employees.length)
        }, 100)
      }
    } catch (error) {
      console.error('🔄 APP DEBUG - Error in handleProjectLoad:', error)
      throw new Error(`Failed to ${projectData.isNew ? 'create' : 'load'} project: ${error.message}`)
    }
  }

  const handleSaveProject = async () => {
    if (!currentProject) return

    try {
      console.log('Saving project with employees:', employees.map(emp => ({ id: emp.id, name: emp.name })))
      const projectToSave = {
        projectName: currentProject.projectName,
        accessKey: currentProject.accessKey,
        employees: employees,
        budgetSettings: budgetSettings
      }
      
      const result = await saveProject(projectToSave)
      
      setCurrentProject(prev => ({
        ...prev,
        lastSaved: new Date().toISOString()
      }))
      
      alert(`Project saved successfully! ${result.message}`)
    } catch (error) {
      alert(`Failed to save project: ${error.message}`)
    }
  }

  const handleClearAllEmployees = async () => {
    if (!currentProject) return
    
    if (confirm('Are you sure you want to delete ALL employees? This cannot be undone.')) {
      console.log('Clearing all employees - before:', employees.length)
      
      // Disable auto-save during clear operation
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
      
      // Force save immediately with empty array BEFORE updating state
      try {
        const projectToSave = {
          projectName: currentProject.projectName,
          accessKey: currentProject.accessKey,
          employees: [], // Explicitly empty array
          budgetSettings: budgetSettings
        }
        
        console.log('Saving cleared project:', projectToSave)
        
        const result = await saveProject(projectToSave)
        console.log('Clear save result:', result)
        
        // Only update state AFTER successful save
        setEmployees([])
        setCurrentProject(prev => ({
          ...prev,
          lastSaved: new Date().toISOString()
        }))
        
        alert('All employees cleared and project saved!')
      } catch (error) {
        console.error('Failed to save cleared project:', error)
        alert(`Failed to save cleared project: ${error.message}`)
      }
    }
  }

  const addEmployee = (employee) => {
    // Generate a more unique ID to prevent duplicates
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    setEmployees([...employees, { ...employee, id: uniqueId }])
  }

  const updateEmployee = (id, updatedEmployee) => {
    setEmployees(employees.map(emp => 
      emp.id === id ? { ...updatedEmployee, id } : emp
    ))
  }

  const deleteEmployee = (id) => {
    console.log('Deleting employee with ID:', id, 'Type:', typeof id)
    console.log('Current employees:', employees.map(emp => ({ id: emp.id, name: emp.name, idType: typeof emp.id })))
    
    // Handle both string and number IDs for backwards compatibility
    const newEmployees = employees.filter(emp => {
      const match = emp.id == id || emp.id === id || emp.id === String(id) || emp.id === Number(id)
      console.log(`Comparing ${emp.id} (${typeof emp.id}) with ${id} (${typeof id}): ${match ? 'KEEP' : 'DELETE'}`)
      return !match
    })
    
    console.log('Employees after deletion:', newEmployees.map(emp => ({ id: emp.id, name: emp.name })))
    setEmployees(newEmployees)
  }

  const handleDeleteProject = async () => {
    if (!currentProject) return
    
    const confirmMessage = `⚠️ DANGER: This will permanently delete the entire project "${currentProject.projectName}" and ALL employee data from cloud storage.\n\nThis action CANNOT be undone.\n\nType "DELETE" to confirm:`
    const confirmation = prompt(confirmMessage)
    
    if (confirmation !== 'DELETE') {
      alert('Project deletion cancelled.')
      return
    }
    
    try {
      await deleteProject(currentProject.projectName, currentProject.accessKey)
      
      // Clear local state
      setCurrentProject(null)
      setEmployees([])
      setBudgetSettings({
        baseSalaryIncreaseAllowance: 50000,
        stockIncreaseAllowance: 25000,
        standardMeritPercentage: 4.0,
        maxOverBudget: 5
      })
      
      alert('Project deleted successfully from cloud storage.')
    } catch (error) {
      console.error('Failed to delete project:', error)
      alert(`Failed to delete project: ${error.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Compensation Roll-Up Manager</h1>
        
        {/* Project Manager */}
        <ProjectManager 
          onProjectLoad={handleProjectLoad} 
          currentProject={currentProject}
          onSaveProject={handleSaveProject}
          onDeleteProject={handleDeleteProject}
          autoSaveStatus={autoSaveStatus}
          onClearAllEmployees={handleClearAllEmployees}
          employees={employees}
          budgetSettings={budgetSettings}
        />
        
        {/* Two-column layout for budget sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Left column: Budget Settings and Budget Status */}
          <div className="space-y-6">
            <BudgetSummary 
              employees={employees} 
              budgetSettings={budgetSettings} 
              onUpdateBudgetSettings={setBudgetSettings}
              showOnlyBudgetAndStatus={true}
            />
          </div>
          
          {/* Right column: Level Breakdown and Flagged Employees */}
          <div className="space-y-6">
            <BudgetSummary 
              employees={employees} 
              budgetSettings={budgetSettings} 
              onUpdateBudgetSettings={setBudgetSettings}
              showOnlyLevelAndFlagged={true}
            />
          </div>
        </div>

        {/* Full width Employee Management */}
        <EmployeeManager 
          employees={employees}
          onAddEmployee={addEmployee}
          onUpdateEmployee={updateEmployee}
          onDeleteEmployee={deleteEmployee}
          budgetSettings={budgetSettings}
        />
      </div>
    </div>
  )
}

export default App
