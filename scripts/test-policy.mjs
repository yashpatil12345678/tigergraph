const assert = (condition, message) => { if (!condition) throw new Error(message) }
const { calculateExposure, routeFor } = await import('../lib/fraud/types.ts')
assert(calculateExposure([-10, 25]) === 35, 'exposure uses absolute amounts')
assert(routeFor('DECLINE_TRANSACTION', 10) === 'L1', 'decline is L1')
assert(routeFor('BLOCK_CARD', 2500) === 'L1', 'small block is L1')
assert(routeFor('BLOCK_CARD', 2500.01) === 'L2', 'large block is L2')
assert(routeFor('BLOCK_ALL_CARDS', 1) === 'L2', 'block all is L2')
assert(routeFor('FILE_REPORT', 1) === 'L2', 'file report is L2')
console.log('policy tests passed')
