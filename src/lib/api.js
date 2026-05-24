import { supabase } from '../supabase'

export async function fetchUnits(gradeId) {
  const { data, error } = await supabase
    .from('units')
    .select('*')
    .eq('grade_id', gradeId)
    .order('position')
  if (error) throw error
  return data
}

export async function fetchQuestions(unitId) {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('unit_id', unitId)
    .order('position')
  if (error) throw error
  return data
}