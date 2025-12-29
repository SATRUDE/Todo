import { supabase } from './supabase'

// Helper function to ensure user is authenticated (using anonymous auth if needed)
async function ensureAuthenticated(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    return user.id
  }
  
  // If no user, sign in anonymously
  const { data: { user: anonUser }, error } = await supabase.auth.signInAnonymously()
  
  if (error || !anonUser) {
    console.error('❌ Anonymous authentication error:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    console.error('Error code:', error?.code)
    console.error('Error status:', error?.status)
    
    // Check if anonymous auth is disabled
    if (error?.message?.includes('signup_disabled') || error?.message?.includes('Email signup is disabled')) {
      throw new Error('Anonymous authentication is disabled in Supabase. Please enable it in Authentication → Providers → Anonymous in your Supabase dashboard.')
    }
    if (error?.message?.includes('access') || error?.message?.includes('blocked') || error?.message?.includes('denied')) {
      throw new Error('Access blocked: Anonymous authentication may be disabled. Enable it in Supabase Dashboard → Authentication → Providers → Anonymous.')
    }
    if (error?.message?.includes('new signups') || error?.message?.includes('signups are disabled')) {
      throw new Error('New signups are disabled. Enable "Allow new users to sign up" in Supabase Dashboard → Authentication → User Signups.')
    }
    if (error?.code === 'PGRST301' || error?.status === 401) {
      throw new Error(`Authentication failed (401): ${error?.message || 'Invalid credentials or anonymous auth disabled'}. Check Supabase settings.`)
    }
    throw new Error(`Failed to authenticate user: ${error?.message || 'Unknown error'} (Code: ${error?.code || 'N/A'}, Status: ${error?.status || 'N/A'}). Check browser console for details.`)
  }
  
  return anonUser.id
}

