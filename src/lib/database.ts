import { supabase } from './supabase'

export interface Todo {
  id: number
  text: string
  completed: boolean
  time?: string
  group?: string
  list_id?: number // -1 for completed, 0 for today, positive numbers for custom lists
  deadline_date?: string // ISO date string
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
  
  if (todo.deadline) {
    dbTodo.deadline_date = todo.deadline.date ? todo.deadline.date.toISOString().split('T')[0] : null
    dbTodo.deadline_time = todo.deadline.time || null
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
  const deadline = dbTodo.deadline_date ? {
    date: new Date(dbTodo.deadline_date),
    time: dbTodo.deadline_time || '',
    recurring: dbTodo.deadline_recurring,
  } : undefined

  return {
    id: dbTodo.id,
    text: dbTodo.text,
    completed: dbTodo.completed,
    time: dbTodo.time,
    group: dbTodo.group,
    listId: dbTodo.list_id,
    deadline,
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
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching tasks:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    throw error
  }

  return data ? data.map(dbTodoToAppTodo) : []
}

export async function createTask(todo: any): Promise<Todo> {
  const dbTodo = appTodoToDbTodo(todo)
  const { data, error } = await supabase
    .from('todos')
    .insert(dbTodo)
    .select()
    .single()

  if (error) {
    console.error('Error creating task:', error)
    throw error
  }

  return dbTodoToAppTodo(data)
}

export async function updateTask(id: number, todo: any): Promise<Todo> {
  const dbTodo = appTodoToDbTodo(todo)
  const { data, error } = await supabase
    .from('todos')
    .update(dbTodo)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating task:', error)
    throw error
  }

  return dbTodoToAppTodo(data)
}

export async function deleteTask(id: number): Promise<void> {
  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting task:', error)
    throw error
  }
}

// Lists
export async function fetchLists(): Promise<ListItem[]> {
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching lists:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    throw error
  }

  return data ? data.map(dbListToAppList) : []
}

export async function createList(list: { name: string; color: string; isShared: boolean }): Promise<ListItem> {
  const { data, error } = await supabase
    .from('lists')
    .insert({
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
  const { data, error } = await supabase
    .from('lists')
    .update({
      name: list.name,
      color: list.color,
      is_shared: list.isShared,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating list:', error)
    throw error
  }

  return dbListToAppList(data)
}

export async function deleteList(id: number): Promise<void> {
  // First, move all tasks from this list to Today (list_id = 0)
  await supabase
    .from('todos')
    .update({ list_id: 0 })
    .eq('list_id', id)

  // Then delete the list
  const { error } = await supabase
    .from('lists')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting list:', error)
    throw error
  }
}

