import assert from 'node:assert/strict'
import test from 'node:test'
import { mapWithConcurrency } from './concurrency.js'

const tick = ms => new Promise(resolve => setTimeout(resolve, ms))

test('preserves input order regardless of completion order', async () => {
  const items = [50, 10, 30, 5, 40]
  const out = await mapWithConcurrency(items, 3, async ms => {
    await tick(ms)
    return ms
  })
  assert.deepEqual(out, items, 'results line up with inputs, not with who finished first')
})

test('never exceeds the concurrency limit', async () => {
  let inFlight = 0
  let peak = 0
  await mapWithConcurrency(Array.from({ length: 20 }, (_, i) => i), 4, async () => {
    inFlight++
    peak = Math.max(peak, inFlight)
    await tick(5)
    inFlight--
  })
  assert.equal(peak, 4)
})

test('actually runs concurrently', async () => {
  const started = Date.now()
  await mapWithConcurrency(Array.from({ length: 6 }, (_, i) => i), 6, () => tick(50))
  const elapsed = Date.now() - started
  assert.ok(elapsed < 200, `6 × 50ms in parallel should be well under 300ms, took ${elapsed}ms`)
})

test('a limit of 1 is sequential', async () => {
  const order = []
  await mapWithConcurrency([30, 10, 20], 1, async ms => {
    await tick(ms)
    order.push(ms)
  })
  assert.deepEqual(order, [30, 10, 20])
})

test('handles empty and single-item input', async () => {
  assert.deepEqual(await mapWithConcurrency([], 4, async () => 1), [])
  assert.deepEqual(await mapWithConcurrency(undefined, 4, async () => 1), [])
  assert.deepEqual(await mapWithConcurrency([7], 4, async x => x * 2), [14])
})

test('a limit larger than the input does not over-spawn workers', async () => {
  let calls = 0
  const out = await mapWithConcurrency([1, 2], 99, async x => {
    calls++
    return x
  })
  assert.deepEqual(out, [1, 2])
  assert.equal(calls, 2)
})

test('passes the index through', async () => {
  const out = await mapWithConcurrency(['a', 'b', 'c'], 2, async (item, i) => `${i}:${item}`)
  assert.deepEqual(out, ['0:a', '1:b', '2:c'])
})

test('a rejection propagates', async () => {
  await assert.rejects(
    () => mapWithConcurrency([1, 2, 3], 2, async x => {
      if (x === 2) throw new Error('boom')
      return x
    }),
    /boom/
  )
})
