import { supabase } from './supabase'

// Check if we're in development mode (localhost)
const isDevelopment = () => {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' ||
         window.location.hostname.includes('localhost');
};

// Helper function to ensure user is authenticated (requires sign-in, or anonymous in dev)
async function ensureAuthenticated(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    throw new Error(`Authentication error: ${error.message}`)
  }
  
  if (!user) {
    // In development, allow anonymous sign-in as fallback
    if (isDevelopment()) {
      const { data: { user: anonUser }, error: anonError } = await supabase.auth.signInAnonymously()
      if (anonError || !anonUser) {
        throw new Error(`Authentication error: ${anonError?.message || 'Failed to sign in anonymously'}`)
      }
      return anonUser.id
    }
    throw new Error('User not authenticated. Please sign in.')
  }
  
  return user.id
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
  image_url?: string | null // URL to image in Supabase Storage
  list_id?: number // -1 for completed, 0 for today, positive numbers for custom lists
  milestone_id?: number // Foreign key to milestones table
  daily_task_id?: number | null // Foreign key to daily_tasks table
  parent_task_id?: number | null // Foreign key to parent task (for subtasks)
  deadline_date?: string // YYYY-MM-DD string
  deadline_time?: string
  deadline_recurring?: string
  effort?: number // Effort level out of 10 (0-10)
  type?: 'task' | 'reminder' // Task type: 'task' or 'reminder'
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

export interface CommonTask {
  id: number
  text: string
  description?: string | null
  time?: string | null
  deadline_date?: string | null // YYYY-MM-DD string
  deadline_time?: string | null // HH:MM string
  deadline_recurring?: string | null // 'daily', 'weekly', 'weekday', 'monthly'
  created_at?: string
  updated_at?: string
}

export interface DailyTask {
  id: number
  text: string
  description?: string | null
  time?: string | null
  list_id?: number | null
  deadline_date?: string | null // YYYY-MM-DD string
  deadline_time?: string | null // HH:MM string
  deadline_recurring?: string | null // 'daily', 'weekly', 'weekday', 'monthly'
  created_at?: string
  updated_at?: string
}

export interface Goal {
  id: number
  text: string
  description?: string | null
  is_active?: boolean
  deadline_date?: string | null // YYYY-MM-DD string
  created_at?: string
  updated_at?: string
}

export interface Milestone {
  id: number
  goal_id: number
  name: string
  description?: string | null
  days?: number // Deprecated - calculated from deadline_date
  deadline_date?: string | null // YYYY-MM-DD string
  completed?: boolean
  created_at?: string
  updated_at?: string
}

export interface MilestoneUpdate {
  id: number
  milestone_id: number
  user_id?: string
  content: string
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
    image_url: dbTodo.image_url,
    list_id: dbTodo.list_id,
    milestone_id: dbTodo.milestone_id,
    daily_task_id: dbTodo.daily_task_id,
    parent_task_id: dbTodo.parent_task_id,
    deadline_date: dbTodo.deadline_date,
    deadline_time: dbTodo.deadline_time,
    deadline_recurring: dbTodo.deadline_recurring,
    effort: dbTodo.effort,
    type: dbTodo.type || 'task', // Default to 'task' if not set
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
  
  // Handle image_url/imageUrl - only include if it has a value
  const imageUrlValue = todo.imageUrl !== undefined ? todo.imageUrl : todo.image_url
  if (typeof imageUrlValue === 'string' && imageUrlValue.trim() !== '') {
    dbTodo.image_url = imageUrlValue.trim()
  } else if (imageUrlValue === null || imageUrlValue === undefined) {
    // Explicitly set to null if it's null/undefined to allow clearing the image
    dbTodo.image_url = null
  }
  
  // Handle milestone_id - only set if it's a valid number
  if (todo.milestoneId !== undefined && todo.milestoneId !== null) {
    // Only set milestone_id if it's a valid number (not an object)
    if (typeof todo.milestoneId === 'number') {
      dbTodo.milestone_id = todo.milestoneId
    } else {
      // Log warning if milestoneId is not a number (likely a parameter mismatch bug)
      console.warn('Invalid milestoneId type - expected number, got:', typeof todo.milestoneId, todo.milestoneId);
      // Don't set milestone_id if it's not a number
    }
  } else if (todo.milestone_id !== undefined && todo.milestone_id !== null && typeof todo.milestone_id === 'number') {
    dbTodo.milestone_id = todo.milestone_id
  }
  
