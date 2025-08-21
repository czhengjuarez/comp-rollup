export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, Pragma',
    }

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    try {
      // API Routes
      if (url.pathname === '/api/projects/save' && request.method === 'POST') {
        return await handleSaveProject(request, env, corsHeaders)
      }

      if (url.pathname === '/api/projects/load' && request.method === 'POST') {
        return await handleLoadProject(request, env, corsHeaders)
      }

      if (url.pathname === '/api/projects/list' && request.method === 'GET') {
        return await handleListProjects(request, env, corsHeaders)
      }
      
      if (url.pathname === '/api/projects/delete' && request.method === 'POST') {
        return await handleDeleteProject(request, env, corsHeaders)
      }

      // Health check
      if (url.pathname === '/api/health') {
        return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
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
    const { projectName, accessKey, employees, budgetSettings } = await request.json()
    
    console.log('API: Saving project with employees:', employees?.map(emp => ({ id: emp.id, name: emp.name })))
    
    if (!projectName || !accessKey) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const key = `${projectName}-${accessKey}`
    const timestamp = new Date().toISOString()
    const projectData = {
      projectName,
      accessKey,
      employees: employees || [],
      budgetSettings: budgetSettings || {},
      lastModified: timestamp
    }

    console.log('API: Saving to R2 with key:', key)
    console.log('API: Project data employees count:', projectData.employees.length)
    console.log('API: New timestamp:', timestamp)

    // Force R2 write with explicit options
    await env.COMP_ROLLUP_BUCKET.put(key, JSON.stringify(projectData), {
      httpMetadata: {
        contentType: 'application/json',
      },
      customMetadata: {
        timestamp: timestamp,
        employeeCount: projectData.employees.length.toString()
      }
    })

    console.log('API: R2 put operation completed')
    
    return new Response(JSON.stringify({ success: true, message: 'Project saved successfully' }), {
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
      return new Response(JSON.stringify({ error: 'Missing project name or access key' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const key = `${projectName}-${accessKey}`
    console.log('API: Loading from R2 with key:', key)
    
    const object = await env.COMP_ROLLUP_BUCKET.get(key)
    
    if (!object) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('API: R2 object metadata:', {
      etag: object.etag,
      size: object.size,
      uploaded: object.uploaded,
      customMetadata: object.customMetadata
    })

    const data = JSON.parse(await object.text())
    
    console.log('API: Loading project data from R2:', data)
    console.log('API: Loaded employees count:', data.employees?.length || 0)
    console.log('API: Loaded employees:', data.employees?.map(emp => ({ id: emp.id, name: emp.name })))
    console.log('API: Data lastModified:', data.lastModified)
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: {
        projectName: data.projectName,
        accessKey: data.accessKey,
        lastSaved: data.lastModified,
        employees: data.employees || [],
        budgetSettings: data.budgetSettings || {}
      }
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
    const { results } = await env.COMP_ROLLUP_BUCKET.list()
    const projects = results.map(obj => ({
      name: obj.key,
      lastModified: obj.uploaded,
      size: obj.size
    }))
    
    return new Response(JSON.stringify({ success: true, projects }), {
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

async function handleDeleteProject(request, env, corsHeaders) {
  try {
    const { projectName, accessKey } = await request.json()
    
    if (!projectName || !accessKey) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const key = `${projectName}-${accessKey}`
    console.log('🗑️ DELETE DEBUG - Deleting project with key:', key)
    console.log('🗑️ DELETE DEBUG - Using bucket:', env.COMP_ROLLUP_BUCKET)
    
    // Delete from R2 bucket
    console.log('🗑️ DELETE DEBUG - Attempting to delete key:', key)
    await env.COMP_ROLLUP_BUCKET.delete(key)
    console.log('🗑️ DELETE DEBUG - Delete command sent to R2')
    
    // Verify deletion by trying to get the object
    const verification = await env.COMP_ROLLUP_BUCKET.get(key)
    if (verification === null) {
      console.log('🗑️ DELETE DEBUG - Verified: Project successfully deleted from R2')
    } else {
      console.log('🗑️ DELETE DEBUG - WARNING: Project still exists in R2 after delete')
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Project deleted successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Delete project error:', error)
    return new Response(JSON.stringify({ error: 'Failed to delete project' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}
