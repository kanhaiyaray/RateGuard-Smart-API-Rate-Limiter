import React, { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import TestResults from './TestResults';
import TestConfiguration from './TestConfiguration';
import Spinner from '../common/Spinner';

const parseJsonField = (value) => {
  if (typeof value !== 'string') return value;
  try {
    return value.trim() ? JSON.parse(value) : {};
  } catch {
    return value;
  }
};

const APITester = () => {
  const { showToast } = useToast();

  const [config, setConfig] = useState({
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    method: 'GET',
    headers: {},
    body: '',
    requestsPerMinute: 20,
    duration: 30,
    concurrent: 5,
  });
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState(0);
  const [liveStats, setLiveStats] = useState({
    requests: 0,
    successes: 0,
    rateLimited: 0,
  });

  const predefinedAPIs = [
    {
      name: 'JSONPlaceholder (GET)',
      url: 'https://jsonplaceholder.typicode.com/posts/1',
      method: 'GET',
    },
    {
      name: 'JSONPlaceholder (POST)',
      url: 'https://jsonplaceholder.typicode.com/posts',
      method: 'POST',
      body: JSON.stringify({ title: 'Test', body: 'Content', userId: 1 }, null, 2),
    },
    {
      name: 'GitHub API (Public)',
      url: 'https://api.github.com/repos/facebook/react',
      method: 'GET',
      headers: JSON.stringify({ Accept: 'application/vnd.github.v3+json' }, null, 2),
    },
    {
      name: 'RateGuard Health',
      url: `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/health`,
      method: 'GET',
    },
  ];

  const handleConfigChange = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handlePresetSelect = (preset) => {
    setConfig((prev) => ({
      ...prev,
      url: preset.url,
      method: preset.method,
      body: preset.body || '',
      headers: preset.headers || {},
    }));
  };

  const runTest = async () => {
    if (!config.url) {
      showToast('Please enter a valid URL', 'error');
      return;
    }

    setTesting(true);
    setResults(null);
    setProgress(0);
    setLiveStats({ requests: 0, successes: 0, rateLimited: 0 });

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 2, 95));
    }, 1000);

    try {
      const bodyPayload = parseJsonField(config.body);
      const headersPayload = parseJsonField(config.headers);

      const response = await api.post('/tester/test', {
        ...config,
        body: bodyPayload,
        headers: typeof headersPayload === 'string' ? {} : headersPayload,
      });

      setResults(response.data.data);
      setProgress(100);
      showToast('✅ Test completed successfully!', 'success');
    } catch (err) {
      console.error('❌ Test failed:', err);
      showToast(err.response?.data?.message || 'Test failed. Please try again.', 'error');
    } finally {
      clearInterval(progressInterval);
      setTesting(false);
      setProgress(100);
    }
  };

  return (
    <div className="api-tester-container">
      <div className="tester-header glass rounded-2xl p-6 border border-white/5">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <i className="fas fa-flask text-blue-400"></i>
          API Load Tester
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Test any API endpoint with rate limiting simulation. Perfect for testing your own APIs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-1">
          <div className="glass rounded-2xl p-5 border border-white/5">
            <h3 className="font-semibold text-white mb-4">
              <i className="fas fa-sliders-h mr-2 text-blue-400"></i>
              Test Configuration
            </h3>

            <div className="mb-4">
              <label className="text-xs text-gray-400 block mb-2">Quick Presets</label>
              <div className="flex flex-wrap gap-2">
                {predefinedAPIs.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePresetSelect(preset)}
                    className="px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 transition"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <TestConfiguration config={config} onChange={handleConfigChange} disabled={testing} />

            <button
              onClick={runTest}
              disabled={testing}
              className={`w-full mt-4 py-3 rounded-xl font-medium text-white transition transform hover:scale-[1.02] ${testing
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:shadow-blue-500/20'
                }`}
            >
              {testing ? (
                <>
                  <Spinner size="sm" color="white" className="inline mr-2" />
                  Testing...
                </>
              ) : (
                <>
                  <i className="fas fa-play mr-2"></i>
                  Run Test
                </>
              )}
            </button>

            {testing && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 mt-1 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {testing && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-white/5 rounded-lg">
                  <div className="text-lg font-bold text-blue-400">{liveStats.requests}</div>
                  <div className="text-[10px] text-gray-500">Requests</div>
                </div>
                <div className="text-center p-2 bg-white/5 rounded-lg">
                  <div className="text-lg font-bold text-emerald-400">{liveStats.successes}</div>
                  <div className="text-[10px] text-gray-500">Success</div>
                </div>
                <div className="text-center p-2 bg-white/5 rounded-lg">
                  <div className="text-lg font-bold text-red-400">{liveStats.rateLimited}</div>
                  <div className="text-[10px] text-gray-500">Rate Limited</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="glass rounded-2xl p-5 border border-white/5 min-h-[400px]">
            {results ? (
              <TestResults results={results} />
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <i className="fas fa-rocket text-3xl text-gray-600"></i>
                </div>
                <h4 className="text-white font-medium">Ready to Test</h4>
                <p className="text-gray-500 text-sm mt-1 max-w-md">
                  Configure your API test above and click &quot;Run Test&quot; to see real-time results.
                  <br />
                  <span className="text-xs text-gray-600">
                    Supports GET, POST, PUT, DELETE, PATCH with custom headers and body
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default APITester;