  // Handle daily_task_id - only set if it's a valid number
  if (todo.dailyTaskId !== undefined && todo.dailyTaskId !== null) {
    if (typeof todo.dailyTaskId === 'number') {
      dbTodo.daily_task_id = todo.dailyTaskId
    } else {
      console.warn('Invalid dailyTaskId type - expected number, got:', typeof todo.dailyTaskId, todo.dailyTaskId);
    }
  } else if (todo.daily_task_id !== undefined && todo.daily_task_id !== null && typeof todo.daily_task_id === 'number') {
    dbTodo.daily_task_id = todo.daily_task_id
  }
  
  // Handle parent_task_id - only set if it's a valid number
  if (todo.parentTaskId !== undefined && todo.parentTaskId !== null) {
    if (typeof todo.parentTaskId === 'number') {
      dbTodo.parent_task_id = todo.parentTaskId
    } else {
      console.warn('Invalid parentTaskId type - expected number, got:', typeof todo.parentTaskId, todo.parentTaskId);
    }
  } else if (todo.parent_task_id !== undefined && todo.parent_task_id !== null && typeof todo.parent_task_id === 'number') {
    dbTodo.parent_task_id = todo.parent_task_id
  }
  
  if (todo.deadline) {
    // Ensure deadline.date is a Date object (it might be a string if serialized)
    let deadlineDate: Date;
    if (todo.deadline.date instanceof Date) {
      deadlineDate = todo.deadline.date;
    } else if (typeof todo.deadline.date === 'string') {
      deadlineDate = new Date(todo.deadline.date);
    } else {
      console.error('Invalid deadline.date type:', typeof todo.deadline.date, todo.deadline.date);
      deadlineDate = new Date();
    }
    
    dbTodo.deadline_date = formatLocalDate(deadlineDate)
    
    // Convert local time to UTC for storage
    // The user sets a time in their local timezone (e.g., 21:20 in Norway UTC+1)
    // We need to convert it to UTC so the backend can work in UTC
    if (todo.deadline.time && todo.deadline.time.trim() !== '') {
      // Parse the local date and time
      const [hours, minutes] = todo.deadline.time.split(':').map(Number)
      
      // Create a date object in the user's local timezone
      const localDateTime = new Date(
        deadlineDate.getFullYear(),
        deadlineDate.getMonth(),
        deadlineDate.getDate(),
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
  
  // Explicitly exclude the deadline object from dbTodo to prevent it from being inserted
  // The deadline should only be stored as deadline_date, deadline_time, and deadline_recurring
  delete (dbTodo as any).deadline
  
  // Handle effort
  if (todo.effort !== undefined && todo.effort !== null) {
    dbTodo.effort = Math.max(0, Math.min(10, Math.round(todo.effort))) // Clamp between 0-10
  }
  
  // Handle type - always include it, default to 'task' if not specified
  if (todo.type === 'task' || todo.type === 'reminder') {
    dbTodo.type = todo.type
  } else {
    // Default to 'task' if type is undefined, null, or invalid
    dbTodo.type = 'task'
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
    imageUrl: dbTodo.image_url || undefined,
    listId: dbTodo.list_id,
    milestoneId: dbTodo.milestone_id,
    dailyTaskId: dbTodo.daily_task_id,
    parentTaskId: dbTodo.parent_task_id || undefined,
    deadline,
    effort: dbTodo.effort,
    type: dbTodo.type || 'task', // Default to 'task' if not set
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

// Fetch subtasks for a parent task
export async function fetchSubtasks(parentTaskId: number): Promise<Todo[]> {
  const userId = await ensureAuthenticated()
  
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .eq('parent_task_id', parentTaskId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching subtasks:', error)
    throw error
  }

  return data ? data.map(dbTodoToAppTodo) : []
}

export async function fetchTasksByMilestone(milestoneId: number): Promise<Todo[]> {
  const userId = await ensureAuthenticated()
  
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .eq('milestone_id', milestoneId)
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching tasks by milestone:', error)
    throw error
  }

  return data ? data.map(dbTodoToAppTodo) : []
}

export async function createTask(todo: any): Promise<Todo> {
  console.log('createTask called with:', todo)
  const userId = await ensureAuthenticated()
  const dbTodo = appTodoToDbTodo(todo)
  dbTodo.user_id = userId
  
  // Ensure we only include valid database fields
  // Remove any unexpected fields that might cause issues
  const validFields = [
    'text', 'completed', 'time', 'group', 'list_id', 'milestone_id', 'daily_task_id', 'parent_task_id',
    'deadline_date', 'deadline_time', 'deadline_recurring',
    'description', 'image_url', 'effort', 'type', 'user_id'
  ]
  const cleanedDbTodo: any = {}
  for (const field of validFields) {
    if (field in dbTodo) {
      cleanedDbTodo[field] = dbTodo[field]
    }
  }
  
  console.log('Converted to DB format:', cleanedDbTodo)
  
  const { data, error } = await supabase
    .from('todos')
    .insert(cleanedDbTodo)
    .select()
    .single()

  if (error) {
    console.error('Error creating task:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    console.error('Attempted to insert:', JSON.stringify(cleanedDbTodo, null, 2))
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
  
  // Ensure type field is always explicitly set - use the type from todo if it exists, otherwise default to 'task'
  // This ensures the type is always saved even if appTodoToDbTodo didn't set it correctly
  if (todo.type === 'task' || todo.type === 'reminder') {
    dbTodo.type = todo.type
  } else if (!dbTodo.type || (dbTodo.type !== 'task' && dbTodo.type !== 'reminder')) {
    dbTodo.type = 'task' // Default to 'task' if type is missing or invalid
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.ts:updateTask:beforeUpdate',message:'Before Supabase update',data:{taskId:id,userId,dbTodo,originalTodo:todo},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'})}).catch(()=>{});
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

// Common Tasks
export async function fetchCommonTasks(): Promise<CommonTask[]> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.ts:fetchCommonTasks:entry',message:'Fetching common tasks',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  const userId = await ensureAuthenticated()
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.ts:fetchCommonTasks:beforeQuery',message:'Before Supabase query',data:{userId,tableName:'common_tasks'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  const { data, error } = await supabase
    .from('common_tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.ts:fetchCommonTasks:afterQuery',message:'After Supabase query',data:{hasError:!!error,errorCode:error?.code,errorMessage:error?.message,errorDetails:error ? JSON.stringify(error) : null,dataLength:data?.length || 0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  if (error) {
    console.error('Error fetching common tasks:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    throw error
  }

  return data || []
}

export async function createCommonTask(task: { text: string; description?: string | null; time?: string | null; deadline?: { date: Date; time: string; recurring?: string } | null }): Promise<CommonTask> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.ts:createCommonTask:entry',message:'Creating common task',data:{taskText:task.text,hasDescription:!!task.description,hasTime:!!task.time,hasDeadline:!!task.deadline},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  
  const userId = await ensureAuthenticated()
  
  const insertData: any = {
    user_id: userId,
    text: task.text,
    description: task.description || null,
    time: task.time || null,
  }

  if (task.deadline) {
    insertData.deadline_date = formatLocalDate(task.deadline.date)
    if (task.deadline.time && task.deadline.time.trim() !== '') {
      // Convert local time to UTC for storage (same as todos)
      const localDate = task.deadline.date
      const [hours, minutes] = task.deadline.time.split(':').map(Number)
      const localDateTime = new Date(
        localDate.getFullYear(),
        localDate.getMonth(),
        localDate.getDate(),
        hours,
        minutes,
        0,
        0
      )
      const utcHours = localDateTime.getUTCHours()
      const utcMinutes = localDateTime.getUTCMinutes()
      insertData.deadline_time = `${String(utcHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')}`
    } else {
      insertData.deadline_time = null
    }
    insertData.deadline_recurring = task.deadline.recurring || null
  } else {
    insertData.deadline_date = null
    insertData.deadline_time = null
    insertData.deadline_recurring = null
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.ts:createCommonTask:beforeInsert',message:'Before Supabase insert',data:{userId,tableName:'common_tasks',insertData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  
  const { data, error } = await supabase
    .from('common_tasks')
    .insert(insertData)
    .select()
    .single()

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.ts:createCommonTask:afterInsert',message:'After Supabase insert',data:{hasError:!!error,errorCode:error?.code,errorMessage:error?.message,errorDetails:error ? JSON.stringify(error) : null,hasData:!!data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion

  if (error) {
    console.error('Error creating common task:', error)
    throw error
  }

  return data
}

export async function updateCommonTask(id: number, task: { text: string; description?: string | null; time?: string | null; deadline?: { date: Date; time: string; recurring?: string } | null }): Promise<CommonTask> {
  const userId = await ensureAuthenticated()
  
  const updateData: any = {
    text: task.text,
    description: task.description || null,
    time: task.time || null,
  }

  if (task.deadline) {
    updateData.deadline_date = formatLocalDate(task.deadline.date)
    if (task.deadline.time && task.deadline.time.trim() !== '') {
      // Convert local time to UTC for storage (same as todos)
      const localDate = task.deadline.date
      const [hours, minutes] = task.deadline.time.split(':').map(Number)
      const localDateTime = new Date(
        localDate.getFullYear(),
        localDate.getMonth(),
        localDate.getDate(),
        hours,
        minutes,
        0,
        0
      )
      const utcHours = localDateTime.getUTCHours()
      const utcMinutes = localDateTime.getUTCMinutes()
      updateData.deadline_time = `${String(utcHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')}`
    } else {
      updateData.deadline_time = null
    }
    updateData.deadline_recurring = task.deadline.recurring || null
  } else {
    updateData.deadline_date = null
    updateData.deadline_time = null
    updateData.deadline_recurring = null
  }
  
  const { data, error } = await supabase
    .from('common_tasks')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating common task:', error)
    throw error
  }

  return data
}

export async function deleteCommonTask(id: number): Promise<void> {
  const userId = await ensureAuthenticated()
  
  // First, fetch the common task to get its text and recurring pattern
  const { data: commonTask, error: fetchError } = await supabase
    .from('common_tasks')
    .select('text, deadline_recurring')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (fetchError) {
    console.error('Error fetching common task:', fetchError)
    throw fetchError
  }

  if (!commonTask) {
    throw new Error('Common task not found')
  }

  // Find and delete all todos that match this common task
  // Tasks are linked by matching text and recurring pattern
  if (commonTask.text) {
    // Build query to find matching todos
    let todosQuery = supabase
      .from('todos')
      .select('id')
      .eq('text', commonTask.text)
      .or(`user_id.is.null,user_id.eq.${userId}`)

    // If the common task has a recurring pattern, match todos with the same pattern
    if (commonTask.deadline_recurring) {
      todosQuery = todosQuery.eq('deadline_recurring', commonTask.deadline_recurring)
    } else {
      // If no recurring pattern, only match todos that also have no recurring pattern
      // (to avoid deleting manually created tasks with the same text)
      todosQuery = todosQuery.is('deadline_recurring', null)
    }

    const { data: matchingTodos, error: todosError } = await todosQuery

    if (todosError) {
      console.error('Error finding matching todos:', todosError)
      // Continue with deletion even if we can't find todos
    } else if (matchingTodos && matchingTodos.length > 0) {
      // Delete all matching todos
      const todoIds = matchingTodos.map(todo => todo.id)
      const { error: deleteTodosError } = await supabase
        .from('todos')
        .delete()
        .in('id', todoIds)
        .or(`user_id.is.null,user_id.eq.${userId}`)

      if (deleteTodosError) {
        console.error('Error deleting related todos:', deleteTodosError)
        // Continue with common task deletion even if todos deletion fails
      } else {
        console.log(`Deleted ${todoIds.length} todos related to common task ${id}`)
      }
    }
  }

  // Now delete the common task itself
  const { error } = await supabase
    .from('common_tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    console.error('Error deleting common task:', error)
    throw error
  }
}

// Convert database CommonTask to display format (with deadline object)
export function dbCommonTaskToDisplayCommonTask(dbTask: CommonTask): any {
  const parsedDeadlineDate = parseLocalDate(dbTask.deadline_date)
  
  // Convert UTC time back to local time for display
  let displayTime = dbTask.deadline_time || ''
  if (parsedDeadlineDate && dbTask.deadline_time && dbTask.deadline_time.trim() !== '') {
    // Parse UTC time
    const [utcHours, utcMinutes] = dbTask.deadline_time.split(':').map(Number)
    
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
    recurring: dbTask.deadline_recurring,
  } : undefined

  return {
    id: dbTask.id,
    text: dbTask.text,
    description: dbTask.description || undefined,
    time: dbTask.time || undefined,
    deadline,
  }
}

// Daily Tasks
export async function fetchDailyTasks(): Promise<DailyTask[]> {
  const userId = await ensureAuthenticated()
  
  const { data, error } = await supabase
    .from('daily_tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching daily tasks:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    throw error
  }

  return data || []
}

export async function createDailyTask(task: { text: string; description?: string | null; time?: string | null; listId?: number | null }): Promise<DailyTask> {
  const userId = await ensureAuthenticated()
  
  const insertData: any = {
    user_id: userId,
    text: task.text,
    description: task.description || null,
    time: task.time || null,
    list_id: task.listId || null,
    deadline_date: null,
    deadline_time: null,
    deadline_recurring: null,
  }
  
  const { data, error } = await supabase
    .from('daily_tasks')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('Error creating daily task:', error)
    const errorMessage = error.message || error.details || error.hint || 'Unknown error'
    throw new Error(`Failed to create daily task: ${errorMessage}`)
  }

  return data
}

export async function updateDailyTask(id: number, task: { text: string; description?: string | null; time?: string | null; listId?: number | null }): Promise<DailyTask> {
  const userId = await ensureAuthenticated()
  
  const updateData: any = {
    text: task.text,
    description: task.description || null,
    time: task.time || null,
    list_id: task.listId !== undefined ? task.listId : null,
  }
  
  const { data, error } = await supabase
    .from('daily_tasks')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating daily task:', error)
    throw error
  }

  return data
}

export async function deleteDailyTask(id: number): Promise<void> {
  const userId = await ensureAuthenticated()
  
  const { error } = await supabase
    .from('daily_tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    console.error('Error deleting daily task:', error)
    throw error
  }
}

// Convert database DailyTask to display format
export function dbDailyTaskToDisplayDailyTask(dbTask: DailyTask): any {
  return {
    id: dbTask.id,
    text: dbTask.text,
    description: dbTask.description || undefined,
    time: dbTask.time || undefined,
    listId: dbTask.list_id || undefined,
  }
}

// Goals
export async function fetchGoals(): Promise<Goal[]> {
  const userId = await ensureAuthenticated()
  
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching goals:', error)
    throw error
  }

  return data || []
}

export async function createGoal(goal: { text: string; description?: string | null; is_active?: boolean; deadline_date?: string | null }): Promise<Goal> {
  const userId = await ensureAuthenticated()
  
  // If setting to active, check if there are already 4 active goals
  const isActive = goal.is_active !== false; // Default to true if not specified
  
  if (isActive) {
    const { data: activeGoals, error: countError } = await supabase
      .from('goals')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
    
    if (countError) {
      console.error('Error checking active goals:', countError)
      throw countError
    }
    
    if (activeGoals && activeGoals.length >= 4) {
      throw new Error('You can only have 4 active goals at a time. Please deactivate or delete an existing goal first.')
    }
  }
  
  const insertData: any = {
    user_id: userId,
    text: goal.text,
    description: goal.description || null,
    is_active: isActive,
    deadline_date: goal.deadline_date || null,
  }
  
  const { data, error } = await supabase
    .from('goals')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('Error creating goal:', error)
    throw error
  }

  return data
}

export async function updateGoal(id: number, goal: { text: string; description?: string | null; is_active?: boolean; deadline_date?: string | null }): Promise<Goal> {
  const userId = await ensureAuthenticated()
  
  // If setting to active, check if there are already 4 active goals
  if (goal.is_active !== false) {
    const { data: activeGoals, error: countError } = await supabase
      .from('goals')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .neq('id', id) // Exclude the current goal
    
    if (countError) {
      console.error('Error checking active goals:', countError)
      throw countError
    }
    
    if (activeGoals && activeGoals.length >= 4) {
      throw new Error('You can only have 4 active goals at a time. Please deactivate another goal first.')
    }
  }
  
  const updateData: any = {
    text: goal.text,
    description: goal.description || null,
  }
  
  if (goal.is_active !== undefined) {
    updateData.is_active = goal.is_active
  }
  
  if (goal.deadline_date !== undefined) {
    updateData.deadline_date = goal.deadline_date
  }
  
  const { data, error } = await supabase
    .from('goals')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating goal:', error)
    throw error
  }

