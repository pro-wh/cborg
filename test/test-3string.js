/* eslint-env mocha */

const { assert } = require('chai')
const { decode, encode } = require('../cborg')
const { hexToUint8Array, uint8ArrayToHex } = require('./common')

// some from https://github.com/PJK/libcbor

const fixtures = [
  { data: '60', expected: '', type: 'string' },
  { data: '6161', expected: 'a', type: 'string' },
  { data: '780161', expected: 'a', type: 'string', strict: false },
  {
    data: '6c48656c6c6f20776f726c6421',
    expected: 'Hello world!',
    type: 'string'
  },
  {
    data: '6fc48c6175657320c39f76c49b746521',
    expected: 'Čaues ßvěte!',
    type: 'string'
  },
  {
    data: '78964c6f72656d20697073756d20646f6c6f722073697420616d65742c20636f6e73656374657475722061646970697363696e6720656c69742e20446f6e6563206d692074656c6c75732c20696163756c6973206e656320766573746962756c756d20717569732c206665726d656e74756d206e6f6e2066656c69732e204d616563656e6173207574206a7573746f20706f73756572652e',
    expected: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec mi tellus, iaculis nec vestibulum quis, fermentum non felis. Maecenas ut justo posuere.',
    type: 'string',
    label: 'long string, 8-bit length'
  },
  {
    data: '7900964c6f72656d20697073756d20646f6c6f722073697420616d65742c20636f6e73656374657475722061646970697363696e6720656c69742e20446f6e6563206d692074656c6c75732c20696163756c6973206e656320766573746962756c756d20717569732c206665726d656e74756d206e6f6e2066656c69732e204d616563656e6173207574206a7573746f20706f73756572652e',
    expected: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec mi tellus, iaculis nec vestibulum quis, fermentum non felis. Maecenas ut justo posuere.',
    type: 'string',
    label: 'long string, 16-bit length',
    strict: false
  },
  {
    data: '7a000000964c6f72656d20697073756d20646f6c6f722073697420616d65742c20636f6e73656374657475722061646970697363696e6720656c69742e20446f6e6563206d692074656c6c75732c20696163756c6973206e656320766573746962756c756d20717569732c206665726d656e74756d206e6f6e2066656c69732e204d616563656e6173207574206a7573746f20706f73756572652e',
    expected: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec mi tellus, iaculis nec vestibulum quis, fermentum non felis. Maecenas ut justo posuere.',
    type: 'string',
    label: 'long string, 32-bit length',
    strict: false
  },
  {
    data: '7b00000000000000964c6f72656d20697073756d20646f6c6f722073697420616d65742c20636f6e73656374657475722061646970697363696e6720656c69742e20446f6e6563206d692074656c6c75732c20696163756c6973206e656320766573746962756c756d20717569732c206665726d656e74756d206e6f6e2066656c69732e204d616563656e6173207574206a7573746f20706f73756572652e',
    expected: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec mi tellus, iaculis nec vestibulum quis, fermentum non felis. Maecenas ut justo posuere.',
    type: 'string',
    label: 'long string, 64-bit length',
    strict: false
  }
]

// fill up byte arrays converted to strings so we can validate in strict mode,
// the minimal size for each excluding 64-bit because 4G is just too big
;(() => {
  function rnd (length) {
    const sa = []
    let l = 0
    while (l < length) {
      // some unicode character, unless we're near the end and want to fill up exactly so
      // we need to pad with ascii
      const s = String.fromCharCode(Math.floor(Math.random() * l - length < 3 ? 255 : 0x10ffff))
      l += Buffer.byteLength(s)
      sa.push(s)
    }
    return sa.join('')
  }

  const expected16 = rnd(256)
  fixtures.push({
    data: Buffer.concat([Buffer.from('790100', 'hex'), Buffer.from(expected16)]),
    expected: expected16,
    type: 'string',
    label: 'long string, 16-bit length strict-compat'
  })

  const expected32 = rnd(65536)
  fixtures.push({
    data: Buffer.concat([Buffer.from('7a00010000', 'hex'), Buffer.from(expected32)]),
    expected: expected32,
    type: 'string',
    label: 'long string, 32-bit length strict-compat'
  })
})()

describe('string', () => {
  describe('decode', () => {
    for (const fixture of fixtures) {
      const data = hexToUint8Array(fixture.data)
      it(`should decode ${fixture.type}=${fixture.label || fixture.expected}`, () => {
        let actual = decode(data)
        assert.strictEqual(actual, fixture.expected, `decode ${fixture.type}`)
        if (fixture.strict === false) {
          assert.throws(() => decode(data, { strict: true }), Error, 'CBOR decode error: integer encoded in more bytes than necessary (strict decode)')
        } else {
          actual = decode(data, { strict: true })
          assert.strictEqual(actual, fixture.expected, `decode ${fixture.type} strict`)
        }
      })
    }
  })

  describe('encode', () => {
    for (const fixture of fixtures) {
      if (fixture.data.length >= 100000000) {
        it.skip(`(TODO) skipping encode of very large string ${fixture.type}=${fixture.label || fixture.expected}`, () => {})
        continue
      }

      const data = fixture.expected
      const expectedHex = uint8ArrayToHex(fixture.data)

      it(`should encode ${fixture.type}=${fixture.label || fixture.expected}`, () => {
        if (fixture.unsafe) {
          assert.throws(() => encode(data), Error, /^CBOR encode error: number too large to encode \(-\d+\)$/)
        } else if (fixture.strict === false) {
          assert.notStrictEqual(encode(data).toString('hex'), expectedHex, `encode ${fixture.type} !strict`)
        } else {
          assert.strictEqual(encode(data).toString('hex'), expectedHex, `encode ${fixture.type}`)
        }
      })
    }
  })
})