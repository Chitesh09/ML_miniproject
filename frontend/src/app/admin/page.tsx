'use client';
import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [metrics, setMetrics] = useState<any>(null);

  const fetchMetrics = () => {
    fetch('http://localhost:8000/api/admin/metrics')
      .then(res => res.json())
      .then(data => setMetrics(data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchMetrics();
    // Auto refresh every 5s
    const int = setInterval(fetchMetrics, 5000);
    return () => clearInterval(int);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-10 font-sans text-gray-800 dark:text-gray-200">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-extrabold text-blue-900 dark:text-blue-400 tracking-tight">Admin Metrics Dashboard</h1>
          <a href="/" className="px-4 py-2 bg-gray-200 dark:bg-gray-800 rounded-lg shadow font-medium hover:bg-gray-300 dark:hover:bg-gray-700 transition">Back to App</a>
        </div>
        <p className="text-gray-500">Live KPIs and ML system interaction monitoring.</p>
        
        {metrics ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
              <h3 className="text-gray-500 uppercase font-bold text-xs">Total Recommends</h3>
              <p className="text-4xl font-extrabold text-indigo-600 mt-2">{metrics.raw_stats.total_recommendations_served}</p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
               <h3 className="text-gray-500 uppercase font-bold text-xs">A/B Test CTR</h3>
               <p className="text-4xl font-extrabold text-green-500 mt-2">{metrics.ctr_percent}%</p>
               <p className="text-xs text-gray-400 mt-2">({metrics.raw_stats.total_clicks} Clicks)</p>
            </div>
            
             <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
               <h3 className="text-gray-500 uppercase font-bold text-xs">Redis Cache Hits</h3>
               <p className="text-4xl font-extrabold text-orange-500 mt-2">{metrics.raw_stats.cache_hits}</p>
               <p className="text-xs text-gray-400 mt-2">Sub-200ms requests</p>
            </div>
            
             <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
               <h3 className="text-gray-500 uppercase font-bold text-xs">Precision (Feedback)</h3>
               <p className="text-4xl font-extrabold text-blue-500 mt-2">{metrics.precision_percent}%</p>
               <div className="flex gap-4 mt-2 text-xs font-bold">
                 <span className="text-green-500">👍 {metrics.raw_stats.feedback_positive}</span> 
                 <span className="text-red-500">👎 {metrics.raw_stats.feedback_negative}</span>
               </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-400">Loading metrics...</p>
        )}
      </div>
    </div>
  );
}