  return data
}

export async function deleteGoal(id: number): Promise<void> {
  const userId = await ensureAuthenticated()
  
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    console.error('Error deleting goal:', error)
    throw error
  }
}

export type GoalStatus = 'On track' | 'At risk' | 'Failing'

export interface GoalStatusInfo {
  status: GoalStatus
  explanation?: string | null
}

/** Fetch stored goal statuses + explanations from DB (source of truth across devices). */
export async function fetchGoalStatuses(): Promise<Record<number, GoalStatusInfo>> {
  const userId = await ensureAuthenticated()
  const { data, error } = await supabase
    .from('goal_statuses')
    .select('goal_id, status, explanation')
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching goal statuses:', error)
    throw error
  }

  const out: Record<number, GoalStatusInfo> = {}
  for (const row of data || []) {
    const s = row.status as GoalStatus
    if (s === 'On track' || s === 'At risk' || s === 'Failing') {
      out[Number(row.goal_id)] = {
        status: s,
        explanation: row.explanation != null ? String(row.explanation) : null,
      }
    }
  }
  return out
}

/** Upsert goal statuses + explanations after AI API returns. Keeps DB in sync across devices. */
export async function upsertGoalStatuses(
  statuses: Record<number, GoalStatus>,
  explanations?: Record<number, string> | null
): Promise<void> {
  const userId = await ensureAuthenticated()
  const rows = Object.entries(statuses).map(([goalId, status]) => ({
    user_id: userId,
    goal_id: Number(goalId),
    status,
    explanation: explanations && explanations[Number(goalId)] != null ? explanations[Number(goalId)] : null,
    updated_at: new Date().toISOString(),
  }))

  if (rows.length === 0) return

  const { error } = await supabase.from('goal_statuses').upsert(rows, {
    onConflict: 'user_id,goal_id',
    ignoreDuplicates: false,
  })

  if (error) {
    console.error('Error upserting goal statuses:', error)
    throw error
  }
}