// Convert a Date to YYYY-MM-DD using the local calendar date.
const formatLocalDate = (date: Date | undefined | null): string | null => {
  if (!date || isNaN(date.getTime())) {
    return null
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Parse a YYYY-MM-DD string into a Date anchored to the local timezone.
const parseLocalDate = (dateString: string | undefined | null): Date | undefined => {
  if (!dateString) {
    return undefined
  }
  const [yearStr, monthStr, dayStr] = dateString.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)

  if ([year, month, day].some((value) => Number.isNaN(value))) {
    return undefined
  }

  return new Date(year, month - 1, day)
}

export interface Todo {
  id: number
  text: string
  completed: boolean
  time?: string
  group?: string
  description?: string | null
  list_id?: number // -1 for completed, 0 for today, positive numbers for custom lists
  deadline_date?: string // YYYY-MM-DD string
  deadline_time?: string
  deadline_recurring?: string
  created_at?: string
  updated_at?: string
}

export interface ListItem {
  id: number
  name: string
  color: string
  count?: number // Computed, not stored
  is_shared: boolean
  created_at?: string
  updated_at?: string
}

// Convert database Todo to app Todo format
export function dbTodoToAppTodo(dbTodo: any): Todo {
  return {
    id: dbTodo.id,
    text: dbTodo.text,
    completed: dbTodo.completed,
    time: dbTodo.time,
    group: dbTodo.group,
    description: dbTodo.description,
    list_id: dbTodo.list_id,
    deadline_date: dbTodo.deadline_date,
    deadline_time: dbTodo.deadline_time,
    deadline_recurring: dbTodo.deadline_recurring,
    created_at: dbTodo.created_at,
    updated_at: dbTodo.updated_at,
  }
}

// Convert app Todo to database format
export function appTodoToDbTodo(todo: any): any {
  const dbTodo: any = {
    text: todo.text,
    completed: todo.completed,
    time: todo.time || null,
    group: todo.group || null,
    list_id: todo.listId !== undefined ? todo.listId : (todo.list_id !== undefined ? todo.list_id : 0),
  }

  // Handle description - only include if it has a value
  // Note: If the description column doesn't exist in your database, 
  // you need to run: ALTER TABLE todos ADD COLUMN IF NOT EXISTS description TEXT;
  if (typeof todo.description === 'string' && todo.description.trim() !== '') {
    dbTodo.description = todo.description.trim()
  } else if (todo.description !== undefined && todo.description !== null && todo.description !== '') {
    dbTodo.description = todo.description
  }
  // If description is null/undefined/empty, we don't include it in the insert
  
  if (todo.deadline) {
    dbTodo.deadline_date = formatLocalDate(todo.deadline.date)
    
    // Convert local time to UTC for storage
    // The user sets a time in their local timezone (e.g., 21:20 in Norway UTC+1)
    // We need to convert it to UTC so the backend can work in UTC
    if (todo.deadline.time && todo.deadline.time.trim() !== '') {
      // Parse the local date and time
      const localDate = todo.deadline.date
      const [hours, minutes] = todo.deadline.time.split(':').map(Number)
      
      // Create a date object in the user's local timezone
      const localDateTime = new Date(
        localDate.getFullYear(),
        localDate.getMonth(),
        localDate.getDate(),
        hours,
        minutes,
        0,
        0
      )
      
      // Convert to UTC
      const utcHours = localDateTime.getUTCHours()
      const utcMinutes = localDateTime.getUTCMinutes()
      
      // Format as HH:MM in UTC
      dbTodo.deadline_time = `${String(utcHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')}`
    } else {
      dbTodo.deadline_time = null
    }
    
    dbTodo.deadline_recurring = todo.deadline.recurring || null
  } else {
    dbTodo.deadline_date = null
    dbTodo.deadline_time = null
    dbTodo.deadline_recurring = null
  }
  
  return dbTodo
}

// Convert app Todo format to display format (with deadline object)
export function dbTodoToDisplayTodo(dbTodo: Todo): any {
  const parsedDeadlineDate = parseLocalDate(dbTodo.deadline_date)
  
  // Convert UTC time back to local time for display
  let displayTime = dbTodo.deadline_time || ''
  if (parsedDeadlineDate && dbTodo.deadline_time && dbTodo.deadline_time.trim() !== '') {
    // Parse UTC time
    const [utcHours, utcMinutes] = dbTodo.deadline_time.split(':').map(Number)
    
    // Create a UTC date object
    const utcDate = new Date(Date.UTC(
      parsedDeadlineDate.getFullYear(),
      parsedDeadlineDate.getMonth(),
      parsedDeadlineDate.getDate(),
      utcHours,
      utcMinutes,
      0,
      0
    ))
    
    // Convert to local time
    const localHours = utcDate.getHours()
    const localMinutes = utcDate.getMinutes()
    
    // Format as HH:MM in local time
    displayTime = `${String(localHours).padStart(2, '0')}:${String(localMinutes).padStart(2, '0')}`
  }
  
  const deadline = parsedDeadlineDate ? {
    date: parsedDeadlineDate,
    time: displayTime,
    recurring: dbTodo.deadline_recurring,
  } : undefined

  return {
    id: dbTodo.id,
    text: dbTodo.text,
    completed: dbTodo.completed,
    time: dbTodo.time,
    group: dbTodo.group,
    description: dbTodo.description || undefined,
    listId: dbTodo.list_id,
    deadline,
    updatedAt: dbTodo.updated_at,
  }
}

// Convert database ListItem to app ListItem format
export function dbListToAppList(dbList: any): ListItem {
  return {
    id: dbList.id,
    name: dbList.name,
    color: dbList.color,
    is_shared: dbList.is_shared,
    created_at: dbList.created_at,
    updated_at: dbList.updated_at,
  }
}

// Tasks
export async function fetchTasks(): Promise<Todo[]> {
  const userId = await ensureAuthenticated()
  
  // Fetch tasks that belong to user OR legacy tasks (NULL user_id)
  // Note: RLS policy may block NULL user_id, but we try to include them for backward compatibility
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Error fetching tasks:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    console.error('Current user ID:', userId)
    
    // Check if it's an RLS policy error
    if (error.code === 'PGRST301' || error.message?.includes('permission denied') || error.message?.includes('row-level security')) {
      throw new Error(`Access denied by RLS policy. User ID: ${userId}. Make sure anonymous authentication is enabled and the user session is active.`)
    }
    
    throw error
  }

  return data ? data.map(dbTodoToAppTodo) : []
}

