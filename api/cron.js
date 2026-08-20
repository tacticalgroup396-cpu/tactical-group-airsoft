import handler from './index.js'
export default async function cron(req,res){
  const secret=process.env.CRON_SECRET
  if(secret){
    const auth=String(req.headers.authorization||'')
    if(auth!==`Bearer ${secret}` && req.headers['x-cron-secret']!==secret){res.statusCode=401;res.end('Unauthorized');return}
  }
  req.method='GET'
  req.url='/api/index.js?action=cron'
  return handler(req,res)
}