// Convert database Goal to display format
export function dbGoalToDisplayGoal(dbGoal: Goal): any {
  return {
    id: dbGoal.id,
    text: dbGoal.text,
    description: dbGoal.description || undefined,
    is_active: dbGoal.is_active !== false, // Default to true if not set
    deadline_date: dbGoal.deadline_date || undefined,
  }
}

// Milestones
export async function fetchMilestones(goalId: number): Promise<Milestone[]> {
  const userId = await ensureAuthenticated()
  
  // Verify the goal belongs to the user
  const { data: goal } = await supabase
    .from('goals')
    .select('id')
    .eq('id', goalId)
    .eq('user_id', userId)
    .single()
  
  if (!goal) {
    throw new Error('Goal not found or access denied')
  }
  
  const { data, error } = await supabase
    .from('milestones')
    .select('*')
    .eq('goal_id', goalId)
    .order('days', { ascending: true })

  if (error) {
    console.error('Error fetching milestones:', error)
    throw error
  }

  return data || []
}

// Fetch all milestones for multiple goals in parallel
export async function fetchAllMilestones(goalIds: number[]): Promise<Array<{ id: number; name: string; goalId: number; goalName: string }>> {
  if (goalIds.length === 0) return [];
  
  const userId = await ensureAuthenticated();
  
  // Fetch all goals first to get their text for the result
  const { data: goalsData, error: goalsError } = await supabase
    .from('goals')
    .select('id, text')
    .in('id', goalIds)
    .eq('user_id', userId);
  
  if (goalsError) {
    console.error('Error fetching goals for milestones:', goalsError);
    throw goalsError;
  }
  
  if (!goalsData || goalsData.length === 0) {
    return [];
  }
  
  // Create a map of goal ID to goal text
  const goalMap = new Map(goalsData.map(g => [g.id, g.text]));
  
  // Fetch all milestones for these goals in a single query
  const { data, error } = await supabase
    .from('milestones')
    .select('*')
    .in('goal_id', goalIds)
    .order('days', { ascending: true });
  
  if (error) {
    console.error('Error fetching all milestones:', error);
    throw error;
  }
  
  // Transform to match existing format with goal name
  return (data || []).map(m => ({
    id: m.id,
    name: m.name,
    goalId: m.goal_id,
    goalName: goalMap.get(m.goal_id) || 'Unknown Goal'
  }));
}

