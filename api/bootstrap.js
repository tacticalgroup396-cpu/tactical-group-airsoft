export default function handler(req,res){res.statusCode=410;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:false,error:'Bootstrap desativado'}))}
