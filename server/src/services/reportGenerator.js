// server/src/services/reportGenerator.js
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const Analytics = require('../models/Analytics');
const User = require('../models/User');
const App = require('../models/App');
const fs = require('fs');
const path = require('path');

class ReportGenerator {
  constructor() {
    this.reports = new Map();
    this.reportDir = path.join(__dirname, '../../reports');
    
    // Ensure reports directory exists
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  async generate(options) {
    const { format = 'pdf', dateRange, app, userId } = options;
    
    // Collect data
    const data = await this.collectData(dateRange, app);
    
    // Generate report based on format
    let reportData;
    let mimeType;
    let filename;
    
    if (format === 'pdf') {
      reportData = await this.generatePDF(data);
      mimeType = 'application/pdf';
      filename = `rateguard-report-${Date.now()}.pdf`;
    } else if (format === 'csv') {
      reportData = await this.generateCSV(data);
      mimeType = 'text/csv';
      filename = `rateguard-report-${Date.now()}.csv`;
    } else {
      throw new Error('Unsupported format');
    }

    // Save report
    const reportId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const filePath = path.join(this.reportDir, filename);
    fs.writeFileSync(filePath, reportData);

    const report = {
      id: reportId,
      filename,
      filePath,
      mimeType,
      data: reportData,
      createdAt: new Date().toISOString(),
      userId,
      format,
      dateRange,
      app
    };

    this.reports.set(reportId, report);
    
    // Clean up old reports (keep last 50)
    if (this.reports.size > 50) {
      const oldest = Array.from(this.reports.keys()).slice(0, this.reports.size - 50);
      for (const id of oldest) {
        const oldReport = this.reports.get(id);
        if (oldReport && fs.existsSync(oldReport.filePath)) {
          fs.unlinkSync(oldReport.filePath);
        }
        this.reports.delete(id);
      }
    }

    return report;
  }

  async collectData(dateRange, appName) {
    const startDate = dateRange?.start ? new Date(dateRange.start) : new Date();
    startDate.setDate(startDate.getDate() - 7);
    const endDate = dateRange?.end ? new Date(dateRange.end) : new Date();

    const query = {
      timestamp: { $gte: startDate, $lte: endDate }
    };
    if (appName && appName !== 'all') {
      query.app = appName;
    }

    const analytics = await Analytics.find(query).populate('userId', 'name email plan');
    const users = await User.find();
    const apps = await App.find();

    // Aggregate statistics
    const totalRequests = analytics.length;
    const blockedRequests = analytics.filter(a => a.blocked).length;
    const uniqueUsers = new Set(analytics.map(a => a.userId?._id?.toString())).size;

    // Daily statistics
    const dailyStats = {};
    for (const record of analytics) {
      const date = record.timestamp.toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { requests: 0, blocked: 0 };
      }
      dailyStats[date].requests += 1;
      if (record.blocked) {
        dailyStats[date].blocked += 1;
      }
    }

    // App statistics
    const appStats = {};
    for (const app of apps) {
      const appData = analytics.filter(a => a.app === app.name);
      appStats[app.name] = {
        requests: appData.length,
        blocked: appData.filter(a => a.blocked).length,
        users: new Set(appData.map(a => a.userId?._id?.toString())).size
      };
    }

    // User statistics
    const userStats = {};
    for (const user of users) {
      const userData = analytics.filter(a => a.userId?._id?.toString() === user._id.toString());
      userStats[user.email] = {
        name: user.name,
        plan: user.plan,
        requests: userData.length,
        blocked: userData.filter(a => a.blocked).length
      };
    }

    return {
      period: { start: startDate, end: endDate },
      summary: {
        totalRequests,
        blockedRequests,
        uniqueUsers,
        blockRate: totalRequests > 0 ? (blockedRequests / totalRequests * 100).toFixed(2) : 0
      },
      dailyStats: Object.entries(dailyStats).map(([date, stats]) => ({ date, ...stats })),
      appStats,
      userStats,
      topEndpoints: await this.getTopEndpoints(query),
      responseTimeStats: await this.getResponseTimeStats(query)
    };
  }