export async function createMilestone(milestone: { goal_id: number; name: string; description?: string | null; deadline?: { date: Date; time: string; recurring?: string } | null }): Promise<Milestone> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.ts:createMilestone:entry',message:'Creating milestone',data:{goalId:milestone.goal_id,name:milestone.name,hasDeadline:!!milestone.deadline,deadlineDate:milestone.deadline?.date?.toISOString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  const userId = await ensureAuthenticated()
  
  // Verify the goal belongs to the user
  const { data: goal } = await supabase
    .from('goals')
    .select('id')
    .eq('id', milestone.goal_id)
    .eq('user_id', userId)
    .single()
  
  if (!goal) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.ts:createMilestone:goalNotFound',message:'Goal not found',data:{goalId:milestone.goal_id,userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    throw new Error('Goal not found or access denied')
  }
  
  const insertData: any = {
    goal_id: milestone.goal_id,
    name: milestone.name,
    description: milestone.description || null,
  }
  
  if (milestone.deadline) {
    const formattedDate = formatLocalDate(milestone.deadline.date)
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.ts:createMilestone:formattingDeadline',message:'Formatting deadline date',data:{originalDate:milestone.deadline.date?.toISOString(),formattedDate},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    insertData.deadline_date = formattedDate
  } else {
    insertData.deadline_date = null
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.ts:createMilestone:beforeInsert',message:'Before Supabase insert',data:{insertData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  
  const { data, error } = await supabase
    .from('milestones')
    .insert(insertData)
    .select()
    .single()

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.ts:createMilestone:afterInsert',message:'After Supabase insert',data:{hasError:!!error,errorCode:error?.code,errorMessage:error?.message,errorDetails:error ? JSON.stringify(error) : null,hasData:!!data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion

  if (error) {
    console.error('Error creating milestone:', error)
    throw error
  }

  return data
}

