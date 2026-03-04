import { useState } from 'react'
import { supabase } from './lib/supabase'
import BruteForce from './BruteForce'
import History from './History'
import './Dashboard.css'

export default function Dashboard({ session }) {
  const [activeTab, setActiveTab] = useState('bruteforce')
  const [refresh, setRefresh] = useState(0)

  return (
    <div className="dashboard">
      <header className="header">
        <div className="header-content">
          <h1>MacAttack</h1>
          <div className="user-info">
            <span>{session.user.email}</span>
            <button onClick={() => supabase.auth.signOut()} className="logout">Logout</button>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        <nav className="tabs">
          <button className={`tab ${activeTab === 'bruteforce' ? 'active' : ''}`} onClick={() => setActiveTab('bruteforce')}>Brute Force</button>
          <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>History</button>
        </nav>

        <main className="content">
          {activeTab === 'bruteforce' && <BruteForce session={session} onComplete={() => setRefresh(r => r + 1)} />}
          {activeTab === 'history' && <History session={session} refresh={refresh} />}
        </main>
      </div>
    </div>
  )
}
