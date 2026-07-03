import React from 'react';

const TestConfiguration = ({ config, onChange, disabled }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-gray-400 block mb-1">API URL</label>
        <input
          type="url"
          value={config.url}
          onChange={(e) => onChange('url', e.target.value)}
          disabled={disabled}
          placeholder="https://api.example.com/endpoint"
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
        />
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-1">Method</label>
        <select
          value={config.method}
          onChange={(e) => onChange('method', e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
        </select>
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-1">
          Headers (JSON) <span className="text-gray-500">optional</span>
        </label>
        <textarea
          value={typeof config.headers === 'object' ? JSON.stringify(config.headers, null, 2) : config.headers}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              onChange('headers', parsed);
            } catch {
              onChange('headers', e.target.value);
            }
          }}
          disabled={disabled}
          placeholder='{"Authorization": "Bearer token"}'
          rows="2"
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
        />
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-1">
          Request Body (JSON) <span className="text-gray-500">optional</span>
        </label>
        <textarea
          value={config.body}
          onChange={(e) => onChange('body', e.target.value)}
          disabled={disabled}
          placeholder='{"key": "value"}'
          rows="2"
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Req/Min</label>
          <input
            type="number"
            value={config.requestsPerMinute}
            onChange={(e) => onChange('requestsPerMinute', parseInt(e.target.value, 10) || 20)}
            disabled={disabled}
            min="1"
            max="1000"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
          />
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Duration (sec)</label>
          <input
            type="number"
            value={config.duration}
            onChange={(e) => onChange('duration', parseInt(e.target.value, 10) || 30)}
            disabled={disabled}
            min="5"
            max="300"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
          />
        </div>

        <div className="col-span-2">
          <label className="text-xs text-gray-400 block mb-1">Concurrent Requests</label>
          <input
            type="number"
            value={config.concurrent}
            onChange={(e) => onChange('concurrent', parseInt(e.target.value, 10) || 5)}
            disabled={disabled}
            min="1"
            max="50"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
          />
        </div>
      </div>
    </div>
  );
};

export default TestConfiguration;