export async function updateMilestone(id: number, milestone: { name: string; description?: string | null; deadline?: { date: Date; time: string; recurring?: string } | null; achieved?: boolean }): Promise<Milestone> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.ts:updateMilestone:entry',message:'Updating milestone',data:{milestoneId:id,name:milestone.name,hasDeadline:!!milestone.deadline,deadlineDate:milestone.deadline?.date?.toISOString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  
  const userId = await ensureAuthenticated()
  
  // Verify the milestone's goal belongs to the user
  const { data: milestoneData } = await supabase
    .from('milestones')
    .select('goal_id')
    .eq('id', id)
    .single()
  
  if (!milestoneData) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.ts:updateMilestone:milestoneNotFound',message:'Milestone not found',data:{milestoneId:id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    throw new Error('Milestone not found')
  }
  
  const { data: goalData } = await supabase
    .from('goals')
    .select('user_id')
    .eq('id', milestoneData.goal_id)
    .eq('user_id', userId)
    .single()
  
  if (!goalData) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.ts:updateMilestone:accessDenied',message:'Access denied',data:{milestoneId:id,goalId:milestoneData.goal_id,userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    throw new Error('Milestone not found or access denied')
  }
  
  const updateData: any = {
    name: milestone.name,
    description: milestone.description !== undefined ? (milestone.description || null) : undefined,
  }
  
  if (milestone.deadline) {
    const formattedDate = formatLocalDate(milestone.deadline.date)
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.ts:updateMilestone:formattingDeadline',message:'Formatting deadline date',data:{originalDate:milestone.deadline.date?.toISOString(),formattedDate},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
    // #endregion
    updateData.deadline_date = formattedDate
  } else {
    updateData.deadline_date = null
  }
  
  // Handle achieved status (using completed field in database)
  if (milestone.achieved !== undefined) {
    updateData.completed = milestone.achieved
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.ts:updateMilestone:beforeUpdate',message:'Before Supabase update',data:{milestoneId:id,updateData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
  // #endregion
  
  const { data, error } = await supabase
    .from('milestones')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.ts:updateMilestone:afterUpdate',message:'After Supabase update',data:{hasError:!!error,errorCode:error?.code,errorMessage:error?.message,errorDetails:error ? JSON.stringify(error) : null,hasData:!!data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'K'})}).catch(()=>{});
  // #endregion

  if (error) {
    console.error('Error updating milestone:', error)
    throw error
  }

  return data
}

