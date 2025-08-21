export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    try {
      // Route handling
      if (url.pathname === '/api/projects/save' && request.method === 'POST') {
        return await handleSaveProject(request, env, corsHeaders)
      }
      
      if (url.pathname === '/api/projects/load' && request.method === 'POST') {
        return await handleLoadProject(request, env, corsHeaders)
      }
      
      if (url.pathname === '/api/projects/list' && request.method === 'GET') {
        return await handleListProjects(request, env, corsHeaders)
      }

      // Health check
      if (url.pathname === '/api/health') {
        return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Static files serving
      if (!url.pathname.startsWith('/api/')) {
        return await handleStaticFiles(url.pathname, corsHeaders)
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders })
    } catch (error) {
      console.error('Worker error:', error)
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  }
}

async function handleSaveProject(request, env, corsHeaders) {
  try {
    const projectData = await request.json()
    
    // Validate required fields
    if (!projectData.projectName || !projectData.accessKey) {
      return new Response(JSON.stringify({ error: 'Project name and access key are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create the object key (filename in R2)
    const objectKey = `${projectData.projectName}.json`
    
    // Prepare data to save
    const dataToSave = {
      ...projectData,
      lastSaved: new Date().toISOString(),
      version: '1.0'
    }

    // Save to R2
    await env.COMP_ROLLUP_BUCKET.put(objectKey, JSON.stringify(dataToSave), {
      httpMetadata: {
        contentType: 'application/json',
      },
    })

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Project saved successfully',
      projectName: projectData.projectName,
      lastSaved: dataToSave.lastSaved
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Save project error:', error)
    return new Response(JSON.stringify({ error: 'Failed to save project' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

async function handleLoadProject(request, env, corsHeaders) {
  try {
    const { projectName, accessKey } = await request.json()
    
    if (!projectName || !accessKey) {
      return new Response(JSON.stringify({ error: 'Project name and access key are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get object from R2
    const objectKey = `${projectName}.json`
    const object = await env.COMP_ROLLUP_BUCKET.get(objectKey)
    
    if (!object) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const projectData = await object.json()
    
    // Verify access key
    if (projectData.accessKey !== accessKey) {
      return new Response(JSON.stringify({ error: 'Invalid access key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data: projectData 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Load project error:', error)
    return new Response(JSON.stringify({ error: 'Failed to load project' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

async function handleListProjects(request, env, corsHeaders) {
  try {
    // List all objects in the bucket (for debugging - remove in production)
    const objects = await env.COMP_ROLLUP_BUCKET.list()
    
    const projects = objects.objects.map(obj => ({
      name: obj.key.replace('.json', ''),
      lastModified: obj.uploaded,
      size: obj.size
    }))

    return new Response(JSON.stringify({ 
      success: true, 
      projects: projects 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('List projects error:', error)
    return new Response(JSON.stringify({ error: 'Failed to list projects' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

async function handleStaticFiles(pathname, corsHeaders) {
  // For now, serve the embedded standalone app for all static requests
  return new Response(getStandaloneApp(), {
    headers: { 
      ...corsHeaders, 
      'Content-Type': 'text/html'
    }
  });
  
  return new Response('Not Found', { status: 404, headers: corsHeaders });
}

function getStandaloneApp() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Compensation Roll-Up Manager</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel">
        const { useState, useEffect } = React;
        const API_BASE_URL = window.location.origin;

        // Project Storage Functions
        const saveProject = async (projectData) => {
            const response = await fetch(\`\${API_BASE_URL}/api/projects/save\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projectData)
            });
            if (!response.ok) throw new Error('Save failed');
            return await response.json();
        };

        const loadProject = async (projectName, accessKey) => {
            const response = await fetch(\`\${API_BASE_URL}/api/projects/load\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectName, accessKey })
            });
            if (!response.ok) throw new Error('Load failed');
            return await response.json();
        };

        // Main App Component
        const App = () => {
            const [employees, setEmployees] = useState([]);
            const [projectName, setProjectName] = useState('');
            const [accessKey, setAccessKey] = useState('');
            const [saveStatus, setSaveStatus] = useState('');
            const [newEmployee, setNewEmployee] = useState({
                name: '', level: '', currency: 'USD', currentBaseSalary: '', proposedBaseSalary: '', proposedIncrease: ''
            });

            const handleAddEmployee = () => {
                if (!newEmployee.name) return;
                const employee = {
                    ...newEmployee,
                    id: Date.now(),
                    currentBaseSalary: parseFloat(newEmployee.currentBaseSalary) || 0,
                    proposedBaseSalary: parseFloat(newEmployee.proposedBaseSalary) || 0,
                    proposedIncrease: parseFloat(newEmployee.proposedIncrease) || 0
                };
                setEmployees([...employees, employee]);
                setNewEmployee({ name: '', level: '', currency: 'USD', currentBaseSalary: '', proposedBaseSalary: '', proposedIncrease: '' });
            };

            const handleSaveProject = async () => {
                if (!projectName || !accessKey) {
                    setSaveStatus('Error: Project name and access key required');
                    return;
                }
                try {
                    await saveProject({ projectName, accessKey, employees, lastSaved: new Date().toISOString() });
                    setSaveStatus('Project saved successfully');
                    setTimeout(() => setSaveStatus(''), 3000);
                } catch (error) {
                    setSaveStatus(\`Error: \${error.message}\`);
                }
            };

            const handleLoadProject = async () => {
                if (!projectName || !accessKey) {
                    setSaveStatus('Error: Project name and access key required');
                    return;
                }
                try {
                    const result = await loadProject(projectName, accessKey);
                    if (result.success && result.data) {
                        setEmployees(result.data.employees || []);
                        setSaveStatus('Project loaded successfully');
                        setTimeout(() => setSaveStatus(''), 3000);
                    }
                } catch (error) {
                    setSaveStatus(\`Error: \${error.message}\`);
                }
            };

            const EXCHANGE_RATES = { USD: 1.0, GBP: 1.25, EUR: 1.08 };
            const convertToUSD = (amount, currency) => amount * (EXCHANGE_RATES[currency] || 1.0);
            const formatCurrency = (amount, currency) => {
                const symbols = { USD: '$', GBP: '£', EUR: '€' };
                return \`\${symbols[currency] || '$'}\${amount.toLocaleString()}\`;
            };

            const totalIncreases = employees.reduce((sum, emp) => sum + convertToUSD(emp.proposedIncrease || 0, emp.currency), 0);

            return (
                <div className="min-h-screen bg-gray-50 py-8">
                    <div className="max-w-7xl mx-auto px-4">
                        <h1 className="text-3xl font-bold text-gray-900 mb-8">Compensation Roll-Up Manager</h1>
                        
                        {/* Project Management */}
                        <div className="bg-white rounded-lg shadow p-6 mb-6">
                            <h2 className="text-xl font-semibold mb-4">Project Management</h2>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <input
                                    type="text"
                                    placeholder="Project Name"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                    type="password"
                                    placeholder="Access Key"
                                    value={accessKey}
                                    onChange={(e) => setAccessKey(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    onClick={handleSaveProject}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                >
                                    Save Project
                                </button>
                                <button
                                    onClick={handleLoadProject}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    Load Project
                                </button>
                            </div>
                            {saveStatus && (
                                <div className={\`mt-2 text-sm \${saveStatus.includes('Error') ? 'text-red-600' : 'text-green-600'}\`}>
                                    {saveStatus}
                                </div>
                            )}
                        </div>

                        {/* Add Employee */}
                        <div className="bg-white rounded-lg shadow p-6 mb-6">
                            <h2 className="text-xl font-semibold mb-4">Add Employee</h2>
                            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                <input
                                    type="text"
                                    placeholder="Name"
                                    value={newEmployee.name}
                                    onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                    type="text"
                                    placeholder="Level"
                                    value={newEmployee.level}
                                    onChange={(e) => setNewEmployee({...newEmployee, level: e.target.value})}
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <select
                                    value={newEmployee.currency}
                                    onChange={(e) => setNewEmployee({...newEmployee, currency: e.target.value})}
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="USD">USD</option>
                                    <option value="GBP">GBP</option>
                                    <option value="EUR">EUR</option>
                                </select>
                                <input
                                    type="number"
                                    placeholder="Current Salary"
                                    value={newEmployee.currentBaseSalary}
                                    onChange={(e) => setNewEmployee({...newEmployee, currentBaseSalary: e.target.value})}
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                    type="number"
                                    placeholder="Proposed Increase"
                                    value={newEmployee.proposedIncrease}
                                    onChange={(e) => {
                                        const increase = parseFloat(e.target.value) || 0;
                                        const current = parseFloat(newEmployee.currentBaseSalary) || 0;
                                        setNewEmployee({
                                            ...newEmployee, 
                                            proposedIncrease: e.target.value,
                                            proposedBaseSalary: (current + increase).toString()
                                        });
                                    }}
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    onClick={handleAddEmployee}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    Add Employee
                                </button>
                            </div>
                        </div>

                        {/* Budget Summary */}
                        <div className="bg-white rounded-lg shadow p-6 mb-6">
                            <h2 className="text-xl font-semibold mb-4">Budget Summary</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600">
                                        $\{totalIncreases.toLocaleString()}
                                    </div>
                                    <div className="text-sm text-gray-500">Total Increases (USD)</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600">
                                        {employees.length}
                                    </div>
                                    <div className="text-sm text-gray-500">Total Employees</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-purple-600">
                                        {employees.filter(emp => {
                                            const increasePercent = emp.currentBaseSalary > 0 ? (emp.proposedIncrease / emp.currentBaseSalary) * 100 : 0;
                                            return increasePercent > 10;
                                        }).length}
                                    </div>
                                    <div className="text-sm text-gray-500">High Increases (>10%)</div>
                                </div>
                            </div>
                        </div>

                        {/* Employee List */}
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h2 className="text-xl font-semibold">Employee List</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Salary</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proposed Salary</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Increase</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {employees.map((employee) => {
                                            const increasePercent = employee.currentBaseSalary > 0 ? (employee.proposedIncrease / employee.currentBaseSalary) * 100 : 0;
                                            const isHighIncrease = increasePercent > 10;
                                            return (
                                                <tr key={employee.id} className={isHighIncrease ? 'bg-red-50' : ''}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {employee.name}
                                                        {isHighIncrease && <span className="ml-2 text-red-600">⚠️</span>}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{employee.level}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {formatCurrency(employee.currentBaseSalary, employee.currency)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {formatCurrency(employee.proposedBaseSalary, employee.currency)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {formatCurrency(employee.proposedIncrease, employee.currency)}
                                                        {increasePercent > 0 && (
                                                            <span className={increasePercent > 10 ? 'text-red-600 font-semibold' : 'text-gray-400'}>
                                                                {' '}({increasePercent.toFixed(1)}%)
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        <button
                                                            onClick={() => setEmployees(employees.filter(emp => emp.id !== employee.id))}
                                                            className="text-red-600 hover:text-red-900"
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

        ReactDOM.render(<App />, document.getElementById('root'));
    </script>
</body>
</html>`;
}

