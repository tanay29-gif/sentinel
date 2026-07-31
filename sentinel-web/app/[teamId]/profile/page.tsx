import { createClient } from '@/lib/supabase/server' // Path to your server client helper
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()

  // 1. Get the authenticated user from the session cookie
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  // 2. If no user is found, redirect them back to login
  if (authError || !user) {
    redirect('/login')
  }

  // 3. Get profile data from your "profiles" table (if you have one)
  // Assuming your table is called 'profiles' and has a 'id' column matching the user id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="p-8">
      <h1>Welcome to your Dashboard</h1>
      <p>Email: {user.email}</p>
      
      {profile ? (
        <div>
          <p>Username: {profile.username}</p>
          <p>Bio: {profile.bio}</p>
        </div>
      ) : (
        <p>No profile data found in the database.</p>
      )}
    </div>
  )
}