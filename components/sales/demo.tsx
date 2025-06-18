'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'
import { TrendingUp, TrendingDown, Wallet, ShoppingCart, Users, Target } from 'lucide-react'

// Mock data for demonstration
const mockSalesData = [
  { month: 'Jan', revenue: 45000, orders: 120, customers: 95 },
  { month: 'Feb', revenue: 52000, orders: 135, customers: 108 },
  { month: 'Mar', revenue: 48000, orders: 128, customers: 102 },
  { month: 'Apr', revenue: 61000, orders: 156, customers: 125 },
  { month: 'May', revenue: 55000, orders: 142, customers: 118 },
  { month: 'Jun', revenue: 67000, orders: 178, customers: 142 }
]

const mockProductData = [
  { name: 'Engine Parts', sales: 125000, category: 'Marine Equipment' },
  { name: 'Pumps', sales: 98000, category: 'Industrial' },
  { name: 'Filters', sales: 76000, category: 'Maintenance' },
  { name: 'Gaskets', sales: 54000, category: 'Parts' },
  { name: 'Tools', sales: 43000, category: 'Equipment' }
]

const mockCustomerSegments = [
  { name: 'VIP', value: 35, color: '#3B82F6' },
  { name: 'Regular', value: 45, color: '#10B981' },
  { name: 'New', value: 20, color: '#F59E0B' }
]

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6']

export default function SalesChartsDemo() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sales Analytics Demo</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Interactive sales charts and analytics dashboard
          </p>
        </div>
        <Badge variant="outline" className="text-green-600 border-green-600">
          Live Demo
        </Badge>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold">AED 328,000</p>
            </div>
            <div className="flex items-center text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="text-sm">+12.5%</span>
            </div>
          </div>
          <div className="flex items-center mt-2">
            <Wallet className="w-4 h-4 text-blue-600 mr-2" />
            <span className="text-xs text-gray-600">vs last period</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Orders</p>
              <p className="text-2xl font-bold">859</p>
            </div>
            <div className="flex items-center text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="text-sm">+8.2%</span>
            </div>
          </div>
          <div className="flex items-center mt-2">
            <ShoppingCart className="w-4 h-4 text-green-600 mr-2" />
            <span className="text-xs text-gray-600">this month</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Customers</p>
              <p className="text-2xl font-bold">590</p>
            </div>
            <div className="flex items-center text-red-600">
              <TrendingDown className="w-4 h-4 mr-1" />
              <span className="text-sm">-2.1%</span>
            </div>
          </div>
          <div className="flex items-center mt-2">
            <Users className="w-4 h-4 text-purple-600 mr-2" />
            <span className="text-xs text-gray-600">unique customers</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Conversion Rate</p>
              <p className="text-2xl font-bold">24.5%</p>
            </div>
            <div className="flex items-center text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="text-sm">+3.8%</span>
            </div>
          </div>
          <div className="flex items-center mt-2">
            <Target className="w-4 h-4 text-orange-600 mr-2" />
            <span className="text-xs text-gray-600">target: 25%</span>
          </div>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trends */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Revenue Trends</h3>
            <Button variant="outline" size="sm">
              View Details
            </Button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mockSalesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip 
                formatter={(value: any) => [
                  new Intl.NumberFormat('en-AE', { 
                    style: 'currency', 
                    currency: 'AED',
                    minimumFractionDigits: 0 
                  }).format(value), 
                  'Revenue'
                ]}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#3B82F6" 
                strokeWidth={3}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Product Performance */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Top Products</h3>
            <Button variant="outline" size="sm">
              See All
            </Button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockProductData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip 
                formatter={(value: any) => [
                  new Intl.NumberFormat('en-AE', { 
                    style: 'currency', 
                    currency: 'AED',
                    minimumFractionDigits: 0 
                  }).format(value), 
                  'Sales'
                ]}
              />
              <Bar dataKey="sales" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Customer Segments */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Customer Segments</h3>
            <Button variant="outline" size="sm">
              Analyze
            </Button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={mockCustomerSegments}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {mockCustomerSegments.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Orders vs Customers */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Orders & Customers</h3>
            <Button variant="outline" size="sm">
              Export
            </Button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockSalesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip />
              <Legend />
              <Bar dataKey="orders" fill="#3B82F6" name="Orders" />
              <Bar dataKey="customers" fill="#EF4444" name="Customers" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Feature List */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Sales Charts Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <span className="text-sm">Interactive drill-down charts</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-green-600 rounded-full"></div>
            <span className="text-sm">Real-time data updates</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
            <span className="text-sm">Multiple export formats</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
            <span className="text-sm">Advanced filtering options</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-red-600 rounded-full"></div>
            <span className="text-sm">Responsive design</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
            <span className="text-sm">Dark/Light theme support</span>
          </div>
        </div>
      </Card>

      {/* Call to Action */}
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Ready to explore full analytics?</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Access the complete sales analytics dashboard with advanced features and real data.
        </p>
        <div className="flex justify-center space-x-4">
          <Button asChild>
            <a href="/sales-analytics">View Full Dashboard</a>
          </Button>
          <Button variant="outline">
            Learn More
          </Button>
        </div>
      </div>
    </div>
  )
}