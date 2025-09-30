export const testSimpleEndpoint = {
  path: '/test-ultra-simple',
  method: 'get',
  handler: async (req) => {
    return Response.json({
      message: 'Test simple fonctionne !',
      timestamp: new Date().toISOString()
    })
  },
}
