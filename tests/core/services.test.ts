import { BaseService } from '@/lib/services/base.service'
import { CustomerService } from '@/lib/services/customer.service'
import { LeadService } from '@/lib/services/lead.service'

describe('Core Services', () => {
  describe('BaseService', () => {
    test('should create BaseService instance', () => {
      const service = new BaseService('TestService')
      expect(service).toBeInstanceOf(BaseService)
    })
  })

  describe('CustomerService', () => {
    test('should create CustomerService instance', () => {
      const service = new CustomerService()
      expect(service).toBeInstanceOf(CustomerService)
      expect(service).toBeInstanceOf(BaseService)
    })
  })

  describe('LeadService', () => {
    test('should create LeadService instance', () => {
      const service = new LeadService()
      expect(service).toBeInstanceOf(LeadService)
      expect(service).toBeInstanceOf(BaseService)
    })
  })
})