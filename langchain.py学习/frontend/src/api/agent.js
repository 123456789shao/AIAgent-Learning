import client from './client'

export async function runAgent(input, maxRounds = 3) {
  const { data } = await client.post('/agent/run', {
    input,
    max_rounds: maxRounds,
  })

  return data
}
