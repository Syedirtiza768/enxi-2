#!/usr/bin/env tsx

/**
 * Debug the three-way matching endpoint specifically
 */

import { ThreeWayMatchingService } from '@/lib/services/purchase/three-way-matching.service'

async function testThreeWayMatchingMethods() {
  console.log('🔍 Testing ThreeWayMatchingService methods individually...\n')
  
  const service = new ThreeWayMatchingService()
  const defaultFilters = {
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    dateTo: new Date()
  }

  // Test getMatchingMetrics
  try {
    console.log('🧪 Testing getMatchingMetrics...')
    const metrics = await service.getMatchingMetrics(defaultFilters)
    console.log(`✅ getMatchingMetrics: Success`)
    console.log(`   Keys: ${Object.keys(metrics)}`)
  } catch (error: any) {
    console.log(`❌ getMatchingMetrics: ${error.message}`)
  }

  // Test generateExceptionsReport  
  try {
    console.log('\n🧪 Testing generateExceptionsReport...')
    const exceptions = await service.generateExceptionsReport(defaultFilters)
    console.log(`✅ generateExceptionsReport: Success`)
    console.log(`   Keys: ${Object.keys(exceptions)}`)
  } catch (error: any) {
    console.log(`❌ generateExceptionsReport: ${error.message}`)
    console.log(`   Stack: ${error.stack}`)
  }
}

async function testApiDirectly() {
  console.log('\n🌐 Testing API endpoint directly...\n')
  
  try {
    // Login first
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    })

    if (!loginResponse.ok) {
      console.log('❌ Login failed')
      return
    }

    const loginData = await loginResponse.json()
    const token = loginData.token

    // Test the endpoint
    const response = await fetch('http://localhost:3001/api/three-way-matching/dashboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (response.ok) {
      const data = await response.json()
      console.log('✅ API endpoint working')
      console.log(`   Data keys: ${Object.keys(data)}`)
    } else {
      const errorText = await response.text()
      console.log(`❌ API endpoint failed: ${response.status}`)
      console.log(`   Response: ${errorText}`)
    }
    
  } catch (error: any) {
    console.log(`💥 API test failed: ${error.message}`)
  }
}

async function main() {
  await testThreeWayMatchingMethods()
  await testApiDirectly()
}

main().catch(console.error)