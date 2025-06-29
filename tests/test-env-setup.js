// Set up test environment variables
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'file:./prisma/test.db'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret'
process.env.NEXTAUTH_URL = 'http://localhost:3000'

// No need for node-fetch import

// Mock Next.js server components
if (typeof window === 'undefined') {
  // We're in Node.js environment
  // Create basic Request/Response/Headers if not available
  if (!global.Request) {
    global.Request = class Request {
      constructor(url, init = {}) {
        this.url = url
        this.method = init.method || 'GET'
        this.headers = new Headers(init.headers || {})
        this.body = init.body
      }
      
      async json() {
        return this.body ? JSON.parse(this.body) : {}
      }
      
      async text() {
        return this.body || ''
      }
    }
  }
  
  if (!global.Response) {
    global.Response = class Response {
      constructor(body, init = {}) {
        this.body = body
        this.status = init.status || 200
        this.statusText = init.statusText || 'OK'
        this.headers = new Headers(init.headers || {})
        this.ok = this.status >= 200 && this.status < 300
      }
      
      async json() {
        return typeof this.body === 'string' ? JSON.parse(this.body) : this.body
      }
      
      async text() {
        return typeof this.body === 'string' ? this.body : JSON.stringify(this.body)
      }
    }
  }
  
  if (!global.Headers) {
    global.Headers = class Headers {
      constructor(init = {}) {
        this._headers = {}
        Object.entries(init).forEach(([key, value]) => {
          this._headers[key.toLowerCase()] = value
        })
      }
      
      get(name) {
        return this._headers[name.toLowerCase()]
      }
      
      set(name, value) {
        this._headers[name.toLowerCase()] = value
      }
      
      has(name) {
        return name.toLowerCase() in this._headers
      }
      
      delete(name) {
        delete this._headers[name.toLowerCase()]
      }
    }
  }
  
  // Add Next.js specific extensions
  global.NextRequest = class NextRequest extends Request {
    constructor(url, init = {}) {
      super(url, init)
      this.nextUrl = new URL(url)
    }
    
    async json() {
      const text = await this.text()
      return text ? JSON.parse(text) : {}
    }
  }
  
  global.NextResponse = class NextResponse extends Response {
    constructor(body, init = {}) {
      super(body, init)
    }
    
    static json(data, init = {}) {
      return new NextResponse(JSON.stringify(data), {
        ...init,
        headers: {
          'content-type': 'application/json',
          ...init.headers,
        },
      })
    }
    
    cookies = {
      set: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
    }
  }
}