  async getTopEndpoints(query) {
    const data = await Analytics.aggregate([
      { $match: query },
      { $group: { _id: { endpoint: '$endpoint', method: '$method' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    return data.map(d => ({
      endpoint: d._id.endpoint,
      method: d._id.method,
      count: d.count
    }));
  }

  async getResponseTimeStats(query) {
    const data = await Analytics.aggregate([
      { $match: query },
      { $group: { 
        _id: null,
        avg: { $avg: '$responseTime' },
        min: { $min: '$responseTime' },
        max: { $max: '$responseTime' }
      }}
    ]);
    
    return data[0] || { avg: 0, min: 0, max: 0 };
  }

  async generatePDF(data) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Title
        doc.fontSize(24).text('RateGuard Analytics Report', { align: 'center' });
        doc.moveDown();

        // Date range
        doc.fontSize(12);
        doc.text(`Report Period: ${data.period.start.toDateString()} - ${data.period.end.toDateString()}`);
        doc.text(`Generated: ${new Date().toISOString()}`);
        doc.moveDown();

        // Summary
        doc.fontSize(16).text('Summary');
        doc.fontSize(12);
        doc.text(`Total Requests: ${data.summary.totalRequests}`);
        doc.text(`Blocked Requests: ${data.summary.blockedRequests}`);
        doc.text(`Block Rate: ${data.summary.blockRate}%`);
        doc.text(`Unique Users: ${data.summary.uniqueUsers}`);
        doc.text(`Average Response Time: ${data.responseTimeStats.avg || 0}ms`);
        doc.moveDown();

        // Daily Stats
        doc.fontSize(16).text('Daily Statistics');
        doc.fontSize(10);
        const tableData = data.dailyStats.map(d => [d.date, d.requests, d.blocked]);
        doc.table ? doc.table(tableData) : this.drawSimpleTable(doc, ['Date', 'Requests', 'Blocked'], tableData);
        doc.moveDown();

        // App Stats
        doc.fontSize(16).text('Application Statistics');
        doc.fontSize(12);
        for (const [app, stats] of Object.entries(data.appStats)) {
          doc.text(`${app}: ${stats.requests} requests, ${stats.blocked} blocked, ${stats.users} users`);
        }
        doc.moveDown();

        // Top Endpoints
        doc.fontSize(16).text('Top Endpoints');
        doc.fontSize(12);
        data.topEndpoints.forEach((endpoint, i) => {
          doc.text(`${i + 1}. ${endpoint.method} ${endpoint.endpoint} - ${endpoint.count} requests`);
        });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  drawSimpleTable(doc, headers, rows) {
    const startX = 50;
    let y = doc.y;
    const colWidths = [100, 80, 80];
    
    // Draw headers
    doc.font('Helvetica-Bold');
    headers.forEach((header, i) => {
      doc.text(header, startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y);
    });
    y += 20;
    
    // Draw rows
    doc.font('Helvetica');
    rows.forEach(row => {
      row.forEach((cell, i) => {
        doc.text(String(cell), startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y);
      });
      y += 20;
    });
    
    doc.y = y;
  }

  async generateCSV(data) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Analytics');
    
    // Headers
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Requests', key: 'requests', width: 12 },
      { header: 'Blocked', key: 'blocked', width: 12 },
      { header: 'App', key: 'app', width: 15 },
      { header: 'Endpoint', key: 'endpoint', width: 30 }
    ];

    // Add rows
    data.dailyStats.forEach(stat => {
      worksheet.addRow({
        date: stat.date,
        requests: stat.requests,
        blocked: stat.blocked,
        app: 'All'
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  getReport(id) {
    return this.reports.get(id) || null;
  }
}

module.exports = new ReportGenerator();