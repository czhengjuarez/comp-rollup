// R2 backend implementation for project storage
const API_BASE_URL = 'https://comp-rollup-api-production.coscient.workers.dev'

export const saveProject = async (projectData) => {
  try {
    console.log('Attempting to save to:', `${API_BASE_URL}/api/projects/save`)
    console.log('Project data:', projectData)
    
    const response = await fetch(`${API_BASE_URL}/api/projects/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(projectData)
    })
    
    console.log('Response status:', response.status)
    console.log('Response headers:', [...response.headers.entries()])
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error response:', errorText)
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`)
    }
    
    const result = await response.json()
    console.log('Project saved to R2:', result)
    return { success: true, message: 'Project saved to cloud storage' }
  } catch (error) {
    console.error('Save error details:', error)
    console.error('Error stack:', error.stack)
    throw new Error(`Failed to save project: ${error.message}`)
  }
}

export const loadProject = async (projectName, accessKey) => {
  try {
    console.log('🔍 LOAD DEBUG - Starting load for:', projectName)
    
    // Clear browser cache first
    const localStorageKeys = Object.keys(localStorage)
    console.log('🔍 LOAD DEBUG - LocalStorage keys:', localStorageKeys)
    localStorageKeys.forEach(key => {
      if (key.includes('employee') || key.includes('project') || key.includes(projectName)) {
        console.log('🔍 LOAD DEBUG - Removing localStorage key:', key)
        localStorage.removeItem(key)
      }
    })
    
    // Clear session storage too
    const sessionStorageKeys = Object.keys(sessionStorage)
    console.log('🔍 LOAD DEBUG - SessionStorage keys:', sessionStorageKeys)
    sessionStorageKeys.forEach(key => {
      if (key.includes('employee') || key.includes('project') || key.includes(projectName)) {
        console.log('🔍 LOAD DEBUG - Removing sessionStorage key:', key)
        sessionStorage.removeItem(key)
      }
    })
    
    console.log('🔍 LOAD DEBUG - Making API call to load project')
    const response = await fetch(`${API_BASE_URL}/api/projects/load`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      body: JSON.stringify({
        projectName,
        accessKey
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    console.log('🔍 LOAD DEBUG - Raw API response:', result)
    console.log('🔍 LOAD DEBUG - Employee count from API:', result.data?.employees?.length || 0)
    console.log('🔍 LOAD DEBUG - Employee data from API:', result.data?.employees)
    console.log('🔍 LOAD DEBUG - Full result.data:', result.data)
    
    return result
  } catch (error) {
    console.error('🔍 LOAD DEBUG - Error loading project:', error)
    console.error('🔍 LOAD DEBUG - Error details:', error.message)
    console.error('🔍 LOAD DEBUG - Error stack:', error.stack)
    throw new Error(`Failed to load project: ${error.message}`)
  }
}

export const deleteProject = async (projectName, accessKey) => {
  try {
    console.log('🗑️ DELETE DEBUG - Deleting project:', projectName)
    const response = await fetch(`${API_BASE_URL}/api/projects/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectName,
        accessKey
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    console.log('🗑️ DELETE DEBUG - Project deleted successfully:', result)
    return result
  } catch (error) {
    console.error('🗑️ DELETE DEBUG - Error deleting project:', error)
    throw error
  }
}

export const listLocalProjects = () => {
  const projects = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('comp-rollup-')) {
      try {
        const data = JSON.parse(localStorage.getItem(key))
        projects.push({
          projectName: data.projectName,
          lastSaved: data.lastSaved,
          key: key
        })
      } catch (error) {
        console.error('Error parsing project data:', error)
      }
    }
  }
  return projects
}

// Debug function to check localStorage contents
export const debugLocalStorage = () => {
  console.log('=== localStorage Debug ===')
  console.log('Total localStorage items:', localStorage.length)
  
  const allKeys = []
  for (let i = 0; i < localStorage.length; i++) {
    allKeys.push(localStorage.key(i))
  }
  console.log('All keys:', allKeys)
  
  const compRollupKeys = allKeys.filter(key => key && key.startsWith('comp-rollup-'))
  console.log('Comp rollup keys:', compRollupKeys)
  
  compRollupKeys.forEach(key => {
    try {
      const data = JSON.parse(localStorage.getItem(key))
      console.log(`Project ${key}:`, {
        projectName: data.projectName,
        accessKey: data.accessKey,
        lastSaved: data.lastSaved,
        employeeCount: data.employees ? data.employees.length : 0
      })
    } catch (error) {
      console.error(`Error parsing ${key}:`, error)
    }
  })
  console.log('=== End Debug ===')
}

