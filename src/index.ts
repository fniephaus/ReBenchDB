import Koa from 'koa';
import koaBody from 'koa-body';
import Router from 'koa-router';
import { Database } from './db';
import { BenchmarkData } from './api';
import { createValidator } from './api-validator';
import ajv from 'ajv';

console.log('Starting up ReBenchDB');

const dbConfig = {
  user: process.env.RDB_USER || '',
  password: process.env.RDB_PASS || '',
  host: process.env.RDB_HOST || 'localhost',
  database: process.env.RDB_DB || 'test_rdb3',
  port: 5432
};

const port = process.env.PORT || 33333;

const DEBUG = 'DEBUG' in process.env ? process.env.DEBUG === 'true' : false;


const app = new Koa();
const router = new Router();
const db = new Database(dbConfig);

router.get('/', async ctx => {
  ctx.body = 'TODO';
  ctx.type = 'text';
});

const validateFn: ajv.ValidateFunction = DEBUG ? createValidator() : <any> undefined;

function validateSchema(data: BenchmarkData, ctx: Router.IRouterContext) {
  const result = validateFn(data);
  if (!result) {
    console.log('Data validation failed.');
    console.error(validateFn.errors);
    ctx.status = 500;
    ctx.body = `Request does not validate:
${validateFn.errors}`;
  } else {
    console.log('Data validated successfully.');
  }
}

// curl -X PUT -H "Content-Type: application/json" -d '{"foo":"bar","baz":3}' http://localhost:33333/rebenchdb/results
// DEBUG: koaBody({includeUnparsed: true})
router.put('/rebenchdb/results', koaBody(), async ctx => {
  const data: BenchmarkData = await ctx.request.body;


  ctx.type = 'text';

  if (DEBUG) {
    validateSchema(data, ctx);
  }

  try {
    await db.recordData(data);
    ctx.body = 'Data recorded';
    ctx.status = 200;
  } catch (e) {
    ctx.status = 500;
    ctx.body = `${e.stack}`;
    console.log(e.stack);
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

(async () => {
  console.log('Initialize Database');
  await db.initializeDatabase();

  console.log(`Starting server on localhost:${port}`);
  app.listen(port);
})();