export async function deleteMilestone(id: number): Promise<void> {
  const userId = await ensureAuthenticated()
  
  // Verify the milestone's goal belongs to the user
  const { data: milestoneData } = await supabase
    .from('milestones')
    .select('goal_id')
    .eq('id', id)
    .single()
  
  if (!milestoneData) {
    throw new Error('Milestone not found')
  }
  
  const { data: goalData } = await supabase
    .from('goals')
    .select('user_id')
    .eq('id', milestoneData.goal_id)
    .eq('user_id', userId)
    .single()
  
  if (!goalData) {
    throw new Error('Milestone not found or access denied')
  }
  
  const { error } = await supabase
    .from('milestones')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting milestone:', error)
    throw error
  }
}

// Milestone Updates
export async function fetchMilestoneUpdates(milestoneId: number): Promise<MilestoneUpdate[]> {
  const userId = await ensureAuthenticated()
  
  // Verify the milestone's goal belongs to the user
  const { data: milestoneData } = await supabase
    .from('milestones')
    .select('goal_id')
    .eq('id', milestoneId)
    .single()
  
  if (!milestoneData) {
    throw new Error('Milestone not found')
  }
  
  const { data: goalData } = await supabase
    .from('goals')
    .select('user_id')
    .eq('id', milestoneData.goal_id)
    .eq('user_id', userId)
    .single()
  
  if (!goalData) {
    throw new Error('Goal not found or access denied')
  }
  
  const { data, error } = await supabase
    .from('milestone_updates')
    .select('*')
    .eq('milestone_id', milestoneId)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching milestone updates:', error)
    throw error
  }
  
  return data || []
}

