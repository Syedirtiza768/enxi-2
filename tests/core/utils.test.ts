describe('Core Utilities', () => {
  test('environment should be test', () => {
    expect(process.env.NODE_ENV).toBe('test')
  })

  test('basic JavaScript functionality', () => {
    const testArray = [1, 2, 3]
    expect(testArray.length).toBe(3)
    expect(testArray.includes(2)).toBe(true)
  })

  test('async functionality', async () => {
    const promise = Promise.resolve('test')
    const result = await promise
    expect(result).toBe('test')
  })
})