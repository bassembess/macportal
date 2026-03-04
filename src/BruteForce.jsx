import { useState } from 'react'
import { supabase } from './lib/supabase'
import './BruteForce.css'

export default function BruteForce({ session, onComplete }) {
  const [url, setUrl] = useState('')
  const [speed, setSpeed] = useState('normal')
  const [useProxy, setUseProxy] = useState(false)
  const [proxyUrl, setProxyUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [error, setError] = useState(null)

  const handleStart = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const speedMap = { slow: 25, normal: 50, fast: 75 }

      const { data: sessionData, error: err } = await supabase
        .from('test_sessions')
        .insert({
          user_id: session.user.id,
          target_url: url,
          status: 'running',
          proxy_url: useProxy ? proxyUrl : null,
          speed: speedMap[speed],
        })
        .select()
        .maybeSingle()

      if (err) throw err

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bruteforce`
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionData.id,
          url,
          speed: speedMap[speed],
          use_proxy: useProxy,
          proxy_url: useProxy ? proxyUrl : null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`API error: ${response.status} - ${errorData}`)
      }

      const data = await response.json()
      setResults(data.results || [])

      await supabase
        .from('test_sessions')
        .update({
          status: 'completed',
          total_macs: data.results?.length || 0,
          successful_macs: data.results?.filter(r => r.valid).length || 0,
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionData.id)

      onComplete()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bruteforce">
      <div className="section">
        <h2>Configuration</h2>
        <form onSubmit={handleStart}>
          <div className="form-group">
            <label>Portal URL</label>
            <input type="url" placeholder="http://example.com:8000" value={url} onChange={(e) => setUrl(e.target.value)} required disabled={loading} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Speed</label>
              <select value={speed} onChange={(e) => setSpeed(e.target.value)} disabled={loading}>
                <option value="slow">Slow (25 req/s)</option>
                <option value="normal">Normal (50 req/s)</option>
                <option value="fast">Fast (75 req/s)</option>
              </select>
            </div>

            <div className="form-group checkbox">
              <input id="proxy" type="checkbox" checked={useProxy} onChange={(e) => setUseProxy(e.target.checked)} disabled={loading} />
              <label htmlFor="proxy">Use Proxy</label>
            </div>
          </div>

          {useProxy && (
            <div className="form-group">
              <label>Proxy URL</label>
              <input type="url" placeholder="http://proxy:8080" value={proxyUrl} onChange={(e) => setProxyUrl(e.target.value)} disabled={loading} />
            </div>
          )}

          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={loading}>{loading ? 'Testing...' : 'Start Test'}</button>
        </form>
      </div>

      {results.length > 0 && (
        <div className="section">
          <h2>Results</h2>
          <div className="stats">
            <div className="stat"><span className="label">Total</span><span className="value">{results.length}</span></div>
            <div className="stat valid"><span className="label">Valid</span><span className="value">{results.filter(r => r.valid).length}</span></div>
            <div className="stat invalid"><span className="label">Invalid</span><span className="value">{results.filter(r => !r.valid).length}</span></div>
          </div>
          <div className="table">
            <div className="table-header"><div>MAC Address</div><div>Status</div><div>Response Time</div></div>
            <div className="table-body">
              {results.map((r, i) => (
                <div key={i} className="table-row">
                  <div>{r.mac}</div>
                  <div className={`status ${r.valid ? 'valid' : 'invalid'}`}>{r.valid ? '✓' : '✗'}</div>
                  <div>{r.time}ms</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