export async function createMilestoneUpdate(milestoneId: number, content: string): Promise<MilestoneUpdate> {
  const userId = await ensureAuthenticated()
  
  // Verify the milestone's goal belongs to the user
  const { data: milestoneData } = await supabase
    .from('milestones')
    .select('goal_id')
    .eq('id', milestoneId)
    .single()
  
  if (!milestoneData) {
    throw new Error('Milestone not found')
  }
  
  const { data: goalData } = await supabase
    .from('goals')
    .select('user_id')
    .eq('id', milestoneData.goal_id)
    .eq('user_id', userId)
    .single()
  
  if (!goalData) {
    throw new Error('Goal not found or access denied')
  }
  
  const { data, error } = await supabase
    .from('milestone_updates')
    .insert({
      milestone_id: milestoneId,
      user_id: userId,
      content: content.trim()
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating milestone update:', error)
    throw error
  }
  
  return data
}

export async function updateMilestoneUpdate(id: number, content: string): Promise<MilestoneUpdate> {
  const userId = await ensureAuthenticated()
  
  // Verify the update belongs to the user
  const { data: updateData } = await supabase
    .from('milestone_updates')
    .select('user_id')
    .eq('id', id)
    .single()
  
  if (!updateData) {
    throw new Error('Milestone update not found')
  }
  
  if (updateData.user_id !== userId) {
    throw new Error('Access denied')
  }
  
  const { data, error } = await supabase
    .from('milestone_updates')
    .update({ content: content.trim() })
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating milestone update:', error)
    throw error
  }
  
  return data
}

export async function deleteMilestoneUpdate(id: number): Promise<void> {
  const userId = await ensureAuthenticated()
  
  // Verify the update belongs to the user
  const { data: updateData } = await supabase
    .from('milestone_updates')
    .select('user_id')
    .eq('id', id)
    .single()
  
  if (!updateData) {
    throw new Error('Milestone update not found')
  }
  
  if (updateData.user_id !== userId) {
    throw new Error('Access denied')
  }
  
  const { error } = await supabase
    .from('milestone_updates')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting milestone update:', error)
    throw error
  }
}

// Fetch updates for multiple milestones at once
export async function fetchMilestoneUpdatesForMilestones(milestoneIds: number[]): Promise<MilestoneUpdate[]> {
  if (milestoneIds.length === 0) return []
  
  const userId = await ensureAuthenticated()
  
  // Verify all milestones belong to the user's goals
  const { data: milestonesData } = await supabase
    .from('milestones')
    .select('id, goal_id')
    .in('id', milestoneIds)
  
  if (!milestonesData || milestonesData.length === 0) {
    return []
  }
  
  // Get all goal IDs and verify they belong to the user
  const goalIds = [...new Set(milestonesData.map(m => m.goal_id))]
  const { data: goalsData } = await supabase
    .from('goals')
    .select('id')
    .in('id', goalIds)
    .eq('user_id', userId)
  
  if (!goalsData || goalsData.length === 0) {
    return []
  }
  
  const validGoalIds = goalsData.map(g => g.id)
  const validMilestoneIds = milestonesData
    .filter(m => validGoalIds.includes(m.goal_id))
    .map(m => m.id)
  
  if (validMilestoneIds.length === 0) {
    return []
  }
  
  const { data, error } = await supabase
    .from('milestone_updates')
    .select('*')
    .in('milestone_id', validMilestoneIds)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching milestone updates:', error)
    throw error
  }
  
  return data || []
}

