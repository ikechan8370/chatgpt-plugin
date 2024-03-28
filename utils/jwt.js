export function decrypt (jwtToken) {
  const [encodedHeader, encodedPayload, signature] = jwtToken.split('.')

  // const decodedHeader = Buffer.from(encodedHeader, 'base64').toString('utf-8')
  const decodedPayload = Buffer.from(encodedPayload, 'base64').toString('utf-8')

  return decodedPayload
}