export async function createTask(todo: any): Promise<Todo> {
  console.log('createTask called with:', todo)
  const userId = await ensureAuthenticated()
  const dbTodo = appTodoToDbTodo(todo)
  dbTodo.user_id = userId
  console.log('Converted to DB format:', dbTodo)
  
  const { data, error } = await supabase
    .from('todos')
    .insert(dbTodo)
    .select()
    .single()

  if (error) {
    console.error('Error creating task:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    throw error
  }

  console.log('Task inserted successfully, data:', data)
  const appTodo = dbTodoToAppTodo(data)
  console.log('Converted to app format:', appTodo)
  return appTodo
}

export async function updateTask(id: number, todo: any): Promise<Todo> {
  const userId = await ensureAuthenticated()
  const dbTodo = appTodoToDbTodo(todo)
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.ts:updateTask:beforeUpdate',message:'Before Supabase update',data:{taskId:id,userId,dbTodo},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  
  // First, check what user_id the task currently has
  // #region agent log
  const { data: existingTask } = await supabase
    .from('todos')
    .select('id, user_id')
    .eq('id', id)
    .single();
  fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.ts:updateTask:checkExisting',message:'Checking existing task user_id',data:{taskId:id,existingUserId:existingTask?.user_id,currentUserId:userId},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  
  // Query should match tasks with matching user_id OR NULL user_id (for legacy tasks)
  // Use .or() to allow both cases
  // Also ensure we set user_id if it's currently NULL (for legacy tasks)
  if (!dbTodo.user_id && existingTask?.user_id === null) {
    dbTodo.user_id = userId;
  }
  
  const { data, error } = await supabase
    .from('todos')
    .update(dbTodo)
    .eq('id', id)
    .or(`user_id.eq.${userId},user_id.is.null`)
    .select()
    .single()

  if (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.ts:updateTask:error',message:'Supabase update error',data:{taskId:id,errorCode:error.code,errorMessage:error.message,errorDetails:JSON.stringify(error),dbTodo},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    console.error('Error updating task:', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    console.error('Error details:', JSON.stringify(error, null, 2))
    console.error('DB Todo being sent:', JSON.stringify(dbTodo, null, 2))
    throw error
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.ts:updateTask:success',message:'Supabase update successful',data:{taskId:id,updatedData:data},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'})}).catch(()=>{});
  // #endregion

  return dbTodoToAppTodo(data)
}

export async function deleteTask(id: number): Promise<void> {
  const userId = await ensureAuthenticated()
  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id)
    .or(`user_id.eq.${userId},user_id.is.null`)

  if (error) {
    console.error('Error deleting task:', error)
    throw error
  }
}

// Lists
export async function fetchLists(): Promise<ListItem[]> {
  const userId = await ensureAuthenticated()
  
  // Fetch lists that belong to user OR legacy lists (NULL user_id)
  // Note: RLS policy may block NULL user_id, but we try to include them for backward compatibility
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching lists:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    throw error
  }

  return data ? data.map(dbListToAppList) : []
}

export async function createList(list: { name: string; color: string; isShared: boolean }): Promise<ListItem> {
  const userId = await ensureAuthenticated()
  
  const { data, error } = await supabase
    .from('lists')
    .insert({
      user_id: userId,
      name: list.name,
      color: list.color,
      is_shared: list.isShared,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating list:', error)
    throw error
  }

  return dbListToAppList(data)
}

export async function updateList(id: number, list: { name: string; color: string; isShared: boolean }): Promise<ListItem> {
  const userId = await ensureAuthenticated()
  
  const { data, error } = await supabase
    .from('lists')
    .update({
      name: list.name,
      color: list.color,
      is_shared: list.isShared,
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating list:', error)
    throw error
  }

  return dbListToAppList(data)
}

export async function deleteList(id: number): Promise<void> {
  const userId = await ensureAuthenticated()
  
  // First, move all tasks from this list to Today (list_id = 0)
  await supabase
    .from('todos')
    .update({ list_id: 0 })
    .eq('list_id', id)
    .eq('user_id', userId)

  // Then delete the list
  const { error } = await supabase
    .from('lists')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    console.error('Error deleting list:', error)
    throw error
  }
}

