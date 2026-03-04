import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import './History.css'

export default function History({ session, refresh }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSessions()
  }, [refresh])

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('test_sessions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSessions(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await supabase.from('test_results').delete().eq('session_id', id)
      await supabase.from('test_sessions').delete().eq('id', id)
      setSessions(sessions.filter(s => s.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return <div className="history-empty">Loading...</div>
  if (sessions.length === 0) return <div className="history-empty"><p>No tests yet</p></div>

  return (
    <div className="history">
      {sessions.map(s => (
        <div key={s.id} className="history-item">
          <div className="item-header">
            <div>
              <h3>{s.target_url}</h3>
              <div className="meta">{new Date(s.created_at).toLocaleString()} • {s.total_macs || 0} MACs • {s.successful_macs || 0} valid</div>
            </div>
            <button onClick={() => handleDelete(s.id)} className="delete">🗑️</button>
          </div>
        </div>
      ))}
    </div>
  )
}
